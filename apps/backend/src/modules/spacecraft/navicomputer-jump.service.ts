import {
  BadRequestException,
  Inject,
  Injectable,
  Optional,
} from '@nestjs/common';
import type {
  NavicomputerDestinationDto,
  NavicomputerJumpResultDto,
  NavicomputerLayerDto,
} from '@swuniverse/shared';
import { DataSource, In, QueryFailedError } from 'typeorm';
import { CrewAssignment } from '../colony/entities/crew-assignment.entity';
import { ExplorationService } from '../starmap/exploration.service';
import { GalaxyField } from '../starmap/entities/galaxy-field.entity';
import { Layer } from '../starmap/entities/layer.entity';
import { LayerKnowledge } from '../starmap/entities/layer-knowledge.entity';
import { SpaceLocation } from '../starmap/entities/space-location.entity';
import { CartographyPlanService } from './cartography-plan.service';
import { Spacecraft } from './entities/spacecraft.entity';
import { SpacecraftModule } from './entities/spacecraft-module.entity';
import { ShipLogEntry } from './entities/ship-log-entry.entity';
import { FlightConsequencePipeline } from './flight-consequence-pipeline';
import { FlightSignatureService } from './flight-signature.service';
import { lockFleetParticipants } from './fleet-lock';
import { GameDataService } from '../game-data/game-data.service';
import {
  ORBIT_ORDER_LIFECYCLE,
  type OrbitOrderLifecyclePort,
} from './orbit-order-lifecycle.port';
import {
  resolveSpacecraftLocation,
  sameSpaceLocation,
} from './spacecraft-field';
import { assertSpacecraftNotInStandby } from './spacecraft-mode.util';
import {
  getRuntimeSystemsForModule,
  initializeSpacecraftRuntimeSystems,
  isCoolingDown,
} from './spacecraft-runtime-state.service';
import { SpacecraftRepairService } from './spacecraft-repair.service';
import { SpacecraftTakeoverService } from './spacecraft-takeover.service';
import { isSpacecraftDestroyed } from './spacecraft-status.util';

export const NAVICOMPUTER_EPS = 55;
export const NAVICOMPUTER_COOLDOWN_MS = 300_000;

/** Authorization over the locked, hydrated participants; never detaches a member. */
export function validateJumpParticipants(
  ships: Spacecraft[],
  userId: number,
  now: number,
): void {
  if (!ships.length) throw new BadRequestException('Keine Schiffe');
  const origin = resolveSpacecraftLocation(ships[0]);
  if (origin?.scope !== 'GALAXY')
    throw new BadRequestException('Sprung nur außerhalb von Systemen möglich');
  for (const ship of ships) {
    const reject = (reason: string): never => {
      throw new BadRequestException(`${ship.name}: ${reason}`);
    };
    if (ship.userId !== userId) reject('Fremdes Flottenmitglied');
    if (ship.kind === 'STATION') reject('Stationen können nicht springen');
    assertSpacecraftNotInStandby(ship, 'dem Sprung');
    if (ship.status !== 'IDLE') reject('Schiff ist nicht flugbereit');
    const location = resolveSpacecraftLocation(ship);
    if (location?.scope !== 'GALAXY' || !sameSpaceLocation(origin, location))
      reject('Alle Schiffe müssen auf demselben Galaxiefeld sein');
    if (!ship.modules) reject('Module nicht geladen');
    const systems = initializeSpacecraftRuntimeSystems(ship);
    const coil = ship.modules.filter((module) =>
      getRuntimeSystemsForModule(module).includes('HYPERSPACE_COIL'),
    );
    const drive = ship.modules.filter((module) =>
      getRuntimeSystemsForModule(module).includes('WARPDRIVE'),
    );
    if (
      !coil.some((module) => module.integrity > 0) ||
      !systems.HYPERSPACE_COIL ||
      systems.HYPERSPACE_COIL.integrity <= 0
    )
      reject('Keine intakte Hyperraum-Spule');
    if (
      !drive.some((module) => module.integrity > 0) ||
      !systems.WARPDRIVE?.active ||
      systems.WARPDRIVE.integrity <= 0
    )
      reject('Intakter aktiver Hyperantrieb erforderlich');
    if (ship.tractoredShipId != null || systems.TRACTOR_BEAM?.active)
      reject('Traktorstrahl muss deaktiviert sein');
    if (
      isCoolingDown(systems.HYPERSPACE_COIL, now) ||
      coil.some((module) => isCoolingDown(module, now)) ||
      isCoolingDown(systems.WARPDRIVE, now) ||
      drive.some((module) => isCoolingDown(module, now))
    )
      reject('Sprungsystem kühlt noch ab');
    if (!Number.isFinite(ship.energy) || ship.energy < NAVICOMPUTER_EPS)
      reject('Mindestens 55 EPS erforderlich');
  }
}

@Injectable()
export class NavicomputerJumpService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly signatures: FlightSignatureService,
    private readonly exploration: ExplorationService,
    private readonly consequences: FlightConsequencePipeline,
    private readonly repairs: SpacecraftRepairService,
    private readonly cartography: CartographyPlanService,
    private readonly takeover: SpacecraftTakeoverService,
    private readonly gameData: GameDataService,
    @Optional()
    @Inject(ORBIT_ORDER_LIFECYCLE)
    private readonly orbitOrders?: OrbitOrderLifecyclePort,
  ) {}

  async layers(userId: number): Promise<NavicomputerLayerDto[]> {
    const known = await this.dataSource.manager.find(LayerKnowledge, {
      where: { userId },
      relations: ['layer'],
      order: { layerId: 'ASC' },
    });
    return known
      .filter(
        (entry) =>
          !entry.layer.isHidden && ['KNOWN', 'EXPLORED'].includes(entry.status),
      )
      .map(({ layer }) => ({
        id: layer.id,
        name: layer.name,
        width: layer.width,
        height: layer.height,
      }));
  }

  async jump(
    shipId: number,
    userId: number,
    target: NavicomputerDestinationDto,
  ): Promise<NavicomputerJumpResultDto> {
    if (
      ![target.layerId, target.x, target.y].every(
        (value) => Number.isSafeInteger(value) && value > 0,
      )
    )
      throw new BadRequestException('Ungültige Zielkoordinaten');
    const afterCommit: Array<() => void> = [];
    const result = await this.dataSource
      .transaction('READ COMMITTED', async (manager) => {
        const transaction = { manager, afterCommit };
        const locked = await lockFleetParticipants(manager, userId, shipId);
        if (locked.fleet?.leaderId !== shipId && locked.fleet)
          throw new BadRequestException('Nur der Flottenführer kann springen');
        if (locked.fleet?.isFixed)
          throw new BadRequestException(
            'Fixierte Flotten können nicht springen',
          );
        if (locked.fleet) {
          const reason = await this.orbitOrders?.lifecycle?.flightBlockReason(
            manager,
            locked.fleet.id,
          );
          if (reason) throw new BadRequestException(reason);
        }
        const ships = locked.fleet ? locked.members : [locked.ship];
        const ids = ships.map((ship) => ship.id);
        const modules = await manager.find(SpacecraftModule, {
          where: { spacecraftId: In(ids) },
          order: { id: 'ASC' },
          lock: { mode: 'pessimistic_write', onLocked: 'nowait' },
        });
        const crew = await manager.find(CrewAssignment, {
          where: { spacecraftId: In(ids) },
          order: { crewId: 'ASC' },
          lock: { mode: 'pessimistic_read', onLocked: 'nowait' },
        });
        for (const ship of ships) {
          ship.modules = modules.filter(
            (module) => module.spacecraftId === ship.id,
          );
          if (
            crew.filter((assignment) => assignment.spacecraftId === ship.id)
              .length < Math.max(0, ship.crewRequired)
          )
            throw new BadRequestException(
              `${ship.name}: Nicht genug Besatzung`,
            );
        }
        const now = Date.now();
        validateJumpParticipants(ships, userId, now);
        if (await manager.existsBy(Spacecraft, { tractoredShipId: In(ids) }))
          throw new BadRequestException(
            'Ein Schiff wird von einem Traktorstrahl gehalten',
          );
        const layer = await manager.findOne(Layer, {
          where: { id: target.layerId, isHidden: false },
          lock: { mode: 'pessimistic_read', onLocked: 'nowait' },
        });
        const knowledge = await manager.findOne(LayerKnowledge, {
          where: { userId, layerId: target.layerId },
          lock: { mode: 'pessimistic_read', onLocked: 'nowait' },
        });
        if (
          !layer ||
          !knowledge ||
          !['KNOWN', 'EXPLORED'].includes(knowledge.status)
        )
          throw new BadRequestException(
            'Zielebene ist nicht bekannt oder verborgen',
          );
        const field = await manager.findOne(GalaxyField, {
          where: { layerId: target.layerId, cx: target.x, cy: target.y },
          lock: { mode: 'pessimistic_read', onLocked: 'nowait' },
        });
        if (!field)
          throw new BadRequestException('Zielkoordinaten existieren nicht');
        field.fieldType = (
          await manager.findOneOrFail(GalaxyField, {
            where: { id: field.id },
            relations: ['fieldType'],
          })
        ).fieldType;
        if (
          !(
            field.passableOverride ??
            (field.isPassable && field.fieldType.passable)
          )
        )
          throw new BadRequestException('Ziel ist nicht passierbar');
        const destination = await manager.findOneOrFail(SpaceLocation, {
          where: { galaxyFieldId: field.id },
          lock: { mode: 'pessimistic_read', onLocked: 'nowait' },
        });
        destination.galaxyField = field;
        if (locked.ship.locationId === destination.id)
          throw new BadRequestException('Schiff ist bereits am Ziel');
        const cooldownUntil = now + NAVICOMPUTER_COOLDOWN_MS;
        // All authorization precedes the first write. Signatures and costs share the position transaction.
        for (const ship of ships) {
          const origin = ship.location;
          ship.energy -= NAVICOMPUTER_EPS;
          const systems = initializeSpacecraftRuntimeSystems(ship);
          systems.HYPERSPACE_COIL = {
            ...systems.HYPERSPACE_COIL!,
            active: false,
            cooldown: cooldownUntil,
          };
          ship.locationId = destination.id;
          ship.location = destination;
          ship.dockedAtId = null;
          ship.dockedAt = null;
          for (const coil of ship.modules.filter((module) =>
            getRuntimeSystemsForModule(module).includes('HYPERSPACE_COIL'),
          )) {
            coil.isActive = false;
            await manager.save(coil);
          }
          await this.cartography.resetFinishingForSpacecraft(ship.id, manager);
          await manager.save(ship);
          await this.signatures.createMovement(
            ship,
            origin,
            destination,
            null,
            manager,
          );
        }
        for (const ship of ships) {
          await this.consequences.onEnterField(ship, field, transaction, {
            navicomputerJump: true,
          });
          if (isSpacecraftDestroyed(ship)) continue;
          initializeSpacecraftRuntimeSystems(ship);
          await manager.save(ship);
          const sensors =
            initializeSpacecraftRuntimeSystems(ship).LONG_RANGE_SENSORS;
          const range =
            sensors?.active && sensors.integrity > 0
              ? Math.ceil(
                  (Math.max(
                    3,
                    ...ship.modules
                      .filter((module) => module.category === 'SENSORS')
                      .map((module) => {
                        const definition = this.gameData
                          .getAllModules()
                          .find(
                            (candidate) => candidate.name === module.moduleType,
                          );
                        return (
                          ((definition?.public as Record<string, number>)
                            ?.baseSensorRange ?? 2) +
                          module.level -
                          1
                        );
                      }),
                  ) *
                    sensors.integrity) /
                    100,
                )
              : 0;
          await this.exploration.discoverArea(
            {
              userId,
              layerId: target.layerId,
              cx: target.x,
              cy: target.y,
              radius: range,
              source: 'navicomputer',
            },
            manager,
          );
          await manager.save(
            manager.create(ShipLogEntry, {
              spacecraftId: ship.id,
              authorId: userId,
              body: `Navicomputer-Sprung nach ${layer.name} ${target.x}|${target.y}`,
            }),
          );
        }
        await this.takeover.cancelForShipsInTransaction(ids, transaction);
        const cancelled = await this.repairs.cancelTasks(manager, ids, true);
        await this.repairs.notifyCancelled(
          cancelled,
          'Der Navicomputer-Sprung',
          transaction,
        );
        return { shipIds: ids, locationId: destination.id, cooldownUntil };
      })
      .catch((error: unknown) => {
        if (
          error instanceof QueryFailedError &&
          error.driverError.code === '55P03'
        )
          throw new BadRequestException(
            'Sprungzustand ist gesperrt; bitte erneut versuchen',
          );
        throw error;
      });
    for (const notify of afterCommit) notify();
    return result;
  }
}
