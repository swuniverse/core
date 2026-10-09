import { DataSource } from 'typeorm';
import {
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
import { AllianceContextCleanup } from './alliance-context-cleanup';
import { AllianceResetService } from './alliance-reset.service';
import { AllianceService } from './alliance.service';
import { ForumService } from './forum.service';
import { InMemoryAssetStorage } from './testing/in-memory-asset-storage';
import { TypeOrmAllianceStore } from './typeorm-alliance.store';
import { TypeOrmForumStore } from './typeorm-forum.store';

const { NONE, PRESIDENT } = AllianceRole;

describe('alliance reset (Postgres)', () => {
  let dataSource: DataSource;
  let store: TypeOrmAllianceStore;
  let allianceService: AllianceService;
  let forum: ForumService;
  let assets: InMemoryAssetStorage;
  let cleanup: AllianceContextCleanup;
  let reset: AllianceResetService;
  let rebels: number;

  beforeAll(async () => {
    dataSource = await connectIntegrationDatabase();
  });
  afterAll(() => dataSource.destroy());

  beforeEach(async () => {
    await resetDatabase(dataSource);
    rebels = await factionId(dataSource, Faction.REBEL_ALLIANCE);
    store = new TypeOrmAllianceStore(dataSource);
    allianceService = new AllianceService(store, {
      sendSystem: jest.fn().mockResolvedValue(undefined),
    } as never);
    forum = new ForumService(new TypeOrmForumStore(dataSource));
    assets = new InMemoryAssetStorage();
    cleanup = new AllianceContextCleanup();
    reset = new AllianceResetService(store, assets, cleanup);
  });

  const rebel = (name: string): Promise<User> =>
    createUser(dataSource, {
      username: name,
      displayName: name,
      faction: Faction.REBEL_ALLIANCE,
      factionId: rebels,
    });

  async function alliance(name: string, president: User, others: User[] = []) {
    const created = await store.insertAlliance({
      name,
      description: '',
      factionId: rebels,
    });
    await store.insertMembership({
      allianceId: created.id,
      userId: president.id,
      role: PRESIDENT,
    });
    for (const user of others) {
      await store.insertMembership({
        allianceId: created.id,
        userId: user.id,
        role: NONE,
      });
    }
    return created;
  }

  const count = async (table: string) =>
    Number(
      (await dataSource.query(`SELECT COUNT(*) AS n FROM "${table}"`))[0].n,
    );

  const TABLES = [
    'alliances',
    'alliance_memberships',
    'alliance_applications',
    'diplomacy_parties',
    'alliance_relationships',
    'alliance_relationship_proposals',
    'alliance_relationship_change_proposals',
    'alliance_diplomacy_chronicle_entries',
    'alliance_chronicle_entries',
    'alliance_diplomacy_notifications',
    'alliance_asset_deletions',
    'alliance_forum_boards',
    'alliance_forum_topics',
    'alliance_forum_posts',
  ];

  async function populate() {
    const leia = await rebel('leia');
    const han = await rebel('han');
    const mon = await rebel('mon');
    const applicant = await rebel('lando');
    const rogue = await alliance('Rogue Squadron', leia, [han]);
    const red = await alliance('Red Squadron', mon);
    await store.insertApplication({
      allianceId: rogue.id,
      userId: applicant.id,
    });
    const proposal = await allianceService.proposeRelationship(
      leia.id,
      rogue.id,
      {
        recipientAllianceId: red.id,
        type: AllianceRelationshipType.ALLIANCE,
        contract: 'Vertrag',
        permissions: { treatAsFriend: true, shareLivePositions: true },
      },
    );
    await allianceService.acceptRelationshipProposal(mon.id, proposal.id);
    const [relationship] = await store.listActiveRelationships(rogue.id);
    await allianceService.proposeRelationshipChange(leia.id, relationship.id, {
      contract: 'Neu',
    });
    const board = await forum.createBoard(leia.id, rogue.id, { name: 'Board' });
    const { topicId } = await forum.createTopic(leia.id, rogue.id, board.id, {
      title: 'Thema',
      text: 'Text',
    });
    await forum.createPost(han.id, rogue.id, topicId, { text: 'Antwort' });
    await store.appendAllianceChronicleEntry({
      allianceId: rogue.id,
      eventType: 'MEMBER_JOINED' as never,
      actorUserId: han.id,
      actorName: 'han',
      subjectUserId: han.id,
      subjectName: 'han',
      metadata: null,
    });
    await store.enqueueDiplomacyNotifications([
      { recipientUserId: han.id, body: 'x' },
    ]);
    await store.enqueueAssetDeletion('c'.repeat(32));
    await assets.save('a'.repeat(32), Buffer.from('banner'));
    await assets.save('b'.repeat(32), Buffer.from('orphan'));
    return { rogue, red, leia };
  }

  it('removes all alliance data and all assets, twice in a row', async () => {
    await populate();
    expect(await count('alliance_diplomacy_chronicle_entries')).toBeGreaterThan(
      0,
    );
    expect(await count('diplomacy_parties')).toBeGreaterThan(0);

    await reset.resetAllianceData();
    await reset.resetAllianceData();

    for (const table of TABLES)
      expect([table, await count(table)]).toEqual([table, 0]);
    expect(assets.size).toBe(0);
    expect(await count('users')).toBe(4);
  });

  it('notifies consumers inside the transaction and rolls back when one fails', async () => {
    await populate();
    let fail = true;
    cleanup.register({
      reset: async ({ transaction }) => {
        await (transaction as import('typeorm').EntityManager).query(
          'SELECT 1',
        );
        if (fail) throw new Error('consumer failed');
      },
    });

    await expect(reset.resetAllianceData()).rejects.toThrow('consumer failed');
    expect(await count('alliances')).toBe(2);
    expect(assets.size).toBe(2);

    fail = false;
    await reset.resetAllianceData();
    expect(await count('alliances')).toBe(0);
  });

  it('never reuses removed ids, so stale rights cannot hit a new alliance', async () => {
    const { rogue, red, leia } = await populate();
    // A consumer-held assignment keyed on the old alliance id.
    await reset.resetAllianceData();

    const fresh = await alliance('New Squadron', leia);

    expect(fresh.id).toBeGreaterThan(Math.max(rogue.id, red.id));
    const [party] = await dataSource.query(
      'SELECT id FROM diplomacy_parties WHERE "allianceId" = $1',
      [rogue.id],
    );
    expect(party).toBeUndefined();
  });
});
