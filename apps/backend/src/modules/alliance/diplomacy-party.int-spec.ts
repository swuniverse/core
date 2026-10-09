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
import { diplomacyPartyStoreContract } from './testing/diplomacy-party-store.contract';
import { TypeOrmAllianceStore } from './typeorm-alliance.store';
import { allianceParty, playerParty } from './diplomacy-party';

const FRIENDSHIP = AllianceRelationshipType.FRIENDSHIP;
const noPermissions = { treatAsFriend: false, shareLivePositions: false };

describe('diplomacy party model (Postgres)', () => {
  let dataSource: DataSource;
  let store: TypeOrmAllianceStore;
  let rebels: number;
  let empire: number;

  beforeAll(async () => {
    dataSource = await connectIntegrationDatabase();
  });
  afterAll(() => dataSource.destroy());

  const user = (faction: 'REBELS' | 'EMPIRE' = 'REBELS') =>
    createUser(dataSource, {
      faction:
        faction === 'REBELS' ? Faction.REBEL_ALLIANCE : Faction.GALACTIC_EMPIRE,
      factionId: faction === 'REBELS' ? rebels : empire,
    });

  async function allianceOf(faction: 'REBELS' | 'EMPIRE' = 'REBELS') {
    const president = await user(faction);
    const created = await store.insertAlliance({
      name: `Alliance of ${president.id}`,
      description: '',
      factionId: faction === 'REBELS' ? rebels : empire,
    });
    await store.insertMembership({
      allianceId: created.id,
      userId: president.id,
      role: AllianceRole.PRESIDENT,
    });
    return created.id;
  }

  async function reset() {
    await resetDatabase(dataSource);
    rebels = await factionId(dataSource, Faction.REBEL_ALLIANCE);
    empire = await factionId(dataSource, Faction.GALACTIC_EMPIRE);
    store = new TypeOrmAllianceStore(dataSource);
  }

  async function propose(first: number, second: number, via = store) {
    return via.insertRelationshipProposal({
      senderParty: playerParty(first),
      recipientParty: playerParty(second),
      type: FRIENDSHIP,
      contract: '',
      ...noPermissions,
    });
  }

  async function partyRowId(userId: number) {
    const [row] = await dataSource.query(
      'SELECT "id" FROM "diplomacy_parties" WHERE "userId" = $1',
      [userId],
    );
    return row?.id as number | undefined;
  }

  diplomacyPartyStoreContract(async () => {
    await reset();
    return {
      store,
      player: async (faction: 'REBELS' | 'EMPIRE' = 'REBELS') =>
        (await user(faction)).id,
      alliance: (faction: 'REBELS' | 'EMPIRE' = 'REBELS') =>
        allianceOf(faction),
    };
  });

  describe('database rules for player parties', () => {
    beforeEach(reset);

    it('creates a player party lazily with the first proposal and reuses it', async () => {
      const first = await user();
      expect(await partyRowId(first.id)).toBeUndefined();

      await propose(first.id, (await user()).id);
      await propose(first.id, (await user()).id);

      expect(
        await dataSource.query(
          'SELECT 1 FROM "diplomacy_parties" WHERE "userId" = $1',
          [first.id],
        ),
      ).toHaveLength(1);
    });

    it('serializes simultaneous first proposals of the same player into one party row', async () => {
      const first = await user();
      const others = [await user(), await user(), await user()];

      const results = await Promise.allSettled(
        others.map((other) =>
          propose(first.id, other.id, new TypeOrmAllianceStore(dataSource)),
        ),
      );

      expect(results.map((result) => result.status)).toEqual([
        'fulfilled',
        'fulfilled',
        'fulfilled',
      ]);
      expect(
        await dataSource.query(
          'SELECT 1 FROM "diplomacy_parties" WHERE "userId" = $1',
          [first.id],
        ),
      ).toHaveLength(1);
    });

    it('rejects relationship rows across factions and with identical parties', async () => {
      const rebel = await user('REBELS');
      const imperial = await user('EMPIRE');
      await propose(rebel.id, (await user()).id);
      const rebelParty = (await partyRowId(rebel.id))!;
      await dataSource.query(
        'INSERT INTO "diplomacy_parties" ("userId") VALUES ($1)',
        [imperial.id],
      );
      const imperialParty = (await partyRowId(imperial.id))!;
      const [low, high] = [rebelParty, imperialParty].sort((a, b) => a - b);

      await expect(
        dataSource.query(
          `INSERT INTO "alliance_relationships" ("firstPartyId", "secondPartyId", "type") VALUES ($1, $2, 'PEACE')`,
          [low, high],
        ),
      ).rejects.toMatchObject({
        message: expect.stringContaining('same faction'),
      });
      await expect(
        dataSource.query(
          `INSERT INTO "alliance_relationships" ("firstPartyId", "secondPartyId", "type") VALUES ($1, $1, 'PEACE')`,
          [rebelParty],
        ),
      ).rejects.toThrow();
    });

    it('stores player parties in immutable chronicle entries that survive account deletion', async () => {
      const leia = await user();
      const group = await allianceOf();
      await store.appendDiplomacyChronicleEntry({
        eventType: 'RELATIONSHIP_ENDED' as never,
        actorUserId: null,
        actorName: null,
        firstParty: playerParty(leia.id),
        firstPartyName: 'Leia Organa '.repeat(15).trim(),
        secondParty: allianceParty(group),
        secondPartyName: 'Rogue Squadron',
        relationshipType: FRIENDSHIP,
        lordParty: null,
        vassalParty: null,
        endReason: 'PARTY_JOINED_ALLIANCE' as never,
      });
      const [entry] = await dataSource.query(
        'SELECT * FROM "alliance_diplomacy_chronicle_entries"',
      );

      await expect(
        dataSource.query(
          'UPDATE "alliance_diplomacy_chronicle_entries" SET "endReason" = NULL WHERE "id" = $1',
          [entry.id],
        ),
      ).rejects.toMatchObject({
        message: expect.stringContaining('immutable'),
      });
      await expect(
        dataSource.query(
          'DELETE FROM "alliance_diplomacy_chronicle_entries" WHERE "id" = $1',
          [entry.id],
        ),
      ).rejects.toMatchObject({
        message: expect.stringContaining('immutable'),
      });
      await dataSource.getRepository(User).delete({ id: leia.id });
      expect(
        await dataSource.query(
          'SELECT 1 FROM "alliance_diplomacy_chronicle_entries"',
        ),
      ).toHaveLength(1);
    });

    it('removes the party and its relationships with the account', async () => {
      const leia = await user();
      const mon = await user();
      const proposal = await propose(leia.id, mon.id);
      await store.transaction((tx) =>
        tx.acceptRelationshipProposal(proposal.id),
      );

      await dataSource.getRepository(User).delete({ id: leia.id });

      expect(await partyRowId(leia.id)).toBeUndefined();
      expect(await store.listActiveRelationships(playerParty(mon.id))).toEqual(
        [],
      );
    });
  });
});
