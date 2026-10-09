import { Injectable } from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { User } from '../auth/user.entity';
import { ColonyCrewService } from '../colony/colony-crew.service';
import { ColonyStatsService } from '../colony/colony-stats.service';
import { resolveColonyLocation } from '../colony/colony-location';
import { Colony } from '../colony/entities/colony.entity';
import { CrewAssignment } from '../colony/entities/crew-assignment.entity';
import { ShipClassDef } from '../spacecraft/entities/ship-class-def.entity';
import {
  Spacecraft,
  SpacecraftStatus,
} from '../spacecraft/entities/spacecraft.entity';
import { resolveSpacecraftLocation } from '../spacecraft/spacecraft-field';
import type {
  MemberOperationsReader,
  MemberOperationsRecord,
} from './member-operations.port';

/**
 * Read-only {@link MemberOperationsReader} over the existing colony, ship,
 * crew and user data. Every kind of data is loaded with one query for all
 * requested players; the crew limit comes from the colony module.
 */
@Injectable()
export class TypeOrmMemberOperationsReader implements MemberOperationsReader {
  constructor(
    private readonly dataSource: DataSource,
    private readonly crew: ColonyCrewService,
    private readonly stats: ColonyStatsService,
  ) {}

  async memberOperations(userIds: number[]): Promise<MemberOperationsRecord[]> {
    const ids = [...new Set(userIds)];
    if (!ids.length) return [];
    const manager = this.dataSource.manager;
    const [users, colonies, ships, assignments] = await Promise.all([
      manager.find(User, { where: { id: In(ids) } }),
      manager.find(Colony, {
        where: { userId: In(ids), isAbandoned: false },
        relations: ['fields', 'changeable', 'systemField'],
        order: { id: 'ASC' },
      }),
      manager.find(Spacecraft, {
        where: { userId: In(ids) },
        relations: ['location', 'location.systemField', 'location.galaxyField'],
        order: { id: 'ASC' },
      }),
      manager
        .createQueryBuilder(CrewAssignment, 'ca')
        .select('ca.userId', 'userId')
        .addSelect('COUNT(*)', 'cnt')
        .where('ca.userId IN (:...ids)', { ids })
        .groupBy('ca.userId')
        .getRawMany<{ userId: number; cnt: string }>(),
    ]);
    const liveShips = ships.filter(
      (ship) => ship.status !== SpacecraftStatus.DESTROYED,
    );
    const classIds = [...new Set(liveShips.map((s) => s.shipClassId))];
    const classes = classIds.length
      ? await manager.find(ShipClassDef, { where: { id: In(classIds) } })
      : [];
    const className = new Map(classes.map((c) => [c.id, c.name]));
    const assigned = new Map(assignments.map((a) => [a.userId, Number(a.cnt)]));
    const userById = new Map(users.map((u) => [u.id, u]));

    return ids.map((userId) => {
      const own = colonies.filter((c) => c.userId === userId);
      return {
        userId,
        lastActiveAt: userById.get(userId)?.lastActiveAt ?? null,
        crew: {
          assigned: assigned.get(userId) ?? 0,
          limit: own.reduce(
            (sum, c) => sum + this.crew.getLocalCrewLimit(c),
            0,
          ),
        },
        colonies: own.map((colony) => {
          const state = this.stats.calculateSummary(colony).effectiveState;
          return {
            id: colony.id,
            name: colony.name,
            location: resolveColonyLocation(colony),
            energy: state.energy.current,
            energyMax: state.energy.max,
            storageUsed: state.storage.current,
            storageMax: state.storage.max,
            population: state.population.current,
            populationMax: state.population.maxHousing,
          };
        }),
        ships: liveShips
          .filter((ship) => ship.userId === userId)
          .map((ship) => ({
            id: ship.id,
            name: ship.name,
            shipClassId: ship.shipClassId,
            shipClassName: className.get(ship.shipClassId) ?? 'Unbekannt',
            location: resolveSpacecraftLocation(ship),
          })),
      };
    });
  }
}
