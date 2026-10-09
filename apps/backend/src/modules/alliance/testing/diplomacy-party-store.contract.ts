import {
  AllianceRelationshipType,
  DiplomacyPartyType,
} from '@swuniverse/shared';
import {
  AllianceConstraintViolation,
  type AllianceStore,
} from '../alliance.store';
import { allianceParty, playerParty, type PartyRef } from '../diplomacy-party';

/** Test-side world builder; each implementation maps this to its own setup. */
export interface PartyStoreWorld {
  store: AllianceStore;
  /** Creates a player; `faction` defaults to the Rebels. */
  player(faction?: 'REBELS' | 'EMPIRE'): Promise<number>;
  /** Creates an alliance (with a fresh president); returns the alliance ID. */
  alliance(faction?: 'REBELS' | 'EMPIRE'): Promise<number>;
}

const FRIENDSHIP = AllianceRelationshipType.FRIENDSHIP;
const noPermissions = { treatAsFriend: false, shareLivePositions: false };

/**
 * Behaviour every {@link AllianceStore} must show for relationships between
 * alliances and alliance-less players (party model). Run against the
 * in-memory store and against Postgres.
 */
export function diplomacyPartyStoreContract(
  makeWorld: () => Promise<PartyStoreWorld>,
): void {
  let world: PartyStoreWorld;
  let store: AllianceStore;

  beforeEach(async () => {
    world = await makeWorld();
    store = world.store;
  });

  /**
   * Like `it`, but runs the body in one store transaction, the way the
   * service uses the store (row locks need a transaction).
   */
  function scenario(name: string, body: () => Promise<void>) {
    it(name, () =>
      world.store.transaction(async (tx) => {
        store = tx;
        await body();
      }),
    );
  }

  async function befriend(
    first: PartyRef,
    second: PartyRef,
    type: AllianceRelationshipType = FRIENDSHIP,
  ) {
    const proposal = await store.insertRelationshipProposal({
      senderParty: first,
      recipientParty: second,
      type,
      contract: '',
      ...noPermissions,
    });
    const relationship = await store.acceptRelationshipProposal(proposal.id);
    if (!relationship) throw new Error('proposal was not accepted');
    return relationship;
  }

  /** Players are created first, so the first alliance ID may equal a player ID. */
  async function collidingIds() {
    const players = [
      await world.player(),
      await world.player(),
      await world.player(),
    ];
    // Burn IDs until an alliance ID collides with the first player's ID.
    let alliance = await world.alliance();
    for (let i = 0; i < 20 && !players.includes(alliance); i += 1) {
      alliance = await world.alliance();
    }
    return { players, alliance };
  }

  scenario('keeps a player party distinct from an alliance party with the same numeric ID', async () => {
    const { players, alliance } = await collidingIds();
    const playerId = players.includes(alliance) ? alliance : players[0];
    const player = playerParty(playerId);
    const group = allianceParty(alliance);

    const relationship = await befriend(player, group);

    expect(relationship.type).toBe(FRIENDSHIP);
    expect([relationship.firstParty, relationship.secondParty]).toEqual(
      expect.arrayContaining([player, group]),
    );
    expect(await store.listActiveRelationships(player)).toHaveLength(1);
    expect(await store.listActiveRelationships(group)).toHaveLength(1);
    if (playerId === alliance) {
      // Same number, other type: the player party must not see the alliance's rows
      // and vice versa, so exactly one relationship exists for each.
      expect(await store.listActiveRelationships(player)).toEqual(
        await store.listActiveRelationships(group),
      );
    }
    // The bare number is shorthand for an alliance party.
    expect(await store.listActiveRelationships(alliance)).toEqual(
      await store.listActiveRelationships(group),
    );
    expect(
      await store.listActiveRelationships(playerParty(players[1])),
    ).toEqual([]);
  });

  scenario('lets two players of the same faction form a relationship and finds it from both sides', async () => {
    const first = playerParty(await world.player());
    const second = playerParty(await world.player());

    const relationship = await befriend(second, first);

    expect(relationship.firstParty).not.toEqual(relationship.secondParty);
    expect(await store.listActiveRelationships(first)).toEqual([
      expect.objectContaining({ id: relationship.id }),
    ]);
    expect(await store.listActiveRelationships(second)).toEqual([
      expect.objectContaining({ id: relationship.id }),
    ]);
    expect(await store.findActiveRelationship(relationship.id)).toMatchObject({
      id: relationship.id,
    });
  });

  scenario('keeps the direction of a vassalage between a player lord and an alliance vassal', async () => {
    const lord = playerParty(await world.player());
    const vassal = allianceParty(await world.alliance());

    const relationship = await befriend(
      lord,
      vassal,
      AllianceRelationshipType.VASSALAGE,
    );

    expect(relationship.lordParty).toEqual(lord);
    expect(relationship.vassalParty).toEqual(vassal);
    expect(relationship.lordAllianceId).toBeNull();
    expect(relationship.vassalAllianceId).toBe(vassal.id);
  });

  it('allows one pending proposal per pair regardless of direction or party type', async () => {
    const player = playerParty(await world.player());
    const group = allianceParty(await world.alliance());
    await store.insertRelationshipProposal({
      senderParty: player,
      recipientParty: group,
      type: FRIENDSHIP,
      contract: '',
      ...noPermissions,
    });

    await expect(
      store.insertRelationshipProposal({
        senderParty: group,
        recipientParty: player,
        type: AllianceRelationshipType.TRADE_AGREEMENT,
        contract: '',
        ...noPermissions,
      }),
    ).rejects.toEqual(new AllianceConstraintViolation('relationship_proposal'));
    expect(await store.listRelationshipProposals(player)).toEqual([
      expect.objectContaining({ senderParty: player, recipientParty: group }),
    ]);
    expect(await store.listRelationshipProposals(group)).toHaveLength(1);
  });

  it('rejects a proposal across factions', async () => {
    const rebel = playerParty(await world.player('REBELS'));
    const empire = allianceParty(await world.alliance('EMPIRE'));

    await expect(
      store.insertRelationshipProposal({
        senderParty: rebel,
        recipientParty: empire,
        type: FRIENDSHIP,
        contract: '',
        ...noPermissions,
      }),
    ).rejects.toThrow();
    expect(await store.listRelationshipProposals(rebel)).toEqual([]);
  });

  scenario('lets war replace the relationship, proposals and pending changes of a mixed pair', async () => {
    const player = playerParty(await world.player());
    const group = allianceParty(await world.alliance());
    const friendship = await befriend(player, group);
    await store.insertRelationshipChangeProposal({
      relationshipId: friendship.id,
      senderParty: group,
      recipientParty: player,
      contract: 'neu',
      ...noPermissions,
    });
    await store.insertRelationshipProposal({
      senderParty: player,
      recipientParty: group,
      type: AllianceRelationshipType.ALLIANCE,
      contract: '',
      ...noPermissions,
    });

    await store.replaceRelationshipsWithWar(group, player);

    expect(await store.listActiveRelationships(player)).toEqual([
      expect.objectContaining({ type: AllianceRelationshipType.WAR }),
    ]);
    expect(await store.listRelationshipProposals(player)).toEqual([]);
    expect(await store.listRelationshipChangeProposals(player)).toEqual([]);
    expect(await store.findActiveRelationship(friendship.id)).toBeNull();
  });

  scenario('stores change proposals between a player and an alliance and lists them per party', async () => {
    const player = playerParty(await world.player());
    const group = allianceParty(await world.alliance());
    const friendship = await befriend(player, group);

    const change = await store.insertRelationshipChangeProposal({
      relationshipId: friendship.id,
      senderParty: player,
      recipientParty: group,
      contract: 'Entwurf',
      treatAsFriend: true,
      shareLivePositions: false,
    });

    expect(change).toMatchObject({
      senderParty: player,
      recipientParty: group,
    });
    expect(await store.listRelationshipChangeProposals(group)).toEqual([
      expect.objectContaining({ id: change.id }),
    ]);
    expect(
      await store.acceptRelationshipChangeProposal(change.id),
    ).toMatchObject({ contract: 'Entwurf', treatAsFriend: true });
  });

  scenario('ends a non-war relationship of a mixed pair together with its pending proposal', async () => {
    const player = playerParty(await world.player());
    const group = allianceParty(await world.alliance());
    const friendship = await befriend(player, group);
    await store.insertRelationshipProposal({
      senderParty: group,
      recipientParty: player,
      type: AllianceRelationshipType.ALLIANCE,
      contract: '',
      ...noPermissions,
    });

    const ended = await store.endNonWarRelationship(friendship.id);

    expect(ended).toMatchObject({ id: friendship.id });
    expect([ended?.firstParty, ended?.secondParty]).toEqual(
      expect.arrayContaining([player, group]),
    );
    expect(await store.listActiveRelationships(player)).toEqual([]);
    expect(await store.listRelationshipProposals(group)).toEqual([]);
  });

  describe('diplomacy chronicle', () => {
    it('records a player on either side, the party types and the end reason, newest first', async () => {
      const playerId = await world.player();
      const otherId = await world.player();
      const group = await world.alliance();
      const base = {
        actorUserId: null,
        actorName: null,
        relationshipType: FRIENDSHIP,
        lordParty: null,
        vassalParty: null,
        endReason: null,
      };
      await store.appendDiplomacyChronicleEntry({
        ...base,
        eventType: 'RELATIONSHIP_STARTED' as never,
        firstParty: allianceParty(group),
        firstPartyName: 'Rogue Squadron',
        secondParty: playerParty(playerId),
        secondPartyName: 'Leia',
      });
      await store.appendDiplomacyChronicleEntry({
        ...base,
        eventType: 'RELATIONSHIP_ENDED' as never,
        firstParty: playerParty(playerId),
        firstPartyName: 'Leia',
        secondParty: allianceParty(group),
        secondPartyName: 'Rogue Squadron',
        endReason: 'PARTY_JOINED_ALLIANCE' as never,
      });

      const ofPlayer = await store.listDiplomacyChronicleEntries(
        playerParty(playerId),
        null,
        10,
      );
      expect(ofPlayer.map((entry) => entry.eventType)).toEqual([
        'RELATIONSHIP_ENDED',
        'RELATIONSHIP_STARTED',
      ]);
      expect(ofPlayer[0]).toMatchObject({
        firstParty: { type: DiplomacyPartyType.PLAYER, id: playerId },
        firstPartyName: 'Leia',
        secondParty: { type: DiplomacyPartyType.ALLIANCE, id: group },
        endReason: 'PARTY_JOINED_ALLIANCE',
      });
      expect(ofPlayer[1].endReason).toBeNull();
      expect(
        await store.listDiplomacyChronicleEntries(
          allianceParty(group),
          null,
          10,
        ),
      ).toHaveLength(2);
      expect(
        await store.listDiplomacyChronicleEntries(
          playerParty(otherId),
          null,
          10,
        ),
      ).toEqual([]);
    });

    it('keeps the legacy alliance shorthand working', async () => {
      const group = await world.alliance();
      const other = await world.alliance();
      await store.appendDiplomacyChronicleEntry({
        eventType: 'WAR_DECLARED' as never,
        actorUserId: null,
        actorName: null,
        firstAllianceId: Math.min(group, other),
        firstAllianceName: 'A',
        secondAllianceId: Math.max(group, other),
        secondAllianceName: 'B',
        relationshipType: AllianceRelationshipType.WAR,
        lordAllianceId: null,
        vassalAllianceId: null,
      });

      expect(
        await store.listDiplomacyChronicleEntries(group, null, 10),
      ).toEqual([
        expect.objectContaining({
          firstParty: allianceParty(Math.min(group, other)),
          firstPartyName: 'A',
          endReason: null,
        }),
      ]);
    });
  });

  describe('settler search', () => {
    it('lists alliance-less players of one faction by ID, literal and bounded', async () => {
      const me = await world.player();
      const other = await world.player();
      const third = await world.player();
      await world.player('EMPIRE');
      await world.alliance();

      const found = await world.store.searchSettlers({
        factionId: (await world.store.findPlayer(me))!.factionId!,
        excludeUserId: me,
        query: '',
        afterId: 0,
        limit: 100,
      });

      // Alliance presidents and the other faction are excluded.
      expect(found.map((player) => player.id)).toEqual([other, third]);
      expect(Object.keys(found[0]).sort()).toEqual(['id', 'name']);
      const paged = await world.store.searchSettlers({
        factionId: (await world.store.findPlayer(me))!.factionId!,
        excludeUserId: me,
        query: '',
        afterId: other,
        limit: 1,
      });
      expect(paged.map((player) => player.id)).toEqual([third]);
      expect(
        await world.store.searchSettlers({
          factionId: (await world.store.findPlayer(me))!.factionId!,
          excludeUserId: me,
          query: '%',
          afterId: 0,
          limit: 10,
        }),
      ).toEqual([]);
    });
  });
}
