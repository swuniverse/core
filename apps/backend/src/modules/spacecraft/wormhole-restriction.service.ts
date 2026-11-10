import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import type {
  CreateWormholeRestrictionDto,
  StationWormholeRestrictionsDto,
} from '@swuniverse/shared';
import { DataSource, EntityManager, In } from 'typeorm';
import { Alliance } from '../alliance/entities/alliance.entity';
import {
  ALLIANCE_CONTEXT_CLEANUP,
  AllianceContextCleanup,
} from '../alliance/alliance-context-cleanup';
import { User } from '../auth/user.entity';
import { FactionEntity } from '../faction/entities/faction.entity';
import { Wormhole } from '../starmap/entities/wormhole.entity';
import { Spacecraft, SpacecraftKind } from './entities/spacecraft.entity';
import { WormholeRestriction } from './entities/wormhole-restriction.entity';
import { resolveSpacecraftLocation } from './spacecraft-field';

@Injectable()
export class WormholeRestrictionService implements OnModuleInit {
  constructor(
    private readonly dataSource: DataSource,
    @Optional()
    @Inject(ALLIANCE_CONTEXT_CLEANUP)
    private readonly contextCleanup?: AllianceContextCleanup,
  ) {}

  onModuleInit(): void {
    // Alliance rules are removed atomically with their target's lifecycle.
    this.contextCleanup?.register({
      allianceDissolved: async ({ allianceId }, { transaction }) => {
        await (transaction as EntityManager).delete(WormholeRestriction, {
          targetType: 'ALLIANCE',
          targetId: allianceId,
        });
      },
      reset: async ({ transaction }) => {
        await (transaction as EntityManager).delete(WormholeRestriction, {
          targetType: 'ALLIANCE',
        });
      },
    });
  }

  async list(
    stationId: number,
    userId: number,
  ): Promise<StationWormholeRestrictionsDto> {
    return this.dataSource.transaction(async (manager) => {
      const holes = await this.managedWormholes(manager, stationId, userId);
      return this.read(manager, holes);
    });
  }

  async add(
    stationId: number,
    userId: number,
    dto: CreateWormholeRestrictionDto,
  ): Promise<StationWormholeRestrictionsDto> {
    return this.dataSource.transaction(async (manager) => {
      const holes = await this.managedWormholes(manager, stationId, userId);
      if (!holes.some((hole) => hole.id === dto.wormholeId))
        throw new ForbiddenException('Wurmlochverwaltung nicht erlaubt');
      const targets = {
        USER: User,
        ALLIANCE: Alliance,
        FACTION: FactionEntity,
        SHIP: Spacecraft,
      };
      if (
        !(await manager.existsBy(targets[dto.targetType], { id: dto.targetId }))
      )
        throw new BadRequestException('Das Ziel existiert nicht');
      await manager.upsert(WormholeRestriction, dto, [
        'wormholeId',
        'targetType',
        'targetId',
      ]);
      return this.read(manager, holes);
    });
  }

  async remove(
    stationId: number,
    userId: number,
    restrictionId: number,
  ): Promise<StationWormholeRestrictionsDto> {
    return this.dataSource.transaction(async (manager) => {
      const holes = await this.managedWormholes(manager, stationId, userId);
      await manager.delete(WormholeRestriction, {
        id: restrictionId,
        wormholeId: In(holes.map((hole) => hole.id)),
      });
      return this.read(manager, holes);
    });
  }

  private async managedWormholes(
    manager: EntityManager,
    stationId: number,
    userId: number,
  ): Promise<Wormhole[]> {
    // Hold ownership/location stable. The wormhole write lock serializes rule
    // changes with passage snapshots, which acquire secondary station locks NOWAIT.
    const station = await manager.findOne(Spacecraft, {
      where: { id: stationId, userId, kind: SpacecraftKind.STATION },
      lock: { mode: 'pessimistic_read' },
    });
    if (!station)
      throw new ForbiddenException('Wurmlochverwaltung nicht erlaubt');
    const hydrated = await manager.findOneOrFail(Spacecraft, {
      where: { id: station.id },
      relations: ['location', 'location.galaxyField'],
    });
    const location = resolveSpacecraftLocation(hydrated);
    if (location?.scope !== 'GALAXY')
      throw new ForbiddenException('Wurmlochverwaltung nicht erlaubt');
    const holes = await manager.find(Wormhole, {
      where: {
        entryLayerId: location.layerId,
        entryCx: location.x,
        entryCy: location.y,
      },
      order: { id: 'ASC' },
      lock: { mode: 'pessimistic_write' },
    });
    if (!holes.length)
      throw new ForbiddenException('Wurmlochverwaltung nicht erlaubt');
    return holes;
  }

  private async read(
    manager: EntityManager,
    holes: Wormhole[],
  ): Promise<StationWormholeRestrictionsDto> {
    const rules = await manager.find(WormholeRestriction, {
      where: { wormholeId: In(holes.map((hole) => hole.id)) },
      order: { id: 'ASC' },
    });
    return {
      wormholes: holes.map((hole) => ({
        id: hole.id,
        name: hole.name,
        restrictions: rules
          .filter((rule) => rule.wormholeId === hole.id)
          .map(({ id, targetType, targetId, mode }) => ({
            id,
            targetType,
            targetId,
            mode,
          })),
      })),
    };
  }
}
