import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  AllianceDiplomacyChronicleEndReason,
  AllianceRelationshipType,
  AllianceRole,
  Faction,
} from '@swuniverse/shared';
import {
  connectIntegrationDatabase,
  createUser,
  factionId,
  resetDatabase,
} from '../../testing/integration/database';
import { User } from '../auth/user.entity';
import { AllianceService } from './alliance.service';
import { playerParty } from './diplomacy-party';
import { TypeOrmAllianceStore } from './typeorm-alliance.store';

const { FRIENDSHIP, WAR } = AllianceRelationshipType;

/**
 * Party change (founding / joining an alliance) on real Postgres, including
 * the races against war, proposals and a concurrent acceptance.
 */
describe('alliance party change (Postgres)', () => {
  let dataSource: DataSource;
  let store: TypeOrmAllianceStore;
  let service: AllianceService;
  let sendSystem: jest.Mock;
  let rebels: number;

  beforeAll(async () => {
    dataSource = await connectIntegrationDatabase();
  });
  afterAll(() => dataSource.destroy());

  async function reset() {
    await resetDatabase(dataSource);
    rebels = await factionId(dataSource, Faction.REBEL_ALLIANCE);
    store = new TypeOrmAllianceStore(dataSource);
    sendSystem = jest.fn().mockResolvedValue(undefined);
    service = new AllianceService(store, { sendSystem } as never);
  }

  beforeEach(reset);

  const rebel = (name: string) =>
    createUser(dataSource, {
      username: name,
      displayName: name,
      faction: Faction.REBEL_ALLIANCE,
      factionId: rebels,
    });

  async function alliance(name: string, president: User) {
    const created = await store.insertAlliance({
      name,
      description: '',
      factionId: rebels,
    });
    await store.updateAlliance(created.id, { acceptsApplications: true });
    await store.insertMembership({
      allianceId: created.id,
      userId: president.id,
      role: AllianceRole.PRESIDENT,
    });
    return created;
  }

  async function friends(first: User, second: User) {
    const { id } = await service.proposeSettlerRelationship(first.id, {
      recipientPlayerId: second.id,
      type: FRIENDSHIP,
      contract: 'geheim',
    });
    await service.acceptRelationshipProposal(second.id, id);
  }

  const activeOf = (user: User) =>
    store.listActiveRelationships(playerParty(user.id));
  const proposalsOf = (user: User) =>
    store.listRelationshipProposals(playerParty(user.id));
  const count = async (table: string) =>
    Number(
      (await dataSource.query(`SELECT COUNT(*) AS n FROM "${table}"`))[0].n,
    );
  const outcomes = (work: Array<Promise<unknown>>) =>
    Promise.allSettled(work).then((results) => results.map((r) => r.status));

  /** Lando is friends with Han, Han is at war with Chewie, Chewie proposes to Han. */
  async function giveDiplomacy(han: User, lando: User, chewie: User) {
    await friends(lando, han);
    await service.declareSettlerWar(han.id, chewie.id);
    await service.proposeSettlerRelationship(chewie.id, {
      recipientPlayerId: han.id,
      type: AllianceRelationshipType.PEACE,
    });
  }

  it('founding ends relationships, proposals and changes atomically and keeps a chronicle without the contract', async () => {
    const han = await rebel('Han');
    const lando = await rebel('Lando');
    const chewie = await rebel('Chewie');
    await giveDiplomacy(han, lando, chewie);
    const friendship = (await activeOf(han)).find((r) => r.type === FRIENDSHIP);
    await service.proposeRelationshipChange(lando.id, friendship!.id, {
      permissions: { treatAsFriend: true },
    } as never);
    sendSystem.mockClear();

    await service.found(han.id, { name: 'Neue Hoffnung', description: '' });

    expect(await activeOf(han)).toEqual([]);
    expect(await proposalsOf(han)).toEqual([]);
    expect(await count('alliance_relationship_change_proposals')).toBe(0);
    const entries = await store.listDiplomacyChronicleEntries(
      playerParty(han.id),
      null,
      50,
    );
    const ended = entries.filter(
      (e) =>
        e.endReason ===
        AllianceDiplomacyChronicleEndReason.PARTY_JOINED_ALLIANCE,
    );
    expect(ended.map((e) => e.relationshipType).sort()).toEqual(
      [FRIENDSHIP, WAR].sort(),
    );
    expect(JSON.stringify(entries)).not.toContain('geheim');
    const recipients = sendSystem.mock.calls.map(([to]) => to);
    expect(recipients.filter((to) => to === lando.id)).toHaveLength(1);
    expect(recipients.filter((to) => to === chewie.id)).toHaveLength(2);
    expect(recipients).not.toContain(han.id);
  });

  it('acceptance of an application ends the diplomacy of the applicant only', async () => {
    const han = await rebel('Han');
    const lando = await rebel('Lando');
    const chewie = await rebel('Chewie');
    const leia = await rebel('Leia');
    const rogue = await alliance('Rogue Squadron', leia);
    await giveDiplomacy(han, lando, chewie);
    await service.declareSettlerWar(lando.id, chewie.id);
    await service.apply(han.id, rogue.id);
    const [application] = await store.listApplicationsForAlliance(rogue.id);

    await service.acceptApplication(leia.id, application.id);

    expect(await activeOf(han)).toEqual([]);
    expect(await proposalsOf(han)).toEqual([]);
    expect(await activeOf(lando)).toHaveLength(1);
    expect(await store.findMembership(han.id)).not.toBeNull();
  });

  it('rolls the join back when the diplomacy cannot be ended', async () => {
    const han = await rebel('Han');
    const lando = await rebel('Lando');
    const chewie = await rebel('Chewie');
    await giveDiplomacy(han, lando, chewie);
    sendSystem.mockClear();
    // The method lives on the session base class that transactions use.
    const sessionPrototype = Object.getPrototypeOf(
      TypeOrmAllianceStore.prototype,
    );
    const spy = jest
      .spyOn(sessionPrototype, 'endPlayerPartyDiplomacy')
      .mockRejectedValueOnce(new Error('boom'));

    await expect(
      service.found(han.id, { name: 'Neue Hoffnung', description: '' }),
    ).rejects.toThrow('boom');
    spy.mockRestore();

    expect(await store.findMembership(han.id)).toBeNull();
    expect(await count('alliances')).toBe(0);
    expect(await activeOf(han)).toHaveLength(2);
    expect(sendSystem).not.toHaveBeenCalled();
  });

  it('serialises founding against a concurrent war declaration: no personal relationship survives', async () => {
    for (let round = 0; round < 5; round += 1) {
      await reset();
      const han = await rebel(`Han${round}`);
      const chewie = await rebel(`Chewie${round}`);

      const results = await outcomes([
        service.found(han.id, { name: `Allianz ${round}`, description: '' }),
        service.declareSettlerWar(chewie.id, han.id),
      ]);

      expect(results[0]).toBe('fulfilled');
      expect(await store.findMembership(han.id)).not.toBeNull();
      expect(await activeOf(han)).toEqual([]);
    }
  });

  it('serialises founding against a concurrent accept and a concurrent proposal', async () => {
    for (let round = 0; round < 5; round += 1) {
      await reset();
      const han = await rebel(`Han${round}`);
      const lando = await rebel(`Lando${round}`);
      const chewie = await rebel(`Chewie${round}`);
      const { id: proposalId } = await service.proposeSettlerRelationship(
        lando.id,
        { recipientPlayerId: han.id, type: FRIENDSHIP },
      );

      const results = await outcomes([
        service.found(han.id, { name: `Allianz ${round}`, description: '' }),
        service.acceptRelationshipProposal(han.id, proposalId),
        service.proposeSettlerRelationship(chewie.id, {
          recipientPlayerId: han.id,
          type: FRIENDSHIP,
        }),
      ]);

      expect(results[0]).toBe('fulfilled');
      expect(await activeOf(han)).toEqual([]);
      expect(await proposalsOf(han)).toEqual([]);
    }
  });

  it('serialises acceptance of an application against a war declared by another alliance', async () => {
    for (let round = 0; round < 5; round += 1) {
      await reset();
      const han = await rebel(`Han${round}`);
      const leia = await rebel(`Leia${round}`);
      const ackbar = await rebel(`Ackbar${round}`);
      const rogue = await alliance(`Rogue ${round}`, leia);
      const phoenix = await alliance(`Phoenix ${round}`, ackbar);
      await service.apply(han.id, rogue.id);
      const [application] = await store.listApplicationsForAlliance(rogue.id);

      const results = await outcomes([
        service.acceptApplication(leia.id, application.id),
        service.declareWarOnSettler(ackbar.id, phoenix.id, han.id),
      ]);

      expect(results[0]).toBe('fulfilled');
      expect(await activeOf(han)).toEqual([]);
    }
  });
  it('two simultaneous Siedler proposals for one pair leave exactly one pending proposal and no raw database error', async () => {
    for (let round = 0; round < 5; round += 1) {
      await reset();
      const han = await rebel(`Han${round}`);
      const lando = await rebel(`Lando${round}`);

      const results = await Promise.allSettled([
        service.proposeSettlerRelationship(han.id, {
          recipientPlayerId: lando.id,
          type: FRIENDSHIP,
        }),
        service.proposeSettlerRelationship(lando.id, {
          recipientPlayerId: han.id,
          type: FRIENDSHIP,
        }),
      ]);

      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      const [rejected] = results.filter(
        (r): r is PromiseRejectedResult => r.status === 'rejected',
      );
      expect(rejected.reason).toBeInstanceOf(BadRequestException);
      expect(await proposalsOf(han)).toHaveLength(1);
      expect(await proposalsOf(lando)).toHaveLength(1);
      expect(await count('alliance_relationship_proposals')).toBe(1);
    }
  });

  it('a dissolved alliance leaves its former members without personal relationships', async () => {
    const han = await rebel('Han');
    const lando = await rebel('Lando');
    const chewie = await rebel('Chewie');
    await friends(han, lando);
    await service.declareSettlerWar(lando.id, chewie.id);
    const { id: allianceId } = await service.found(han.id, {
      name: 'Neue Hoffnung',
      description: '',
    });
    await store.updateAlliance(allianceId, { acceptsApplications: true });
    await service.apply(lando.id, allianceId);
    const [application] = await store.listApplicationsForAlliance(allianceId);
    await service.acceptApplication(han.id, application.id);

    await service.dissolve(han.id, allianceId);

    expect(await store.findMembership(han.id)).toBeNull();
    expect(await store.findMembership(lando.id)).toBeNull();
    expect(await activeOf(han)).toEqual([]);
    expect(await activeOf(lando)).toEqual([]);
    expect(await proposalsOf(han)).toEqual([]);
    // Chewie's war with Lando ended when Lando joined; nothing was restored.
    expect(await activeOf(chewie)).toEqual([]);
    const [{ n }] = await dataSource.query(
      'SELECT COUNT(*) AS n FROM "alliance_relationships" WHERE "endedAt" IS NULL',
    );
    expect(Number(n)).toBe(0);
  });
});
