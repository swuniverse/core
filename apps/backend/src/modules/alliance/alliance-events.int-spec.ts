import { DataSource } from 'typeorm';
import type { EntityManager } from 'typeorm';
import {
  AllianceDiplomacyChronicleEndReason,
  AllianceDiplomacyChronicleEventType,
  AllianceRelationshipType,
  AllianceRole,
  Faction,
  GameEventType,
} from '@swuniverse/shared';
import {
  connectIntegrationDatabase,
  createUser,
  factionId,
  resetDatabase,
} from '../../testing/integration/database';
import { User } from '../auth/user.entity';
import { GameEvent } from '../events/entities/game-event.entity';
import { GameEventService } from '../events/game-event.service';
import { AllianceService } from './alliance.service';
import { allianceParty, playerParty } from './diplomacy-party';
import { TypeOrmAllianceStore } from './typeorm-alliance.store';

const { WAR, PEACE, FRIENDSHIP, TRADE_AGREEMENT } = AllianceRelationshipType;
const {
  WAR_DECLARED,
  RELATIONSHIP_STARTED,
  RELATIONSHIP_CHANGED,
  RELATIONSHIP_ENDED,
} = AllianceDiplomacyChronicleEventType;

describe('public diplomacy events (Postgres)', () => {
  let dataSource: DataSource;
  let store: TypeOrmAllianceStore;
  let service: AllianceService;
  let gameEvents: GameEventService;
  let rebels: number;

  beforeAll(async () => {
    dataSource = await connectIntegrationDatabase();
  });
  afterAll(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();
  });
  beforeEach(async () => {
    await resetDatabase(dataSource);
    rebels = await factionId(dataSource, Faction.REBEL_ALLIANCE);
    gameEvents = new GameEventService(
      dataSource.getRepository(GameEvent),
      {} as never,
    );
    store = new TypeOrmAllianceStore(dataSource);
    service = new AllianceService(
      store,
      { sendSystem: jest.fn().mockResolvedValue(undefined) } as never,
      undefined,
      undefined,
      undefined,
      undefined,
      gameEvents,
    );
  });
  afterEach(() => jest.restoreAllMocks());

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
    await store.insertMembership({
      allianceId: created.id,
      userId: president.id,
      role: AllianceRole.PRESIDENT,
    });
    return created;
  }

  async function setupPair(firstAlliance: boolean, secondAlliance: boolean) {
    const first = await rebel('Leia');
    const second = await rebel('Han');
    const firstGroup = firstAlliance
      ? await alliance('Rogue Squadron', first)
      : null;
    const secondGroup = secondAlliance
      ? await alliance('Red Squadron', second)
      : null;
    const firstName = firstGroup?.name ?? first.username;
    const secondName = secondGroup?.name ?? second.username;
    const firstParty = firstGroup
      ? allianceParty(firstGroup.id)
      : playerParty(first.id);
    const target = secondGroup
      ? { recipientAllianceId: secondGroup.id }
      : { recipientPlayerId: second.id };

    const propose = (type: AllianceRelationshipType) =>
      firstGroup
        ? service.proposeRelationship(first.id, firstGroup.id, {
            ...target,
            type,
            contract: 'Geheimes Vertragswerk',
          })
        : service.proposeSettlerRelationship(first.id, {
            ...target,
            type,
            contract: 'Geheimes Vertragswerk',
          });
    const declareWar = () =>
      firstGroup
        ? secondGroup
          ? service.declareWar(first.id, firstGroup.id, secondGroup.id)
          : service.declareWarOnSettler(first.id, firstGroup.id, second.id)
        : secondGroup
          ? service.declareSettlerWarOnAlliance(first.id, secondGroup.id)
          : service.declareSettlerWar(first.id, second.id);
    const accept = async (type: AllianceRelationshipType) => {
      const proposal = await propose(type);
      await service.acceptRelationshipProposal(second.id, proposal.id);
    };
    const relationship = async () => {
      const [active] = await store.listActiveRelationships(firstParty);
      if (!active) throw new Error('Expected an active relationship');
      return active;
    };
    return {
      first,
      second,
      firstName,
      secondName,
      firstParty,
      propose,
      declareWar,
      accept,
      relationship,
    };
  }

  const events = () =>
    dataSource.getRepository(GameEvent).find({ order: { id: 'ASC' } });
  const chronicle = () =>
    dataSource.query(
      'SELECT * FROM "alliance_diplomacy_chronicle_entries" ORDER BY "id"',
    );

  const pairs = [
    { label: 'alliance–alliance', firstAlliance: true, secondAlliance: true },
    { label: 'alliance–settler', firstAlliance: true, secondAlliance: false },
    { label: 'settler–alliance', firstAlliance: false, secondAlliance: true },
    { label: 'settler–settler', firstAlliance: false, secondAlliance: false },
  ];
  const transitions = [
    {
      label: 'war declaration',
      text: 'Krieg erklärt',
      prepare: () => Promise.resolve(),
      act: (pair: Awaited<ReturnType<typeof setupPair>>) => pair.declareWar(),
      eventType: WAR_DECLARED,
      relationshipType: WAR,
    },
    {
      label: 'peace acceptance',
      text: 'Frieden geändert',
      prepare: (pair: Awaited<ReturnType<typeof setupPair>>) =>
        pair.declareWar(),
      act: (pair: Awaited<ReturnType<typeof setupPair>>) => pair.accept(PEACE),
      eventType: RELATIONSHIP_CHANGED,
      relationshipType: PEACE,
    },
    {
      label: 'contract start',
      text: 'Freundschaft begonnen',
      prepare: () => Promise.resolve(),
      act: (pair: Awaited<ReturnType<typeof setupPair>>) =>
        pair.accept(FRIENDSHIP),
      eventType: RELATIONSHIP_STARTED,
      relationshipType: FRIENDSHIP,
    },
    {
      label: 'accepted relationship type change',
      text: 'Handelsabkommen geändert',
      prepare: (pair: Awaited<ReturnType<typeof setupPair>>) =>
        pair.accept(FRIENDSHIP),
      act: (pair: Awaited<ReturnType<typeof setupPair>>) =>
        pair.accept(TRADE_AGREEMENT),
      eventType: RELATIONSHIP_CHANGED,
      relationshipType: TRADE_AGREEMENT,
    },
    {
      label: 'accepted contract change',
      text: 'Freundschaft geändert',
      prepare: (pair: Awaited<ReturnType<typeof setupPair>>) =>
        pair.accept(FRIENDSHIP),
      act: async (pair: Awaited<ReturnType<typeof setupPair>>) => {
        const change = await service.proposeRelationshipChange(
          pair.first.id,
          (await pair.relationship()).id,
          { contract: 'Vertrag angepasst' },
        );
        await service.acceptRelationshipChange(pair.second.id, change.id);
      },
      eventType: RELATIONSHIP_CHANGED,
      relationshipType: FRIENDSHIP,
    },
    {
      label: 'contract cancellation',
      text: 'Freundschaft beendet',
      prepare: (pair: Awaited<ReturnType<typeof setupPair>>) =>
        pair.accept(FRIENDSHIP),
      act: async (pair: Awaited<ReturnType<typeof setupPair>>) =>
        service.endRelationship(pair.first.id, (await pair.relationship()).id),
      eventType: RELATIONSHIP_ENDED,
      relationshipType: FRIENDSHIP,
    },
  ];

  for (const { label, firstAlliance, secondAlliance } of pairs) {
    describe(label, () => {
      it.each(transitions)(
        '$label commits exactly one locationless ALLIANCE event alongside its public chronicle entry',
        async ({ prepare, act, eventType, relationshipType, text }) => {
          const pair = await setupPair(firstAlliance, secondAlliance);
          await prepare(pair);
          const beforeEvents = await events();
          const beforeChronicle = await chronicle();

          await act(pair);

          const afterChronicle = await chronicle();
          const afterEvents = await events();
          expect(afterChronicle).toHaveLength(beforeChronicle.length + 1);
          expect(afterChronicle.at(-1)).toMatchObject({
            eventType,
            relationshipType,
            endReason: null,
          });
          expect(
            [
              afterChronicle.at(-1).firstAllianceName,
              afterChronicle.at(-1).secondAllianceName,
            ].sort(),
          ).toEqual([pair.firstName, pair.secondName].sort());
          expect(afterEvents).toHaveLength(beforeEvents.length + 1);
          const event = afterEvents.at(-1);
          if (!event) throw new Error('Expected a diplomacy event');
          expect(event).toMatchObject({
            type: GameEventType.ALLIANCE,
            scope: null,
            layerId: null,
            systemId: null,
            x: null,
            y: null,
            locationId: null,
          });
          expect(event.text).toContain(pair.firstName);
          expect(event.text).toContain(pair.secondName);
          expect(event.text).toContain(text);
          expect(event.text).not.toContain('Geheimes Vertragswerk');
          const result = await gameEvents.recent({
            viewerId: pair.first.id,
            type: GameEventType.ALLIANCE,
          });
          expect(result.events.map((entry) => entry.id)).toContain(event.id);
          expect(result.counts[GameEventType.ALLIANCE]).toBe(
            afterEvents.length,
          );
        },
      );
    });
  }

  it('does not publish proposals or rejected or withdrawn proposals and contract changes', async () => {
    const pair = await setupPair(true, false);
    const before = await events();
    const beforeChronicle = await chronicle();
    const declined = await pair.propose(FRIENDSHIP);
    await service.declineRelationshipProposal(pair.second.id, declined.id);
    const withdrawn = await pair.propose(FRIENDSHIP);
    await service.withdrawRelationshipProposal(pair.first.id, withdrawn.id);
    const pending = await pair.propose(FRIENDSHIP);
    expect(await events()).toEqual(before);
    expect(await chronicle()).toEqual(beforeChronicle);
    await service.acceptRelationshipProposal(pair.second.id, pending.id);

    const afterStart = await events();
    const afterStartChronicle = await chronicle();
    const relationship = await pair.relationship();
    const change = () =>
      service.proposeRelationshipChange(pair.first.id, relationship.id, {
        contract: 'Nur intern',
      });
    const declinedChange = await change();
    await service.declineRelationshipChange(pair.second.id, declinedChange.id);
    const withdrawnChange = await change();
    await service.withdrawRelationshipChange(pair.first.id, withdrawnChange.id);
    expect(await events()).toEqual(afterStart);
    expect(await chronicle()).toEqual(afterStartChronicle);
  });

  it('does not publish an accepted permission-only change', async () => {
    const pair = await setupPair(true, false);
    await pair.accept(FRIENDSHIP);
    const beforeEvents = await events();
    const beforeChronicle = await chronicle();
    const change = await service.proposeRelationshipChange(
      pair.first.id,
      (await pair.relationship()).id,
      {
        contract: 'Geheimes Vertragswerk',
        permissions: { treatAsFriend: true, shareLivePositions: false },
      },
    );

    await service.acceptRelationshipChange(pair.second.id, change.id);

    expect(await pair.relationship()).toMatchObject({ treatAsFriend: true });
    expect(await events()).toEqual(beforeEvents);
    expect(await chronicle()).toEqual(beforeChronicle);
  });

  it.each(['founding', 'joining'] as const)(
    'does not publish administrative party cleanup when %s an alliance',
    async (action) => {
      const pair = await setupPair(false, false);
      await pair.accept(FRIENDSHIP);
      const president = action === 'joining' ? await rebel('Mon') : null;
      const group = president ? await alliance('Phoenix', president) : null;
      if (group) {
        await store.updateAlliance(group.id, { acceptsApplications: true });
        await service.apply(pair.first.id, group.id);
      }
      const beforeEvents = await events();
      const beforeChronicle = await chronicle();

      if (group && president) {
        const [application] = await store.listApplicationsForAlliance(group.id);
        await service.acceptApplication(president.id, application.id);
      } else {
        await service.found(pair.first.id, {
          name: 'Phoenix',
          description: '',
        });
      }

      expect(await store.listActiveRelationships(pair.firstParty)).toEqual([]);
      const afterChronicle = await chronicle();
      expect(afterChronicle).toHaveLength(beforeChronicle.length + 1);
      expect(afterChronicle.at(-1)).toMatchObject({
        eventType: RELATIONSHIP_ENDED,
        endReason: AllianceDiplomacyChronicleEndReason.PARTY_JOINED_ALLIANCE,
      });
      expect(await events()).toEqual(beforeEvents);
    },
  );

  it('returns diplomacy events through the ALLIANCE filter without unrelated events', async () => {
    const pair = await setupPair(true, true);
    await dataSource
      .getRepository(GameEvent)
      .save({ type: GameEventType.OTHER, text: 'Unrelated' });
    await pair.declareWar();

    const result = await gameEvents.recent({
      viewerId: pair.first.id,
      type: GameEventType.ALLIANCE,
    });
    expect(result.events).toHaveLength(1);
    expect(result.events[0]).toMatchObject({
      type: GameEventType.ALLIANCE,
      scope: null,
      location: null,
    });
    expect(result.events[0].text).toContain(pair.firstName);
    expect(result.events[0].text).toContain(pair.secondName);
    expect(result.counts[GameEventType.ALLIANCE]).toBe(1);
    expect(result.counts[GameEventType.OTHER]).toBe(1);
  });

  it('rolls back the relationship, public chronicle and event if writing the event fails after its insert', async () => {
    const pair = await setupPair(true, true);
    await pair.accept(FRIENDSHIP);
    const beforeRelationship = await dataSource.query(
      'SELECT * FROM "alliance_relationships" ORDER BY "id"',
    );
    const beforeChronicle = await chronicle();
    const beforeEvents = await events();
    const original = gameEvents.recordAlliance.bind(gameEvents);
    let eventSeenInTransaction = false;
    const writer = jest
      .spyOn(gameEvents, 'recordAlliance')
      .mockImplementation(async (text: string, manager: EntityManager) => {
        await original(text, manager);
        eventSeenInTransaction =
          (await manager.getRepository(GameEvent).count()) ===
          beforeEvents.length + 1;
        throw new Error('forced failure after event insert');
      });

    await expect(pair.declareWar()).rejects.toThrow(
      'forced failure after event insert',
    );

    expect(writer).toHaveBeenCalledTimes(1);
    expect(eventSeenInTransaction).toBe(true);
    expect(
      await dataSource.query(
        'SELECT * FROM "alliance_relationships" ORDER BY "id"',
      ),
    ).toEqual(beforeRelationship);
    expect(await chronicle()).toEqual(beforeChronicle);
    expect(await events()).toEqual(beforeEvents);
  });
});
