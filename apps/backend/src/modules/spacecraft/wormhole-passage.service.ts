import { BadRequestException, Inject, Injectable, Optional } from '@nestjs/common';
import { isDeepStrictEqual, types } from 'node:util';
import { DataSource, In, QueryFailedError } from 'typeorm';
import { GalaxyField } from '../starmap/entities/galaxy-field.entity';
import { SpaceLocation } from '../starmap/entities/space-location.entity';
import { Wormhole } from '../starmap/entities/wormhole.entity';
import { SpacecraftModule } from './entities/spacecraft-module.entity';
import { lockFleetParticipants } from './fleet-lock';
import { resolveSpacecraftLocation } from './spacecraft-field';
import {
  getRuntimeSystemsForModule,
  initializeSpacecraftRuntimeSystems,
} from './spacecraft-runtime-state.service';
import {
  planWormholePassage,
  type WormholeAccessPolicy,
} from './wormhole-passage-planner';
import { FlightConsequencePipeline } from './flight-consequence-pipeline';
import { ExplorationService } from '../starmap/exploration.service';
import { LayerKnowledgeService } from '../starmap/layer-knowledge.service';
import { FlightSignatureService } from './flight-signature.service';
import { MessagingService } from '../messaging/messaging.service';
import { MessageFolder } from '../messaging/message-folder';
import { ShipLogEntry } from './entities/ship-log-entry.entity';
import { SpacecraftRepairService } from './spacecraft-repair.service';
import { CrewAssignment } from '../colony/entities/crew-assignment.entity';
import { Spacecraft } from './entities/spacecraft.entity';
import { isSpacecraftDestroyed } from './spacecraft-status.util';
import { Fleet } from './entities/fleet.entity';
import { CartographyPlanService } from './cartography-plan.service';
import { SpacecraftTakeoverService } from './spacecraft-takeover.service';
import { GameDataService } from '../game-data/game-data.service';
import { FieldTransitionExecutor } from './field-transition-executor';
import { ORBIT_ORDER_LIFECYCLE, type OrbitOrderLifecyclePort } from './orbit-order-lifecycle.port';

export const WORMHOLE_ACCESS_POLICY = Symbol('WORMHOLE_ACCESS_POLICY');
export const WORMHOLE_RANDOM = Symbol('WORMHOLE_RANDOM');

function immutableSnapshot<T>(input: T): T {
  const snapshot = structuredClone(input);
  const freeze = (value: unknown): unknown => {
    if (!value || typeof value !== 'object' || Object.isFrozen(value))
      return value;
    if (types.isDate(value)) {
      return new Proxy(Object.freeze(value), {
        get(target, property) {
          const member: unknown = Reflect.get(target, property);
          if (typeof member !== 'function') return member;
          if (typeof property === 'string' && property.startsWith('set'))
            return () => {
              throw new TypeError('Immutable snapshot date');
            };
          return member.bind(target);
        },
      });
    }
    for (const [key, child] of Object.entries(value))
      Reflect.set(value, key, freeze(child));
    return Object.freeze(value);
  };
  return freeze(snapshot) as T;
}

@Injectable()
export class WormholePassageService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly consequences: FlightConsequencePipeline,
    private readonly exploration: ExplorationService,
    private readonly knowledge: LayerKnowledgeService,
    private readonly signatures: FlightSignatureService,
    private readonly messaging: MessagingService,
    private readonly repairs: SpacecraftRepairService,
    private readonly cartography: CartographyPlanService,
    private readonly takeover: SpacecraftTakeoverService,
    private readonly gameData: GameDataService,
    private readonly transitions: FieldTransitionExecutor,
    @Inject(WORMHOLE_ACCESS_POLICY)
    private readonly accessPolicy: WormholeAccessPolicy,
    @Inject(WORMHOLE_RANDOM) private readonly random: () => number,
    @Optional()
    @Inject(ORBIT_ORDER_LIFECYCLE)
    private readonly orbitOrders?: OrbitOrderLifecyclePort,
  ) {}

  async enter(shipId: number, userId: number, wormholeId?: number) {
    const afterCommit: Array<() => void> = [];
    const result = await this.dataSource
      .transaction('READ COMMITTED', async (manager) => {
        const transaction = { manager, afterCommit };
        const locked = await lockFleetParticipants(manager, userId, shipId);
        const ships = locked.fleet ? locked.members : [locked.ship];
        if (locked.fleet && locked.fleet.leaderId !== shipId)
          throw new BadRequestException('Only the fleet leader can fly');
        if (locked.fleet) {
          const blocked = await this.orbitOrders?.lifecycle?.flightBlockReason(
            manager,
            locked.fleet.id,
          );
          if (blocked) throw new BadRequestException(blocked);
        }
        // Additional carried ships/fleets never wait while fleet/ship locks are
        // held. Every secondary lock is NOWAIT, so inverse ordering refuses
        // contention instead of creating a fleet/ship wait cycle.
        const fleetIds = new Set(locked.fleet ? [locked.fleet.id] : []);
        for (;;) {
          const additionalIds = [
            ...new Set(
              ships.flatMap((ship) =>
                ship.tractoredShipId == null ||
                ships.some((candidate) => candidate.id === ship.tractoredShipId)
                  ? []
                  : [ship.tractoredShipId],
              ),
            ),
          ].sort((a, b) => a - b);
          if (!additionalIds.length) break;
          const additional = await manager.find(Spacecraft, {
            where: { id: In(additionalIds) },
            order: { id: 'ASC' },
            lock: { mode: 'pessimistic_write', onLocked: 'nowait' },
          });
          if (additional.length !== additionalIds.length)
            throw new BadRequestException('Traktorziel nicht gefunden');
          const positions = await manager.find(Spacecraft, {
            where: { id: In(additionalIds) },
            relations: [
              'location',
              'location.galaxyField',
              'location.galaxyField.layer',
              'location.galaxyField.starSystem',
            ],
          });
          for (const target of additional) {
            const hydrated = positions.find(
              (position) => position.id === target.id,
            );
            if (!hydrated)
              throw new BadRequestException('Traktorziel nicht gefunden');
            target.location = hydrated.location;
            if (!ships.some((ship) => ship.id === target.id))
              ships.push(target);
            if (target.fleetId == null || fleetIds.has(target.fleetId))
              continue;
            const fleet = await manager.findOne(Fleet, {
              where: { id: target.fleetId, userId },
              lock: { mode: 'for_no_key_update', onLocked: 'nowait' },
            });
            if (!fleet)
              throw new BadRequestException(
                'Flottenmitgliedschaft hat sich geändert; bitte erneut versuchen',
              );
            // STU `TractorConsequence`: a towed leader ends its fleet's order.
            if (fleet.leaderId === target.id) {
              const notify = await this.orbitOrders?.lifecycle?.cancelForFleet(
                manager,
                fleet.id,
                { towedShipName: target.name },
              );
              if (notify) afterCommit.push(() => void notify());
            }
            const candidates = await manager.findBy(Spacecraft, {
              fleetId: fleet.id,
            });
            const members = await manager.find(Spacecraft, {
              where: { id: In(candidates.map((member) => member.id)) },
              order: { id: 'ASC' },
              lock: { mode: 'pessimistic_write', onLocked: 'nowait' },
            });
            const current = await manager.findBy(Spacecraft, {
              fleetId: fleet.id,
            });
            if (
              members.length !== current.length ||
              members.some(
                (member) =>
                  member.fleetId !== fleet.id || member.userId !== userId,
              ) ||
              current.some(
                (member) =>
                  !members.some((candidate) => candidate.id === member.id),
              ) ||
              !members.some((member) => member.id === fleet.leaderId)
            )
              throw new BadRequestException(
                'Flottenmitgliedschaft hat sich geändert; bitte erneut versuchen',
              );
            fleetIds.add(fleet.id);
            for (const member of members)
              if (!ships.some((ship) => ship.id === member.id))
                ships.push(member);
          }
        }
        ships.sort((a, b) => a.id - b.id);
        const holders = await manager.findBy(Spacecraft, {
          tractoredShipId: In(ships.map((ship) => ship.id)),
        });
        if (
          holders.some((holder) => !ships.some((ship) => ship.id === holder.id))
        )
          throw new BadRequestException(
            'Ein Schiff wird von einem Traktorstrahl gehalten',
          );
        const modules = await manager.find(SpacecraftModule, {
          where: { spacecraftId: In(ships.map((ship) => ship.id)) },
          order: { id: 'ASC' },
          lock: { mode: 'pessimistic_write', onLocked: 'nowait' },
        });
        const assignments = await manager.find(CrewAssignment, {
          where: { spacecraftId: In(ships.map((ship) => ship.id)) },
          order: { crewId: 'ASC' },
          lock: { mode: 'pessimistic_read', onLocked: 'nowait' },
        });
        for (const ship of ships) {
          ship.modules = modules.filter(
            (module) => module.spacecraftId === ship.id,
          );
          if (
            assignments.filter(
              (assignment) => assignment.spacecraftId === ship.id,
            ).length < Math.max(0, ship.crewRequired)
          )
            throw new BadRequestException('Not enough crew');
        }
        const positions = await manager.find(Spacecraft, {
          where: { id: In(ships.map((ship) => ship.id)) },
          relations: [
            'location',
            'location.galaxyField',
            'location.galaxyField.layer',
            'location.galaxyField.starSystem',
            'location.galaxyField.fieldType',
          ],
        });
        for (const ship of ships)
          ship.location = positions.find(
            (position) => position.id === ship.id,
          )!.location;
        const origin = resolveSpacecraftLocation(locked.ship);
        if (origin?.scope !== 'GALAXY')
          throw new BadRequestException('Ship is not on a galaxy field');
        const wormholes = await manager.find(Wormhole, {
          where: [
            {
              entryLayerId: origin.layerId,
              entryCx: origin.x,
              entryCy: origin.y,
              isActive: true,
            },
            {
              exitLayerId: origin.layerId,
              exitCx: origin.x,
              exitCy: origin.y,
              isActive: true,
              isBidirectional: true,
            },
          ],
          order: { id: 'ASC' },
          lock: { mode: 'pessimistic_read' },
        });
        const fields = await manager.find(GalaxyField, {
          where: {
            layerId: In([
              ...new Set(
                wormholes.flatMap((hole) => [
                  hole.entryLayerId,
                  hole.exitLayerId,
                ]),
              ),
            ]),
          },
          order: { id: 'ASC' },
        });
        const shipSnapshots = immutableSnapshot(ships);
        const wormholeSnapshots = immutableSnapshot(wormholes);
        const policy = this.accessPolicy.snapshot
          ? await this.accessPolicy.snapshot(manager, shipSnapshots, wormholeSnapshots)
          : this.accessPolicy;
        const plan = await planWormholePassage({
          userId,
          ships: shipSnapshots,
          wormholes: wormholeSnapshots,
          fields: immutableSnapshot(fields),
          wormholeId,
          accessPolicy: policy,
          random: this.random,
        });
        const originField = await manager.findOneOrFail(GalaxyField, {
          where: { id: locked.ship.location.galaxyFieldId! },
          lock: { mode: 'pessimistic_read', onLocked: 'nowait' },
        });
        if (
          originField.layerId !== plan.origin.layerId ||
          originField.cx !== plan.origin.cx ||
          originField.cy !== plan.origin.cy
        )
          throw new BadRequestException('Origin state changed; please retry');
        const originLocation = await manager.findOneOrFail(SpaceLocation, {
          where: { id: locked.ship.locationId! },
          lock: { mode: 'pessimistic_read', onLocked: 'nowait' },
        });
        if (originLocation.galaxyFieldId !== originField.id)
          throw new BadRequestException('Origin state changed; please retry');
        if (plan.direction === 'ENTRY') {
          for (const ship of ships) {
            const impulse = ship.modules.filter((module) =>
              getRuntimeSystemsForModule(module).includes('SUBLIGHT_DRIVE'),
            );
            if (!impulse.some((module) => module.integrity > 0))
              throw new BadRequestException('Impulsantrieb zerstört');
            if (impulse.some((module) => module.cooldown > 0))
              throw new BadRequestException('Impulsantrieb kühlt noch ab');
          }
        }
        const destinationField = await manager.findOneOrFail(GalaxyField, {
          where: { id: plan.destination.id },
          lock: { mode: 'pessimistic_read', onLocked: 'nowait' },
        });
        const plannedField = fields.find(
          (field) => field.id === plan.destination.id,
        );
        if (!isDeepStrictEqual(destinationField, plannedField))
          throw new BadRequestException(
            'Destination state changed; please retry',
          );
        const hydratedDestination = await manager.findOneOrFail(GalaxyField, {
          where: { id: destinationField.id },
          relations: ['fieldType'],
        });
        destinationField.fieldType = hydratedDestination.fieldType;
        const destination = await manager.findOneOrFail(SpaceLocation, {
          where: { galaxyFieldId: plan.destination.id },
          lock: { mode: 'pessimistic_read', onLocked: 'nowait' },
        });
        for (const participant of plan.participants) {
          const ship = ships.find((ship) => ship.id === participant.shipId)!;
          const systems = initializeSpacecraftRuntimeSystems(ship);
          if (participant.activateSublight && systems.SUBLIGHT_DRIVE)
            systems.SUBLIGHT_DRIVE.active = true;
          ship.runtimeSystems = systems;
          ship.energy -= participant.activationEps;
          await this.cartography.resetFinishingForSpacecraft(ship.id, manager);
          const previousLocation = ship.location;
          ship.locationId = destination.id;
          ship.location = destination;
          ship.dockedAtId = null;
          ship.dockedAt = null;
          await this.transitions.enterDestination(
            destinationField,
            (field) => field.isPassable,
            async (field) => {
              await this.consequences.onEnterField(ship, field, transaction);
            },
          );
          // A destroyed ship is already removed; saving would recreate it.
          if (isSpacecraftDestroyed(ship)) continue;
          await manager.save(ship);
          await this.exploration.discoverArea(
            {
              userId,
              layerId: plan.destination.layerId,
              cx: plan.destination.cx,
              cy: plan.destination.cy,
              radius: this.sensorRange(ship),
              source: 'wormhole',
            },
            manager,
          );
          await this.knowledge.markKnown(
            userId,
            plan.destination.layerId,
            new Date(),
            manager,
          );
          await this.signatures.createMovement(
            ship,
            previousLocation,
            destination,
            null,
            manager,
          );
          await manager.save(
            manager.create(ShipLogEntry, {
              spacecraftId: ship.id,
              authorId: userId,
              body: 'Wurmloch durchflogen',
            }),
          );
          await this.messaging.sendSystem(
            userId,
            `${ship.name}: Wurmloch durchflogen`,
            undefined,
            MessageFolder.SHIP,
            undefined,
            false,
            transaction,
          );
        }
        await this.takeover.cancelForShipsInTransaction(
          ships.map((ship) => ship.id),
          transaction,
        );
        const cancelled = await this.repairs.cancelTasks(
          manager,
          ships.map((ship) => ship.id),
          true,
        );
        await this.repairs.notifyCancelled(
          cancelled,
          'Die Wurmlochpassage',
          transaction,
        );
        return {
          wormholeId: plan.wormholeId,
          direction: plan.direction,
          shipIds: ships.map((ship) => ship.id),
          locationId: destination.id,
        };
      })
      .catch((error: unknown) => {
        if (
          error instanceof QueryFailedError &&
          error.driverError.code === '55P03'
        )
          throw new BadRequestException(
            'Passagezustand ist gesperrt; bitte erneut versuchen',
          );
        throw error;
      });
    for (const notify of afterCommit) notify();
    return result;
  }

  private sensorRange(ship: Spacecraft): number {
    const sensors = initializeSpacecraftRuntimeSystems(ship).LONG_RANGE_SENSORS;
    if (!sensors?.active || sensors.integrity <= 0) return 0;
    let maximum = 3;
    for (const module of ship.modules) {
      const definition = this.gameData
        .getAllModules()
        .find((candidate) => candidate.name === module.moduleType);
      if (definition?.category === 'SENSORS') {
        const base =
          (definition.public as Record<string, number>)?.baseSensorRange ?? 2;
        maximum = Math.max(maximum, base + module.level - 1);
      }
    }
    return Math.ceil((maximum * sensors.integrity) / 100);
  }
}
