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

    /** Party rows for a Siedler and an alliance of the same faction, lower id first. */
    async function mixedPair() {
      const settler = await user();
      const group = await allianceOf();
      await dataSource.query(
        'INSERT INTO "diplomacy_parties" ("userId") VALUES ($1)',
        [settler.id],
      );
      const [{ id: allianceRow }] = await dataSource.query(
        'SELECT "id" FROM "diplomacy_parties" WHERE "allianceId" = $1',
        [group],
      );
      const settlerRow = (await partyRowId(settler.id))!;
      const [low, high] = [settlerRow, allianceRow as number].sort(
        (a, b) => a - b,
      );
      return {
        settler,
        group,
        settlerRow,
        allianceRow: allianceRow as number,
        low,
        high,
      };
    }

    const insertRelationship = (
      first: number,
      second: number,
      type: string,
      extra: { lord?: number; vassal?: number } = {},
    ) =>
      dataSource.query(
        `INSERT INTO "alliance_relationships" ("firstPartyId", "secondPartyId", "type", "lordPartyId", "vassalPartyId") VALUES ($1, $2, $3, $4, $5)`,
        [first, second, type, extra.lord ?? null, extra.vassal ?? null],
      );

    it('allows one active relationship per mixed pair and a new one after it ended', async () => {
      const { low, high } = await mixedPair();
      await insertRelationship(low, high, 'FRIENDSHIP');

      await expect(insertRelationship(low, high, 'WAR')).rejects.toMatchObject({
        code: '23505',
      });

      await dataSource.query(
        'UPDATE "alliance_relationships" SET "endedAt" = now()',
      );
      await insertRelationship(low, high, 'WAR');
    });

    it('keeps vassalage consistent for a Siedler and an alliance', async () => {
      const { settlerRow, allianceRow, low, high } = await mixedPair();

      // No lord / vassal, or both on the same side, or a stranger: invalid.
      await expect(
        insertRelationship(low, high, 'VASSALAGE'),
      ).rejects.toMatchObject({ code: '23514' });
      await expect(
        insertRelationship(low, high, 'VASSALAGE', {
          lord: settlerRow,
          vassal: settlerRow,
        }),
      ).rejects.toMatchObject({ code: '23514' });
      await expect(
        insertRelationship(low, high, 'FRIENDSHIP', {
          lord: settlerRow,
          vassal: allianceRow,
        }),
      ).rejects.toMatchObject({ code: '23514' });

      await insertRelationship(low, high, 'VASSALAGE', {
        lord: allianceRow,
        vassal: settlerRow,
      });
    });

    it('rejects a proposal between a Siedler and an alliance of the other faction and a self-proposal', async () => {
      const rebel = await user('REBELS');
      const imperialGroup = await allianceOf('EMPIRE');

      await expect(
        store.insertRelationshipProposal({
          senderParty: playerParty(rebel.id),
          recipientParty: allianceParty(imperialGroup),
          type: FRIENDSHIP,
          contract: '',
          ...noPermissions,
        }),
      ).rejects.toThrow();
      await expect(
        store.insertRelationshipProposal({
          senderParty: playerParty(rebel.id),
          recipientParty: playerParty(rebel.id),
          type: FRIENDSHIP,
          contract: '',
          ...noPermissions,
        }),
      ).rejects.toThrow();
      expect(
        await store.listRelationshipProposals(playerParty(rebel.id)),
      ).toEqual([]);
    });

    it('account deletion removes the party with relationships, proposals and change proposals but keeps the chronicle', async () => {
      const leia = await user();
      const mon = await user();
      const wedge = await user();
      const proposal = await propose(leia.id, mon.id);
      const friendship = await store.transaction((tx) =>
        tx.acceptRelationshipProposal(proposal.id),
      );
      await store.insertRelationshipChangeProposal({
        relationshipId: friendship!.id,
        senderParty: playerParty(mon.id),
        recipientParty: playerParty(leia.id),
        contract: 'neu',
        ...noPermissions,
      });
      await propose(wedge.id, leia.id);
      await store.appendDiplomacyChronicleEntry({
        eventType: 'RELATIONSHIP_STARTED' as never,
        actorUserId: leia.id,
        actorName: 'Leia',
        firstParty: playerParty(leia.id),
        firstPartyName: 'Leia',
        secondParty: playerParty(mon.id),
        secondPartyName: 'Mon',
        relationshipType: FRIENDSHIP,
        lordParty: null,
        vassalParty: null,
        endReason: null,
      });

      await dataSource.getRepository(User).delete({ id: leia.id });

      expect(await partyRowId(leia.id)).toBeUndefined();
      const rows = (table: string) =>
        dataSource.query(`SELECT 1 FROM "${table}"`);
      expect(await rows('alliance_relationships')).toHaveLength(0);
      expect(await rows('alliance_relationship_proposals')).toHaveLength(0);
      expect(await rows('alliance_relationship_change_proposals')).toHaveLength(
        0,
      );
      expect(
        await store.listRelationshipProposals(playerParty(wedge.id)),
      ).toEqual([]);
      expect(await rows('alliance_diplomacy_chronicle_entries')).toHaveLength(
        1,
      );
      // Other parties stay untouched and still usable.
      expect(await partyRowId(mon.id)).toBeDefined();
    });
  });
});
