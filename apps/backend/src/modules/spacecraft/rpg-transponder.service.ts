import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, IsNull } from 'typeorm';
import type {
  RpgSceneSpacecraftDto,
  SpacecraftRuntimeSystemsDto,
} from '@swuniverse/shared';
import { User } from '../auth/user.entity';
import { ShipDistressSignal } from './entities/ship-distress-signal.entity';
import { RpgPlot } from '../rpg/rpg-plot.entity';
import { GameGateway } from '../websocket/game.gateway';
import { Spacecraft, SpacecraftStatus } from './entities/spacecraft.entity';
import { initializeSpacecraftRuntimeSystems } from './spacecraft-runtime-state.service';
import { SpacecraftService } from './spacecraft.service';
import { StarmapVisibilityService } from './starmap-visibility.service';
import { isHiddenFromViewer } from './spacecraft-cloak';
import { resolveSpacecraftLocation } from './spacecraft-field';
import { RpgActionLockService } from './rpg-action-lock.service';

const RELATIONS = [
  'user',
  'modules',
  'location',
  'location.galaxyField',
  'location.systemField',
  'location.systemField.starSystem',
];

@Injectable()
export class RpgTransponderService {
  constructor(
    private readonly db: DataSource,
    private readonly gateway: GameGateway,
    private readonly spacecraft: SpacecraftService,
    private readonly visibility: StarmapVisibilityService,
    private readonly actions: RpgActionLockService,
  ) {}

  private async admin(manager: EntityManager, userId: number) {
    const user = await manager.findOneBy(User, { id: userId });
    if (!user?.isAdmin) throw new ForbiddenException('Admin access required');
  }
  async list(userId: number): Promise<RpgSceneSpacecraftDto[]> {
    await this.admin(this.db.manager, userId);
    const ships = await this.db.manager.find(Spacecraft, {
      where: { userId },
      relations: RELATIONS,
      order: { id: 'ASC' },
    });
    return Promise.all(ships.map((ship) => this.dto(this.db.manager, ship)));
  }
  async plots(userId: number) {
    await this.admin(this.db.manager, userId);
    return this.db.manager.find(RpgPlot, {
      where: { creatorId: userId, endedAt: IsNull() },
      select: ['id', 'title'],
      order: { id: 'DESC' },
    });
  }
  assign(shipId: number, userId: number, plotId: number) {
    return this.change(shipId, userId, async (manager, ship) => {
      const plot = await manager.findOneBy(RpgPlot, {
        id: plotId,
        creatorId: userId,
        endedAt: IsNull(),
      });
      if (!plot)
        throw new BadRequestException(
          'Ein eigener aktiver RPG-Plot ist erforderlich',
        );
      await manager.query(
        'UPDATE spacecraft SET "rpgPlotId" = $2 WHERE id = $1',
        [ship.id, plot.id],
      );
      ship.rpgPlotId = plot.id;
    });
  }
  remove(shipId: number, userId: number) {
    return this.change(shipId, userId, async (manager, ship) => {
      await manager.query(
        'UPDATE spacecraft SET "rpgPlotId" = NULL, "rpgHidden" = false WHERE id = $1',
        [ship.id],
      );
      ship.rpgPlotId = null;
      ship.rpgHidden = false;
    });
  }
  setHidden(shipId: number, userId: number, hidden: boolean) {
    return this.change(shipId, userId, async (manager, ship) => {
      const plot =
        ship.rpgPlotId == null
          ? null
          : await manager.findOneBy(RpgPlot, {
              id: ship.rpgPlotId,
              creatorId: userId,
            });
      if (!plot)
        throw new BadRequestException(
          'Kein eigener RPG-Transponder zugeordnet',
        );
      if (hidden && plot.endedAt != null)
        throw new BadRequestException('Der RPG-Plot ist bereits beendet');
      if (
        hidden &&
        (ship.status !== SpacecraftStatus.IDLE ||
          ship.fleetId != null ||
          ship.dockedAtId != null ||
          ship.tractoredShipId != null ||
          (await manager.existsBy(Spacecraft, { tractoredShipId: ship.id })) ||
          (await manager.existsBy(Spacecraft, { dockedAtId: ship.id })))
      )
        throw new BadRequestException(
          'Nur freie einsatzbereite Szenenschiffe können ausgeblendet werden',
        );
      await manager.query(
        'UPDATE spacecraft SET "rpgHidden" = $2 WHERE id = $1',
        [ship.id, hidden],
      );
      ship.rpgHidden = hidden;
    });
  }
  private async change(
    shipId: number,
    userId: number,
    mutate: (manager: EntityManager, ship: Spacecraft) => Promise<void>,
  ) {
    let publish: (() => void) | undefined;
    const result = await this.db.transaction(async (manager) => {
      await this.admin(manager, userId);
      await this.actions.acquireAdmin(manager, shipId);
      const ship = await manager.findOne(Spacecraft, {
        where: { id: shipId, userId },
        relations: RELATIONS,
        lock: { mode: 'pessimistic_write', tables: ['spacecraft'] },
      });
      if (!ship)
        throw new NotFoundException('Eigenes Szenenschiff nicht gefunden');
      const wasHidden = ship.rpgHidden;
      await mutate(manager, ship);
      if (wasHidden !== ship.rpgHidden) {
        // Compute the audience with the public state; never broadcast scene IDs globally.
        const audience = await this.audience({ ...ship, rpgHidden: false });
        if (!wasHidden && ship.rpgHidden) {
          // No waiting behind a player action that may itself be waiting on this scene ship.
          const trackers = await manager
            .getRepository(Spacecraft)
            .createQueryBuilder('source')
            .where(
              `source."runtimeSystems"->'TRACKER'->>'targetId' = :target`,
              { target: String(ship.id) },
            )
            .setLock('pessimistic_write')
            .setOnLocked('nowait')
            .getMany();
          for (const source of trackers) {
            await this.actions.acquireAdmin(manager, source.id);
            const systems =
              source.runtimeSystems as SpacecraftRuntimeSystemsDto | null;
            if (systems?.TRACKER)
              await manager.update(Spacecraft, source.id, {
                runtimeSystems: {
                  ...systems,
                  TRACKER: {
                    ...systems.TRACKER,
                    active: false,
                    targetId: undefined,
                    ticksRemaining: 0,
                  },
                },
              });
          }
          // The source's own tracker cannot keep tracking players while it is hidden either.
          const systems =
            ship.runtimeSystems as SpacecraftRuntimeSystemsDto | null;
          if (systems?.TRACKER?.active)
            await manager.update(Spacecraft, ship.id, {
              runtimeSystems: {
                ...systems,
                TRACKER: {
                  ...systems.TRACKER,
                  active: false,
                  targetId: undefined,
                  ticksRemaining: 0,
                },
              },
            });
        }

        const location = resolveSpacecraftLocation(ship);
        if (!location)
          throw new BadRequestException('Szenenschiff hat keinen gültigen Ort');
        const payload = ship.rpgHidden
          ? { type: 'REMOVED' as const, shipId: ship.id }
          : {
              type: 'STATE' as const,
              shipId: ship.id,
              state: {
                spacecraftId: ship.id,
                spacecraftName: ship.name,
                shipClassId: ship.shipClassId,
                ownerId: ship.userId,
                ownerName: ship.user?.username ?? null,
                location,
              },
            };
        publish = () => {
          for (const viewer of audience)
            this.gateway.emitVisibilityToUser(viewer, payload);
        };
      }
      return this.dto(manager, ship);
    });
    publish?.();
    return result;
  }
  private async audience(ship: Spacecraft): Promise<number[]> {
    const viewers = [...new Set([ship.userId, ...this.gateway.onlineUserIds])];
    const location = resolveSpacecraftLocation(ship);
    const trackers = await this.db.manager
      .getRepository(Spacecraft)
      .createQueryBuilder('source')
      .where(`source."runtimeSystems"->'TRACKER'->>'targetId' = :target`, {
        target: String(ship.id),
      })
      .getMany();
    const trackedOwners = new Set(trackers.map((source) => source.userId));
    const publicSignal = await this.db.manager.existsBy(ShipDistressSignal, {
      spacecraftId: ship.id,
      active: true,
    });
    const visible: number[] = [];
    for (const viewerId of viewers) {
      if (isHiddenFromViewer(ship, viewerId)) continue;
      if (
        viewerId === ship.userId ||
        trackedOwners.has(viewerId) ||
        publicSignal
      ) {
        visible.push(viewerId);
        continue;
      }
      // Shared starmap positions, plus actual working sensors on the same map.
      if (await this.visibility.maySeeOwnerPosition(viewerId, ship.userId)) {
        visible.push(viewerId);
        continue;
      }
      const observers = await this.db.manager.find(Spacecraft, {
        where: { userId: viewerId, rpgHidden: false },
        relations: RELATIONS,
      });
      for (const observer of observers) {
        const systems = initializeSpacecraftRuntimeSystems(observer);
        const sensor = systems.LONG_RANGE_SENSORS;
        const nbs = systems.SHORT_RANGE_SENSORS;
        const at = resolveSpacecraftLocation(observer);
        if (!at || !location || at.scope !== location.scope) continue;
        const sameMap =
          at.scope === 'SYSTEM' && location.scope === 'SYSTEM'
            ? at.systemId === location.systemId
            : at.scope === 'GALAXY' &&
              location.scope === 'GALAXY' &&
              at.layerId === location.layerId;
        if (!sameMap) continue;
        const distance = Math.max(
          Math.abs(at.x - location.x),
          Math.abs(at.y - location.y),
        );
        if (
          (distance === 0 && nbs?.active && nbs.integrity > 0) ||
          (sensor?.active &&
            sensor.integrity > 0 &&
            distance <= (await this.spacecraft.getSensorRange(observer)))
        ) {
          visible.push(viewerId);
          break;
        }
      }
    }
    return visible;
  }
  private async dto(
    manager: EntityManager,
    ship: Spacecraft,
  ): Promise<RpgSceneSpacecraftDto> {
    const plot =
      ship.rpgPlotId == null
        ? null
        : await manager.findOneBy(RpgPlot, { id: ship.rpgPlotId });
    return {
      id: ship.id,
      name: ship.name,
      shipClassId: ship.shipClassId,
      plotId: ship.rpgPlotId,
      plotTitle: plot?.title ?? null,
      hidden: ship.rpgHidden,
      location: resolveSpacecraftLocation(ship),
    };
  }
}
