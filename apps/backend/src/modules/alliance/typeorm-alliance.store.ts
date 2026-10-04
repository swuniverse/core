import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  ILike,
  In,
  Not,
  QueryFailedError,
} from 'typeorm';
import { AllianceRole, Faction } from '@swuniverse/shared';
import { User } from '../auth/user.entity';
import { FactionEntity } from '../faction/entities/faction.entity';
import { Alliance } from './entities/alliance.entity';
import { AllianceMembership } from './entities/alliance-membership.entity';
import { AllianceApplication } from './entities/alliance-application.entity';
import { AllianceRelationship } from './entities/alliance-relationship.entity';
import {
  AllianceConstraint,
  AllianceConstraintViolation,
  AlliancePatch,
  AllianceRecord,
  AllianceRelationshipRecord,
  AllianceStore,
  ApplicationRecord,
  FactionRecord,
  MembershipRecord,
  PlayerRecord,
} from './alliance.store';

const CONSTRAINTS: Record<string, AllianceConstraint> = {
  UQ_alliances_name_lower: 'alliance_name',
  UQ_alliance_memberships_user: 'membership_user',
  UQ_alliance_memberships_president: 'alliance_president',
  UQ_alliance_applications_alliance_user: 'application',
};

const UNIQUE_VIOLATION = '23505';

function translateConstraintError(error: unknown): never {
  if (error instanceof QueryFailedError) {
    const driverError = error.driverError as {
      code?: string;
      constraint?: string;
    };
    const constraint = driverError.constraint
      ? CONSTRAINTS[driverError.constraint]
      : undefined;
    if (driverError.code === UNIQUE_VIOLATION && constraint) {
      throw new AllianceConstraintViolation(constraint);
    }
  }
  throw error;
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

function toPlayer(user: User): PlayerRecord {
  return {
    id: user.id,
    name: user.displayName || user.username,
    factionId: user.factionId,
  };
}

function toAlliance(alliance: Alliance): AllianceRecord {
  return {
    id: alliance.id,
    name: alliance.name,
    description: alliance.description,
    homepage: alliance.homepage,
    color: alliance.color,
    factionId: alliance.factionId,
    acceptsApplications: alliance.acceptsApplications,
    presidentTitle: alliance.presidentTitle,
    viceTitle: alliance.viceTitle,
    diplomatTitle: alliance.diplomatTitle,
    foundedAt: alliance.foundedAt,
  };
}

function toMembership(membership: AllianceMembership): MembershipRecord {
  return {
    id: membership.id,
    allianceId: membership.allianceId,
    userId: membership.userId,
    role: membership.role,
    joinedAt: membership.joinedAt,
  };
}

function toApplication(application: AllianceApplication): ApplicationRecord {
  return {
    id: application.id,
    allianceId: application.allianceId,
    userId: application.userId,
    createdAt: application.createdAt,
  };
}

function toRelationship(
  relationship: AllianceRelationship,
): AllianceRelationshipRecord {
  return {
    id: relationship.id,
    firstAllianceId: relationship.firstParty.allianceId!,
    secondAllianceId: relationship.secondParty.allianceId!,
    type: relationship.type,
    startedAt: relationship.startedAt,
    endedAt: relationship.endedAt,
    contract: relationship.contract,
    treatAsFriend: relationship.treatAsFriend,
    shareLivePositions: relationship.shareLivePositions,
    lordAllianceId: relationship.lordParty?.allianceId ?? null,
    vassalAllianceId: relationship.vassalParty?.allianceId ?? null,
  };
}

class TypeOrmAllianceStoreSession implements AllianceStore {
  constructor(
    protected readonly manager: EntityManager,
    private readonly inTransaction: boolean,
  ) {}

  async transaction<T>(work: (store: AllianceStore) => Promise<T>): Promise<T> {
    if (this.inTransaction) return work(this);
    return this.manager.transaction((manager) =>
      work(new TypeOrmAllianceStoreSession(manager, true)),
    );
  }

  async lockAlliance(id: number) {
    const alliance = await this.manager.findOne(Alliance, {
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
    return alliance ? toAlliance(alliance) : null;
  }

  async findPlayer(id: number) {
    const user = await this.manager.findOneBy(User, { id });
    return user ? toPlayer(user) : null;
  }

  async findPlayers(ids: number[]) {
    if (!ids.length) return [];
    const users = await this.manager.findBy(User, { id: In(ids) });
    return users.map(toPlayer);
  }

  async listFactions(): Promise<FactionRecord[]> {
    const factions = await this.manager.find(FactionEntity, {
      order: { id: 'ASC' },
    });
    return factions.map((f) => ({
      id: f.id,
      key: f.key as Faction,
      name: f.name,
    }));
  }

  async findAlliance(id: number) {
    const alliance = await this.manager.findOneBy(Alliance, { id });
    return alliance ? toAlliance(alliance) : null;
  }

  async listAlliances() {
    const alliances = await this.manager.find(Alliance, {
      order: { id: 'ASC' },
    });
    return alliances.map(toAlliance);
  }

  async listActiveRelationships(allianceId: number) {
    const relationships = await this.manager
      .createQueryBuilder(AllianceRelationship, 'relationship')
      .innerJoinAndSelect('relationship.firstParty', 'firstParty')
      .innerJoinAndSelect('relationship.secondParty', 'secondParty')
      .leftJoinAndSelect('relationship.lordParty', 'lordParty')
      .leftJoinAndSelect('relationship.vassalParty', 'vassalParty')
      .where('relationship.endedAt IS NULL')
      .andWhere(
        '(firstParty.allianceId = :allianceId OR secondParty.allianceId = :allianceId)',
        { allianceId },
      )
      .orderBy('relationship.startedAt', 'DESC')
      .addOrderBy('relationship.id', 'DESC')
      .getMany();
    return relationships.map(toRelationship);
  }

  async findActiveRelationship(id: number) {
    const relationship = await this.manager
      .createQueryBuilder(AllianceRelationship, 'relationship')
      .innerJoinAndSelect('relationship.firstParty', 'firstParty')
      .innerJoinAndSelect('relationship.secondParty', 'secondParty')
      .leftJoinAndSelect('relationship.lordParty', 'lordParty')
      .leftJoinAndSelect('relationship.vassalParty', 'vassalParty')
      .where('relationship.id = :id', { id })
      .andWhere('relationship.endedAt IS NULL')
      .getOne();
    return relationship ? toRelationship(relationship) : null;
  }

  async countMembers() {
    const rows = await this.manager
      .createQueryBuilder(AllianceMembership, 'm')
      .select('m.allianceId', 'allianceId')
      .addSelect('COUNT(*)', 'count')
      .groupBy('m.allianceId')
      .getRawMany<{ allianceId: number; count: string }>();
    return new Map(rows.map((r) => [Number(r.allianceId), Number(r.count)]));
  }

  async isNameTaken(name: string, exceptAllianceId?: number) {
    return this.manager.exists(Alliance, {
      where: {
        name: ILike(escapeLike(name)),
        ...(exceptAllianceId ? { id: Not(exceptAllianceId) } : {}),
      },
    });
  }

  async insertAlliance(data: {
    name: string;
    description: string;
    factionId: number;
  }) {
    const alliance = await this.manager
      .save(Alliance, this.manager.create(Alliance, data))
      .catch(translateConstraintError);
    return toAlliance(
      await this.manager.findOneByOrFail(Alliance, { id: alliance.id }),
    );
  }

  async updateAlliance(id: number, patch: AlliancePatch) {
    if (!Object.keys(patch).length) return;
    await this.manager
      .update(Alliance, { id }, patch)
      .catch(translateConstraintError);
  }

  async deleteAlliance(id: number) {
    await this.manager.delete(Alliance, { id });
  }

  async findMembership(userId: number) {
    const membership = await this.manager.findOneBy(AllianceMembership, {
      userId,
    });
    return membership ? toMembership(membership) : null;
  }

  async listMemberships(allianceId: number) {
    const memberships = await this.manager.find(AllianceMembership, {
      where: { allianceId },
      order: { joinedAt: 'ASC', id: 'ASC' },
    });
    return memberships.map(toMembership);
  }

  async insertMembership(data: {
    allianceId: number;
    userId: number;
    role: AllianceRole;
  }) {
    await this.manager
      .insert(AllianceMembership, data)
      .catch(translateConstraintError);
  }

  async setRole(allianceId: number, userId: number, role: AllianceRole) {
    const result = await this.manager
      .update(AllianceMembership, { allianceId, userId }, { role })
      .catch(translateConstraintError);
    return (result.affected ?? 0) > 0;
  }

  async deleteMembership(allianceId: number, userId: number) {
    const result = await this.manager.delete(AllianceMembership, {
      allianceId,
      userId,
    });
    return (result.affected ?? 0) > 0;
  }

  async findApplication(id: number) {
    const application = await this.manager.findOneBy(AllianceApplication, {
      id,
    });
    return application ? toApplication(application) : null;
  }

  async findApplicationOf(allianceId: number, userId: number) {
    const application = await this.manager.findOneBy(AllianceApplication, {
      allianceId,
      userId,
    });
    return application ? toApplication(application) : null;
  }

  async listApplicationsForAlliance(allianceId: number) {
    const applications = await this.manager.find(AllianceApplication, {
      where: { allianceId },
      order: { createdAt: 'ASC', id: 'ASC' },
    });
    return applications.map(toApplication);
  }

  async listApplicationsOfPlayer(userId: number) {
    const applications = await this.manager.find(AllianceApplication, {
      where: { userId },
      order: { id: 'ASC' },
    });
    return applications.map(toApplication);
  }

  async insertApplication(data: { allianceId: number; userId: number }) {
    const application = await this.manager
      .save(AllianceApplication, this.manager.create(AllianceApplication, data))
      .catch(translateConstraintError);
    return toApplication(application);
  }

  async deleteApplications(ids: number[]) {
    if (!ids.length) return 0;
    const result = await this.manager.delete(AllianceApplication, {
      id: In(ids),
    });
    return result.affected ?? 0;
  }
}

@Injectable()
export class TypeOrmAllianceStore extends TypeOrmAllianceStoreSession {
  constructor(@InjectDataSource() dataSource: DataSource) {
    super(dataSource.manager, false);
  }
}
