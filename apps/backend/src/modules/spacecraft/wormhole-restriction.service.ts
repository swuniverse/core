import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import type {
  CreateWormholeRestrictionDto,
  AdminWormholeRestrictionsDto,
} from '@swuniverse/shared';
import { DataSource, EntityManager } from 'typeorm';
import { Alliance } from '../alliance/entities/alliance.entity';
import {
  ALLIANCE_CONTEXT_CLEANUP,
  AllianceContextCleanup,
} from '../alliance/alliance-context-cleanup';
import { User } from '../auth/user.entity';
import { FactionEntity } from '../faction/entities/faction.entity';
import { Wormhole } from '../starmap/entities/wormhole.entity';
import { Spacecraft } from './entities/spacecraft.entity';
import { WormholeRestriction } from './entities/wormhole-restriction.entity';

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

  /** STU "Wurmlochkontrolle": admins only, the controller enforces that. */
  async list(): Promise<AdminWormholeRestrictionsDto> {
    return this.read(this.dataSource.manager);
  }

  async add(
    wormholeId: number,
    dto: CreateWormholeRestrictionDto,
  ): Promise<AdminWormholeRestrictionsDto> {
    return this.dataSource.transaction(async (manager) => {
      await this.lockWormhole(manager, wormholeId);
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
      if (
        await manager.existsBy(WormholeRestriction, {
          wormholeId,
          targetType: dto.targetType,
          targetId: dto.targetId,
        })
      )
        throw new BadRequestException(
          'Für dieses Ziel existiert bereits eine Regel',
        );
      await manager.insert(WormholeRestriction, { ...dto, wormholeId });
      return this.read(manager);
    });
  }

  async remove(
    wormholeId: number,
    restrictionId: number,
  ): Promise<AdminWormholeRestrictionsDto> {
    return this.dataSource.transaction(async (manager) => {
      await this.lockWormhole(manager, wormholeId);
      await manager.delete(WormholeRestriction, {
        id: restrictionId,
        wormholeId,
      });
      return this.read(manager);
    });
  }

  /** Serializes concurrent rule changes of one wormhole (duplicate check). */
  private async lockWormhole(manager: EntityManager, wormholeId: number) {
    const hole = await manager.findOne(Wormhole, {
      where: { id: wormholeId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!hole) throw new NotFoundException('Wurmloch nicht gefunden');
  }

  private async read(
    manager: EntityManager,
  ): Promise<AdminWormholeRestrictionsDto> {
    const [holes, rules] = await Promise.all([
      manager.find(Wormhole, { order: { id: 'ASC' } }),
      manager.find(WormholeRestriction, { order: { id: 'ASC' } }),
    ]);
    return {
      wormholes: holes.map((hole) => ({
        id: hole.id,
        name: hole.name,
        isActive: hole.isActive,
        isBidirectional: hole.isBidirectional,
        entry: { layerId: hole.entryLayerId, x: hole.entryCx, y: hole.entryCy },
        exit: { layerId: hole.exitLayerId, x: hole.exitCx, y: hole.exitCy },
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
