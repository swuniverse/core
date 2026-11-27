import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';
import { TypeOrmAllianceStore } from '../alliance/typeorm-alliance.store';
import { AllianceMembership } from '../alliance/entities/alliance-membership.entity';
import { User } from '../auth/user.entity';
import type { WormholeDto } from '../starmap/wormhole.service';
import { Spacecraft } from './entities/spacecraft.entity';
import { WormholeRestriction } from './entities/wormhole-restriction.entity';
import type { WormholeAccessPolicy } from './wormhole-passage-planner';
import type { DockingActor } from './docking-access';
import { allowsWormholeAccess } from './wormhole-access';

@Injectable()
export class WormholeRestrictionAccessPolicy implements WormholeAccessPolicy {
  constructor(private readonly dataSource: DataSource) {}

  async allows(ship: Spacecraft, hole: WormholeDto): Promise<boolean> {
    return this.dataSource.transaction(async (manager) => {
      const policy = await this.snapshot(manager, [ship], [hole]);
      return policy.allows(ship, hole, 'ENTRY');
    });
  }

  /** Capture once in the passage transaction; no reads from policy callbacks. */
  async snapshot(
    manager: EntityManager,
    ships: readonly Spacecraft[],
    holes: readonly WormholeDto[],
  ): Promise<WormholeAccessPolicy> {
    try {
      // Like STU: rules apply to every wormhole, a station at the entry plays no role.
      const rules = await manager.find(WormholeRestriction, {
        where: { wormholeId: In(holes.map((hole) => hole.id)) },
        order: { id: 'ASC' },
      });
      const actors = new Map<number, DockingActor>();
      if (rules.length) {
        const userIds = [...new Set(ships.map((ship) => ship.userId))];
        await manager.find(User, {
          where: { id: In(userIds) },
          lock: { mode: 'pessimistic_read', onLocked: 'nowait' },
        });
        await manager.find(AllianceMembership, {
          where: { userId: In(userIds) },
          lock: { mode: 'pessimistic_read', onLocked: 'nowait' },
        });
        const store = TypeOrmAllianceStore.forManager(manager);
        const players = await store.findPlayers(userIds);
        const memberships = await store.findMemberships(userIds);
        for (const ship of ships) {
          const player = players.find((player) => player.id === ship.userId);
          if (!player || player.factionId == null) continue;
          actors.set(ship.id, {
            shipId: ship.id,
            userId: ship.userId,
            factionId: player.factionId,
            allianceId:
              memberships.find((member) => member.userId === ship.userId)
                ?.allianceId ?? null,
          });
        }
      }
      return {
        allows: (ship, hole) =>
          allowsWormholeAccess(
            actors.get(ship.id) ?? null,
            rules.filter((rule) => rule.wormholeId === hole.id),
          ),
      };
    } catch {
      return { allows: () => false };
    }
  }
}
