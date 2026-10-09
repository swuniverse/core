import type { AllianceTransactionHandle } from './alliance-context-cleanup';
import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  ILike,
  In,
  IsNull,
  Not,
  QueryFailedError,
} from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import {
  AllianceRelationshipType,
  AllianceRole,
  Faction,
} from '@swuniverse/shared';
import { User } from '../auth/user.entity';
import { FactionEntity } from '../faction/entities/faction.entity';
import { Alliance } from './entities/alliance.entity';
import { AllianceMembership } from './entities/alliance-membership.entity';
import { AllianceApplication } from './entities/alliance-application.entity';
import { AllianceRelationship } from './entities/alliance-relationship.entity';
import { AllianceRelationshipProposal } from './entities/alliance-relationship-proposal.entity';
import { AllianceRelationshipChangeProposal } from './entities/alliance-relationship-change-proposal.entity';
import { DiplomacyParty } from './entities/diplomacy-party.entity';
import { AllianceChronicleEntry } from './entities/alliance-chronicle-entry.entity';
import { AllianceDiplomacyChronicleEntry } from './entities/alliance-diplomacy-chronicle-entry.entity';
import { AllianceAssetDeletion } from './entities/alliance-asset-deletion.entity';
import { AllianceDiplomacyNotification } from './entities/alliance-diplomacy-notification.entity';
import {
  AllianceConstraint,
  AllianceConstraintViolation,
  AllianceChronicleEntryRecord,
  AllianceDiplomacyChronicleEntryRecord,
  AllianceAssetDeletionRecord,
  AllianceDiplomacyNotificationRecord,
  AlliancePatch,
  AllianceRecord,
  AllianceRelationshipChangeProposalRecord,
  AllianceRelationshipProposalRecord,
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
  UQ_alliance_relationship_proposals_pair: 'relationship_proposal',
  UQ_alliance_relationship_change_proposals_relationship:
    'relationship_change_proposal',
};

const UNIQUE_VIOLATION = '23505';
function constraintViolation(
  error: unknown,
): AllianceConstraintViolation | null {
  if (!(error instanceof QueryFailedError)) return null;
  const driverError = error.driverError as {
    code?: string;
    constraint?: string;
  };
  const constraint = driverError.constraint
    ? CONSTRAINTS[driverError.constraint]
    : undefined;
  if (driverError.code === UNIQUE_VIOLATION && constraint) {
    return new AllianceConstraintViolation(constraint);
  }
  return null;
}

function translateConstraintError(error: unknown): never {
  throw constraintViolation(error) ?? error;
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

function toPlayer(user: User): PlayerRecord {
  return {
    id: user.id,
    name: user.displayName || user.username,
    factionId: user.factionId,
    lastActiveAt: user.lastActiveAt,
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
    bannerKey: alliance.bannerKey,
    bannerUpdatedAt: alliance.bannerUpdatedAt,
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

function toChronicleEntry(
  entry: AllianceDiplomacyChronicleEntry,
): AllianceDiplomacyChronicleEntryRecord {
  return {
    id: entry.id,
    eventType: entry.eventType,
    actorUserId: entry.actorUserId,
    actorName: entry.actorName,
    firstAllianceId: entry.firstAllianceId,
    firstAllianceName: entry.firstAllianceName,
    secondAllianceId: entry.secondAllianceId,
    secondAllianceName: entry.secondAllianceName,
    relationshipType: entry.relationshipType,
    lordAllianceId: entry.lordAllianceId,
    vassalAllianceId: entry.vassalAllianceId,
    occurredAt: entry.occurredAt,
  };
}

function toAllianceChronicleEntry(
  entry: AllianceChronicleEntry,
): AllianceChronicleEntryRecord {
  return {
    id: entry.id,
    allianceId: entry.allianceId,
    eventType: entry.eventType,
    actorUserId: entry.actorUserId,
    actorName: entry.actorName,
    subjectUserId: entry.subjectUserId,
    subjectName: entry.subjectName,
    metadata: entry.metadata,
    occurredAt: entry.occurredAt,
  };
}

function toNotification(
  notification: AllianceDiplomacyNotification,
): AllianceDiplomacyNotificationRecord {
  return {
    id: notification.id,
    recipientUserId: notification.recipientUserId,
    body: notification.body,
    deliveryKey: notification.deliveryKey,
    createdAt: notification.createdAt,
    deliveredAt: notification.deliveredAt,
    leaseToken: notification.leaseToken,
  };
}

function toAssetDeletion(task: AllianceAssetDeletion): AllianceAssetDeletionRecord {
  return {
    id: task.id,
    assetKey: task.assetKey,
    attempts: task.attempts,
    nextAttemptAt: task.nextAttemptAt,
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

function toProposal(
  proposal: AllianceRelationshipProposal,
): AllianceRelationshipProposalRecord {
  return {
    id: proposal.id,
    firstAllianceId: proposal.firstParty.allianceId!,
    secondAllianceId: proposal.secondParty.allianceId!,
    senderAllianceId: proposal.senderParty.allianceId!,
    recipientAllianceId: proposal.recipientParty.allianceId!,
    type: proposal.type,
    contract: proposal.contract,
    treatAsFriend: proposal.treatAsFriend,
    shareLivePositions: proposal.shareLivePositions,
    createdAt: proposal.createdAt,
  };
}

function toChangeProposal(
  proposal: AllianceRelationshipChangeProposal,
): AllianceRelationshipChangeProposalRecord {
  return {
    id: proposal.id,
    relationshipId: proposal.relationshipId,
    senderAllianceId: proposal.senderParty.allianceId!,
    recipientAllianceId: proposal.recipientParty.allianceId!,
    contract: proposal.contract,
    treatAsFriend: proposal.treatAsFriend,
    shareLivePositions: proposal.shareLivePositions,
    createdAt: proposal.createdAt,
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

  transactionHandle(): AllianceTransactionHandle {
    return this.manager;
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

  async replaceRelationshipsWithWar(
    firstAllianceId: number,
    secondAllianceId: number,
  ) {
    const [firstAllianceIdCanonical, secondAllianceIdCanonical] = [
      Math.min(firstAllianceId, secondAllianceId),
      Math.max(firstAllianceId, secondAllianceId),
    ];
    const parties = await this.manager
      .createQueryBuilder(DiplomacyParty, 'party')
      .where('party.allianceId IN (:...allianceIds)', {
        allianceIds: [firstAllianceIdCanonical, secondAllianceIdCanonical],
      })
      .orderBy('party.allianceId', 'ASC')
      .setLock('pessimistic_write')
      .getMany();
    const partyByAllianceId = new Map(
      parties.map((party) => [party.allianceId, party]),
    );
    const firstParty = partyByAllianceId.get(firstAllianceIdCanonical);
    const secondParty = partyByAllianceId.get(secondAllianceIdCanonical);
    if (!firstParty || !secondParty) {
      throw new Error('Alliance diplomacy parties are missing');
    }
    await this.manager
      .createQueryBuilder()
      .update(AllianceRelationship)
      .set({ endedAt: () => 'CURRENT_TIMESTAMP' })
      .where('endedAt IS NULL')
      .andWhere('"firstPartyId" = :firstPartyId', {
        firstPartyId: firstParty.id,
      })
      .andWhere('"secondPartyId" = :secondPartyId', {
        secondPartyId: secondParty.id,
      })
      .execute();
    await this.manager.delete(AllianceRelationshipProposal, {
      firstPartyId: firstParty.id,
      secondPartyId: secondParty.id,
    });
    await this.manager
      .createQueryBuilder()
      .delete()
      .from(AllianceRelationshipChangeProposal)
      .where(
        '"relationshipId" IN (SELECT id FROM alliance_relationships WHERE "firstPartyId" = :firstPartyId AND "secondPartyId" = :secondPartyId)',
        { firstPartyId: firstParty.id, secondPartyId: secondParty.id },
      )
      .execute();
    await this.manager.insert(AllianceRelationship, {
      firstPartyId: firstParty.id,
      secondPartyId: secondParty.id,
      type: AllianceRelationshipType.WAR,
      contract: '',
      treatAsFriend: false,
      shareLivePositions: false,
      lordPartyId: null,
      vassalPartyId: null,
    });
  }

  async listRelationshipProposals(allianceId: number) {
    const proposals = await this.manager
      .createQueryBuilder(AllianceRelationshipProposal, 'proposal')
      .innerJoinAndSelect('proposal.firstParty', 'firstParty')
      .innerJoinAndSelect('proposal.secondParty', 'secondParty')
      .innerJoinAndSelect('proposal.senderParty', 'senderParty')
      .innerJoinAndSelect('proposal.recipientParty', 'recipientParty')
      .where(
        '(senderParty.allianceId = :allianceId OR recipientParty.allianceId = :allianceId)',
        { allianceId },
      )
      .orderBy('proposal.createdAt', 'DESC')
      .addOrderBy('proposal.id', 'DESC')
      .getMany();
    return proposals.map(toProposal);
  }

  async findRelationshipProposal(id: number) {
    const proposal = await this.manager
      .createQueryBuilder(AllianceRelationshipProposal, 'proposal')
      .innerJoinAndSelect('proposal.firstParty', 'firstParty')
      .innerJoinAndSelect('proposal.secondParty', 'secondParty')
      .innerJoinAndSelect('proposal.senderParty', 'senderParty')
      .innerJoinAndSelect('proposal.recipientParty', 'recipientParty')
      .where('proposal.id = :id', { id })
      .getOne();
    return proposal ? toProposal(proposal) : null;
  }

  async insertRelationshipProposal(data: {
    senderAllianceId: number;
    recipientAllianceId: number;
    type: AllianceRelationshipType;
    contract: string;
    treatAsFriend: boolean;
    shareLivePositions: boolean;
  }) {
    const [firstAllianceId, secondAllianceId] = [
      Math.min(data.senderAllianceId, data.recipientAllianceId),
      Math.max(data.senderAllianceId, data.recipientAllianceId),
    ];
    const partyQuery = this.manager
      .createQueryBuilder(DiplomacyParty, 'party')
      .where('party.allianceId IN (:...allianceIds)', {
        allianceIds: [firstAllianceId, secondAllianceId],
      })
      .orderBy('party.allianceId', 'ASC');
    if (this.inTransaction) {
      partyQuery.setLock('pessimistic_write');
    }
    const parties = await partyQuery.getMany();
    const partyByAllianceId = new Map(
      parties.map((party) => [party.allianceId, party]),
    );
    const firstParty = partyByAllianceId.get(firstAllianceId);
    const secondParty = partyByAllianceId.get(secondAllianceId);
    const senderParty = partyByAllianceId.get(data.senderAllianceId);
    const recipientParty = partyByAllianceId.get(data.recipientAllianceId);
    if (!firstParty || !secondParty || !senderParty || !recipientParty) {
      throw new Error('Alliance diplomacy parties are missing');
    }
    try {
      const result = await this.manager
        .createQueryBuilder()
        .insert()
        .into(AllianceRelationshipProposal)
        .values({
          firstPartyId: firstParty.id,
          secondPartyId: secondParty.id,
          senderPartyId: senderParty.id,
          recipientPartyId: recipientParty.id,
          type: data.type,
          contract: data.contract,
          treatAsFriend: data.treatAsFriend,
          shareLivePositions: data.shareLivePositions,
        })
        .returning('*')
        .execute();
      const proposal = await this.findRelationshipProposal(result.raw[0].id);
      if (!proposal)
        throw new Error('Alliance relationship proposal was not created');
      return proposal;
    } catch (error) {
      const violation = constraintViolation(error);
      if (violation) throw violation;
      throw error;
    }
  }

  async deleteRelationshipProposal(id: number) {
    const result = await this.manager.delete(AllianceRelationshipProposal, id);
    return (result.affected ?? 0) > 0;
  }

  async acceptRelationshipProposal(id: number) {
    const proposal = await this.manager
      .createQueryBuilder(AllianceRelationshipProposal, 'proposal')
      .innerJoinAndSelect('proposal.firstParty', 'firstParty')
      .innerJoinAndSelect('proposal.secondParty', 'secondParty')
      .innerJoinAndSelect('proposal.senderParty', 'senderParty')
      .innerJoinAndSelect('proposal.recipientParty', 'recipientParty')
      .where('proposal.id = :id', { id })
      .setLock('pessimistic_write')
      .getOne();
    if (!proposal) return null;
    await this.manager
      .createQueryBuilder(DiplomacyParty, 'party')
      .where('party.id IN (:...partyIds)', {
        partyIds: [proposal.firstPartyId, proposal.secondPartyId],
      })
      .orderBy('party.id', 'ASC')
      .setLock('pessimistic_write')
      .getMany();
    await this.manager
      .createQueryBuilder()
      .update(AllianceRelationship)
      .set({ endedAt: () => 'CURRENT_TIMESTAMP' })
      .where('endedAt IS NULL')
      .andWhere('"firstPartyId" = :firstPartyId', {
        firstPartyId: proposal.firstPartyId,
      })
      .andWhere('"secondPartyId" = :secondPartyId', {
        secondPartyId: proposal.secondPartyId,
      })
      .execute();
    const insert = await this.manager
      .createQueryBuilder()
      .insert()
      .into(AllianceRelationship)
      .values({
        firstPartyId: proposal.firstPartyId,
        secondPartyId: proposal.secondPartyId,
        type: proposal.type,
        contract: proposal.contract,
        treatAsFriend: proposal.treatAsFriend,
        shareLivePositions: proposal.shareLivePositions,
        lordPartyId:
          proposal.type === AllianceRelationshipType.VASSALAGE
            ? proposal.senderPartyId
            : null,
        vassalPartyId:
          proposal.type === AllianceRelationshipType.VASSALAGE
            ? proposal.recipientPartyId
            : null,
      })
      .returning('*')
      .execute();
    await this.manager.delete(AllianceRelationshipProposal, id);
    const relationship = await this.findActiveRelationship(insert.raw[0].id);
    if (!relationship)
      throw new Error('Alliance relationship proposal was not accepted');
    return relationship;
  }

  async listRelationshipChangeProposals(allianceId: number) {
    const proposals = await this.manager
      .createQueryBuilder(AllianceRelationshipChangeProposal, 'proposal')
      .innerJoinAndSelect('proposal.senderParty', 'senderParty')
      .innerJoinAndSelect('proposal.recipientParty', 'recipientParty')
      .where(
        '(senderParty.allianceId = :allianceId OR recipientParty.allianceId = :allianceId)',
        { allianceId },
      )
      .orderBy('proposal.createdAt', 'DESC')
      .addOrderBy('proposal.id', 'DESC')
      .getMany();
    return proposals.map(toChangeProposal);
  }

  async findRelationshipChangeProposal(id: number) {
    const proposal = await this.manager
      .createQueryBuilder(AllianceRelationshipChangeProposal, 'proposal')
      .innerJoinAndSelect('proposal.senderParty', 'senderParty')
      .innerJoinAndSelect('proposal.recipientParty', 'recipientParty')
      .where('proposal.id = :id', { id })
      .getOne();
    return proposal ? toChangeProposal(proposal) : null;
  }

  async insertRelationshipChangeProposal(data: {
    relationshipId: number;
    senderAllianceId: number;
    recipientAllianceId: number;
    contract: string;
    treatAsFriend: boolean;
    shareLivePositions: boolean;
  }) {
    const parties = await this.manager
      .createQueryBuilder(DiplomacyParty, 'party')
      .where('party.allianceId IN (:...allianceIds)', {
        allianceIds: [data.senderAllianceId, data.recipientAllianceId],
      })
      .orderBy('party.allianceId', 'ASC')
      .setLock('pessimistic_write')
      .getMany();
    const partyByAllianceId = new Map(
      parties.map((party) => [party.allianceId, party]),
    );
    const senderParty = partyByAllianceId.get(data.senderAllianceId);
    const recipientParty = partyByAllianceId.get(data.recipientAllianceId);
    if (!senderParty || !recipientParty) {
      throw new Error('Alliance diplomacy parties are missing');
    }
    await this.manager.findOne(AllianceRelationship, {
      where: { id: data.relationshipId },
      lock: { mode: 'pessimistic_write' },
    });
    try {
      const result = await this.manager
        .createQueryBuilder()
        .insert()
        .into(AllianceRelationshipChangeProposal)
        .values({
          relationshipId: data.relationshipId,
          senderPartyId: senderParty.id,
          recipientPartyId: recipientParty.id,
          contract: data.contract,
          treatAsFriend: data.treatAsFriend,
          shareLivePositions: data.shareLivePositions,
        })
        .returning('*')
        .execute();
      const proposal = await this.findRelationshipChangeProposal(
        result.raw[0].id,
      );
      if (!proposal) {
        throw new Error(
          'Alliance relationship change proposal was not created',
        );
      }
      return proposal;
    } catch (error) {
      const violation = constraintViolation(error);
      if (violation) throw violation;
      throw error;
    }
  }

  async deleteRelationshipChangeProposal(id: number) {
    const result = await this.manager.delete(
      AllianceRelationshipChangeProposal,
      id,
    );
    return (result.affected ?? 0) > 0;
  }

  async acceptRelationshipChangeProposal(id: number) {
    const proposal = await this.manager.findOne(
      AllianceRelationshipChangeProposal,
      {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      },
    );
    if (!proposal) return null;

    const relationship = await this.manager.findOne(AllianceRelationship, {
      where: { id: proposal.relationshipId, endedAt: IsNull() },
      lock: { mode: 'pessimistic_write' },
    });
    if (!relationship) return null;

    const result = await this.manager
      .createQueryBuilder()
      .update(AllianceRelationship)
      .set({
        contract: proposal.contract,
        treatAsFriend: proposal.treatAsFriend,
        shareLivePositions: proposal.shareLivePositions,
      })
      .where('id = :id', { id: relationship.id })
      .andWhere('"endedAt" IS NULL')
      .execute();
    if ((result.affected ?? 0) !== 1) return null;
    await this.manager.delete(AllianceRelationshipChangeProposal, id);
    const updatedRelationship = await this.findActiveRelationship(
      relationship.id,
    );
    if (!updatedRelationship) {
      throw new Error('Alliance relationship change proposal was not accepted');
    }
    return updatedRelationship;
  }

  async appendDiplomacyChronicleEntry(
    data: Omit<AllianceDiplomacyChronicleEntryRecord, 'id' | 'occurredAt'>,
  ) {
    await this.manager.insert(AllianceDiplomacyChronicleEntry, data);
  }

  async appendAllianceChronicleEntry(
    data: Omit<AllianceChronicleEntryRecord, 'id' | 'occurredAt'>,
  ) {
    await this.manager.insert(
      AllianceChronicleEntry,
      data as QueryDeepPartialEntity<AllianceChronicleEntry>,
    );
  }

  async listAllianceChronicleEntries(
    allianceId: number,
    cursor: { occurredAt: Date; id: number } | null,
    limit: number,
  ) {
    const query = this.manager
      .createQueryBuilder(AllianceChronicleEntry, 'entry')
      .where('entry.allianceId = :allianceId', { allianceId })
      .orderBy('entry.occurredAt', 'DESC')
      .addOrderBy('entry.id', 'DESC')
      .take(limit);
    if (cursor) {
      query.andWhere(
        '(entry.occurredAt < :occurredAt OR (entry.occurredAt = :occurredAt AND entry.id < :id))',
        cursor,
      );
    }
    return (await query.getMany()).map(toAllianceChronicleEntry);
  }

  async listDiplomacyChronicleEntries(
    allianceId: number,
    cursor: { occurredAt: Date; id: number } | null,
    limit: number,
  ) {
    const query = this.manager
      .createQueryBuilder(AllianceDiplomacyChronicleEntry, 'entry')
      .where(
        '(entry.firstAllianceId = :allianceId OR entry.secondAllianceId = :allianceId)',
        { allianceId },
      )
      .orderBy('entry.occurredAt', 'DESC')
      .addOrderBy('entry.id', 'DESC')
      .take(limit);
    if (cursor) {
      query.andWhere(
        '(entry.occurredAt < :occurredAt OR (entry.occurredAt = :occurredAt AND entry.id < :id))',
        cursor,
      );
    }
    return (await query.getMany()).map(toChronicleEntry);
  }

  async enqueueDiplomacyNotifications(
    notifications: Array<{ recipientUserId: number; body: string }>,
  ) {
    if (!notifications.length) return;
    await this.manager.insert(
      AllianceDiplomacyNotification,
      notifications.map((notification) => ({
        ...notification,
        deliveryKey: `alliance-diplomacy-notification:${randomUUID()}`,
      })),
    );
  }

  async listPendingDiplomacyNotifications() {
    const notifications = await this.manager.find(
      AllianceDiplomacyNotification,
      {
        where: { deliveredAt: IsNull() },
        order: { id: 'ASC' },
      },
    );
    return notifications.map(toNotification);
  }

  async claimDiplomacyNotifications(limit: number) {
    const candidates = await this.manager.query(
      `SELECT "id"
      FROM "alliance_diplomacy_notifications"
      WHERE "deliveredAt" IS NULL
        AND ("leaseExpiresAt" IS NULL OR "leaseExpiresAt" <= CURRENT_TIMESTAMP)
      ORDER BY "id" ASC
      LIMIT $1
      FOR UPDATE SKIP LOCKED`,
      [limit],
    );
    const notifications: AllianceDiplomacyNotificationRecord[] = [];
    for (const candidate of candidates as Array<{ id: number }>) {
      const leaseToken = randomUUID();
      const result = await this.manager
        .createQueryBuilder()
        .update(AllianceDiplomacyNotification)
        .set({
          leaseToken,
          leaseExpiresAt: () => "CURRENT_TIMESTAMP + INTERVAL '30 seconds'",
        })
        .where('id = :id', { id: candidate.id })
        .andWhere('"deliveredAt" IS NULL')
        .andWhere(
          '("leaseExpiresAt" IS NULL OR "leaseExpiresAt" <= CURRENT_TIMESTAMP)',
        )
        .returning('*')
        .execute();
      const notification = result.raw[0] as
        | AllianceDiplomacyNotification
        | undefined;
      if (notification) notifications.push(toNotification(notification));
    }
    return notifications;
  }

  async markDiplomacyNotificationDelivered(id: number, leaseToken: string) {
    const result = await this.manager
      .createQueryBuilder()
      .update(AllianceDiplomacyNotification)
      .set({
        deliveredAt: () => 'CURRENT_TIMESTAMP',
        leaseToken: null,
        leaseExpiresAt: null,
      })
      .where('id = :id', { id })
      .andWhere('"deliveredAt" IS NULL')
      .andWhere('"leaseToken" = :leaseToken', { leaseToken })
      .execute();
    return (result.affected ?? 0) === 1;
  }

  async releaseDiplomacyNotificationClaim(id: number, leaseToken: string) {
    await this.manager
      .createQueryBuilder()
      .update(AllianceDiplomacyNotification)
      .set({ leaseToken: null, leaseExpiresAt: null })
      .where('id = :id', { id })
      .andWhere('"deliveredAt" IS NULL')
      .andWhere('"leaseToken" = :leaseToken', { leaseToken })
      .execute();
  }

  async enqueueAssetDeletion(assetKey: string) {
    await this.manager
      .createQueryBuilder()
      .insert()
      .into(AllianceAssetDeletion)
      .values({ assetKey, attempts: 0, nextAttemptAt: () => 'now()' })
      .orIgnore()
      .execute();
  }

  async listPendingAssetDeletions() {
    const tasks = await this.manager.find(AllianceAssetDeletion, {
      order: { id: 'ASC' },
    });
    return tasks.map(toAssetDeletion);
  }

  async claimDueAssetDeletions(
    limit: number,
    now: Date,
    backoffMs: (attempts: number) => number,
  ) {
    // One transaction so that the row locks hold until the claim is stored.
    return this.manager.transaction(async (manager) => {
      const candidates: Array<{ id: number }> = await manager.query(
        `SELECT "id" FROM "alliance_asset_deletions"
        WHERE "nextAttemptAt" <= $1
        ORDER BY "id" ASC
        LIMIT $2
        FOR UPDATE SKIP LOCKED`,
        [now, limit],
      );
      const claimed: AllianceAssetDeletionRecord[] = [];
      for (const { id } of candidates) {
        const task = await manager.findOneByOrFail(AllianceAssetDeletion, {
          id,
        });
        task.attempts += 1;
        task.nextAttemptAt = new Date(now.getTime() + backoffMs(task.attempts));
        await manager.save(task);
        claimed.push(toAssetDeletion(task));
      }
      return claimed;
    });
  }

  async completeAssetDeletion(id: number) {
    await this.manager.delete(AllianceAssetDeletion, { id });
  }

  async endNonWarRelationship(id: number) {
    const relationship = await this.manager.findOne(AllianceRelationship, {
      where: {
        id,
        endedAt: IsNull(),
        type: Not(AllianceRelationshipType.WAR),
      },
      lock: { mode: 'pessimistic_write' },
    });
    if (!relationship) return null;
    await this.manager
      .createQueryBuilder(DiplomacyParty, 'party')
      .where('party.id IN (:...partyIds)', {
        partyIds: [relationship.firstPartyId, relationship.secondPartyId],
      })
      .orderBy('party.id', 'ASC')
      .setLock('pessimistic_write')
      .getMany();
    await this.manager
      .createQueryBuilder()
      .update(AllianceRelationship)
      .set({ endedAt: () => 'CURRENT_TIMESTAMP' })
      .where('id = :id', { id })
      .andWhere('endedAt IS NULL')
      .execute();
    await this.manager.delete(AllianceRelationshipProposal, {
      firstPartyId: relationship.firstPartyId,
      secondPartyId: relationship.secondPartyId,
    });
    await this.manager.delete(AllianceRelationshipChangeProposal, {
      relationshipId: relationship.id,
    });
    relationship.endedAt = new Date();
    return toRelationship({
      ...relationship,
      firstParty: { allianceId: relationship.firstPartyId } as DiplomacyParty,
      secondParty: { allianceId: relationship.secondPartyId } as DiplomacyParty,
    });
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
    await this.manager.insert(DiplomacyParty, { allianceId: alliance.id });
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

  async deleteAllAllianceData() {
    // No RESTART IDENTITY: sequences keep counting so removed ids are never
    // reused. Alliances cascade to memberships, applications, forum and
    // internal chronicle. The public chronicle is immutable by row trigger
    // (DELETE is rejected); TRUNCATE does not fire row triggers, is
    // transactional and nothing references that table.
    await this.manager.query(
      'TRUNCATE TABLE "alliance_diplomacy_chronicle_entries"',
    );
    for (const entity of [
      AllianceRelationshipChangeProposal,
      AllianceRelationshipProposal,
      AllianceRelationship,
      DiplomacyParty,
      AllianceDiplomacyNotification,
      AllianceAssetDeletion,
      Alliance,
    ]) {
      await this.manager.createQueryBuilder().delete().from(entity).execute();
    }
  }

  async findMembership(userId: number) {
    const membership = await this.manager.findOneBy(AllianceMembership, {
      userId,
    });
    return membership ? toMembership(membership) : null;
  }

  async findMemberships(userIds: number[]) {
    if (!userIds.length) return [];
    const memberships = await this.manager.findBy(AllianceMembership, {
      userId: In(userIds),
    });
    return memberships.map(toMembership);
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
