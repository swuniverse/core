import { Logger } from '@nestjs/common';
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
import { Message } from '../messaging/entities/message.entity';
import { StatisticsService } from '../statistics/statistics.service';
import { MessagingService } from '../messaging/messaging.service';
import { AllianceService } from './alliance.service';
import { AllianceConstraintViolation } from './alliance.store';
import { TypeOrmAllianceStore } from './typeorm-alliance.store';

const { NONE, PRESIDENT, VICE } = AllianceRole;

function silenceDiplomacyDeliveryErrors(service: AllianceService) {
  // SAFETY: tests replace the private logger only to silence expected delivery errors.
  jest
    .spyOn((service as unknown as { logger: Logger }).logger, 'error')
    .mockImplementation();
}

describe('alliance persistence (Postgres)', () => {
  let dataSource: DataSource;
  let store: TypeOrmAllianceStore;
  let service: AllianceService;
  let rebels: number;

  beforeAll(async () => {
    dataSource = await connectIntegrationDatabase();
  });
  afterAll(() => dataSource.destroy());

  beforeEach(async () => {
    await resetDatabase(dataSource);
    rebels = await factionId(dataSource, Faction.REBEL_ALLIANCE);
    store = new TypeOrmAllianceStore(dataSource);
    service = new AllianceService(store, {
      sendSystem: jest.fn().mockResolvedValue(undefined),
    } as never);
  });

  const rebel = (overrides: Partial<User> = {}) =>
    createUser(dataSource, {
      faction: Faction.REBEL_ALLIANCE,
      factionId: rebels,
      ...overrides,
    });

  async function alliance(name: string, presidentId: number) {
    const created = await store.insertAlliance({
      name,
      description: '',
      factionId: rebels,
    });
    await store.insertMembership({
      allianceId: created.id,
      userId: presidentId,
      role: PRESIDENT,
    });
    return created;
  }

  function concurrentService() {
    return new AllianceService(new TypeOrmAllianceStore(dataSource), {
      sendSystem: jest.fn().mockResolvedValue(undefined),
    } as never);
  }

  it('enforces a single active relationship for a canonical same-faction pair', async () => {
    const leia = await rebel();
    const mon = await rebel();
    const rogue = await alliance('Rogue Squadron', leia.id);
    const red = await alliance('Red Squadron', mon.id);
    const [{ id: roguePartyId }] = await dataSource.query(
      'SELECT "id" FROM "diplomacy_parties" WHERE "allianceId" = $1',
      [rogue.id],
    );
    const [{ id: redPartyId }] = await dataSource.query(
      'SELECT "id" FROM "diplomacy_parties" WHERE "allianceId" = $1',
      [red.id],
    );
    const firstPartyId = Math.min(roguePartyId, redPartyId);
    const secondPartyId = Math.max(roguePartyId, redPartyId);

    await dataSource.query(
      `INSERT INTO "alliance_relationships" (
        "firstPartyId", "secondPartyId", "type", "contract"
      ) VALUES ($1, $2, $3, $4)`,
      [
        firstPartyId,
        secondPartyId,
        AllianceRelationshipType.ALLIANCE,
        '[b]Pakt[/b]',
      ],
    );

    await expect(
      dataSource.query(
        `INSERT INTO "alliance_relationships" (
          "firstPartyId", "secondPartyId", "type"
        ) VALUES ($1, $2, $3)`,
        [firstPartyId, secondPartyId, AllianceRelationshipType.PEACE],
      ),
    ).rejects.toMatchObject({ code: '23505' });

    const detail = await service.getDetail(leia.id, rogue.id);
    expect(detail.relationships).toEqual([
      expect.objectContaining({
        counterparty: expect.objectContaining({ id: red.id }),
        type: AllianceRelationshipType.ALLIANCE,
        hasContract: true,
      }),
    ]);
  });

  it('enforces one canonical pending proposal and atomically accepts it into the sole active relationship', async () => {
    const leia = await rebel();
    const mon = await rebel();
    const rogue = await alliance('Rogue Squadron', leia.id);
    const red = await alliance('Red Squadron', mon.id);
    const proposal = await store.insertRelationshipProposal({
      senderAllianceId: rogue.id,
      recipientAllianceId: red.id,
      type: AllianceRelationshipType.FRIENDSHIP,
      contract: 'Vertraulich',
      treatAsFriend: true,
      shareLivePositions: false,
    });

    await expect(
      store.insertRelationshipProposal({
        senderAllianceId: red.id,
        recipientAllianceId: rogue.id,
        type: AllianceRelationshipType.ALLIANCE,
        contract: '',
        treatAsFriend: false,
        shareLivePositions: false,
      }),
    ).rejects.toBeInstanceOf(AllianceConstraintViolation);

    const accepted = await store.transaction((tx) =>
      tx.acceptRelationshipProposal(proposal.id),
    );
    expect(accepted).toMatchObject({
      type: AllianceRelationshipType.FRIENDSHIP,
      contract: 'Vertraulich',
    });
    await expect(
      store.findRelationshipProposal(proposal.id),
    ).resolves.toBeNull();
    await expect(store.listActiveRelationships(rogue.id)).resolves.toEqual([
      expect.objectContaining({ type: AllianceRelationshipType.FRIENDSHIP }),
    ]);
  });

  it('serializes simultaneous relationship proposals into one pending proposal and a domain error', async () => {
    const leia = await rebel();
    const mon = await rebel();
    const rogue = await alliance('Rogue Squadron', leia.id);
    const red = await alliance('Red Squadron', mon.id);

    const results = await Promise.allSettled([
      concurrentService().proposeRelationship(leia.id, rogue.id, {
        recipientAllianceId: red.id,
        type: AllianceRelationshipType.FRIENDSHIP,
      }),
      concurrentService().proposeRelationship(mon.id, red.id, {
        recipientAllianceId: rogue.id,
        type: AllianceRelationshipType.ALLIANCE,
      }),
    ]);

    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    const rejected = results.find(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );
    expect(rejected?.reason).toMatchObject({
      message:
        'Für dieses Allianzpaar existiert bereits ein Beziehungsvorschlag',
    });
    await expect(
      store.listRelationshipProposals(rogue.id),
    ).resolves.toHaveLength(1);
  });

  it('keeps one pending relationship change confidential and atomically replaces the active state on acceptance', async () => {
    const leia = await rebel();
    const mon = await rebel();
    const rogue = await alliance('Rogue Squadron', leia.id);
    const red = await alliance('Red Squadron', mon.id);
    const proposal = await service.proposeRelationship(leia.id, rogue.id, {
      recipientAllianceId: red.id,
      type: AllianceRelationshipType.ALLIANCE,
      contract: 'Bisheriges Vertragswerk',
      permissions: { treatAsFriend: true, shareLivePositions: true },
    });
    await service.acceptRelationshipProposal(mon.id, proposal.id);
    const [relationship] = await store.listActiveRelationships(rogue.id);

    const change = await service.proposeRelationshipChange(
      leia.id,
      relationship.id,
      {
        contract: 'Neues Vertragswerk',
        permissions: { treatAsFriend: false, shareLivePositions: false },
      },
    );
    await expect(
      service.proposeRelationshipChange(mon.id, relationship.id, {
        contract: 'Doppelter Entwurf',
      }),
    ).rejects.toMatchObject({
      message: 'Für diese Beziehung existiert bereits ein Änderungsvorschlag',
    });
    await expect(
      store.findActiveRelationship(relationship.id),
    ).resolves.toMatchObject({
      contract: 'Bisheriges Vertragswerk',
      treatAsFriend: true,
      shareLivePositions: true,
    });

    await service.acceptRelationshipChange(mon.id, change.id);

    await expect(
      store.findActiveRelationship(relationship.id),
    ).resolves.toMatchObject({
      id: relationship.id,
      contract: 'Neues Vertragswerk',
      treatAsFriend: false,
      shareLivePositions: false,
    });
    await expect(
      store.findRelationshipChangeProposal(change.id),
    ).resolves.toBeNull();
  });

  it('serializes two concurrent relationship changes into one pending change', async () => {
    const leia = await rebel();
    const mon = await rebel();
    const rogue = await alliance('Rogue Squadron', leia.id);
    const red = await alliance('Red Squadron', mon.id);
    const proposal = await service.proposeRelationship(leia.id, rogue.id, {
      recipientAllianceId: red.id,
      type: AllianceRelationshipType.ALLIANCE,
      permissions: { treatAsFriend: true, shareLivePositions: true },
    });
    await service.acceptRelationshipProposal(mon.id, proposal.id);
    const [relationship] = await store.listActiveRelationships(rogue.id);

    const results = await Promise.allSettled([
      concurrentService().proposeRelationshipChange(leia.id, relationship.id, {
        contract: 'Entwurf A',
        permissions: { treatAsFriend: false, shareLivePositions: false },
      }),
      concurrentService().proposeRelationshipChange(mon.id, relationship.id, {
        contract: 'Entwurf B',
        permissions: { treatAsFriend: true, shareLivePositions: false },
      }),
    ]);

    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    const rejected = results.find(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );
    expect(rejected?.reason).toMatchObject({
      message: 'Für diese Beziehung existiert bereits ein Änderungsvorschlag',
    });
    await expect(
      store.listRelationshipChangeProposals(rogue.id),
    ).resolves.toHaveLength(1);
  });

  it('serializes war against proposal acceptance into a single active war', async () => {
    const leia = await rebel();
    const mon = await rebel();
    const rogue = await alliance('Rogue Squadron', leia.id);
    const red = await alliance('Red Squadron', mon.id);
    const proposal = await service.proposeRelationship(leia.id, rogue.id, {
      recipientAllianceId: red.id,
      type: AllianceRelationshipType.FRIENDSHIP,
    });

    const results = await Promise.allSettled([
      concurrentService().declareWar(leia.id, rogue.id, red.id),
      concurrentService().acceptRelationshipProposal(mon.id, proposal.id),
    ]);

    expect(results).toHaveLength(2);
    await expect(store.listActiveRelationships(rogue.id)).resolves.toEqual([
      expect.objectContaining({ type: AllianceRelationshipType.WAR }),
    ]);
    await expect(store.listRelationshipProposals(rogue.id)).resolves.toEqual(
      [],
    );
  });

  it('keeps war active when war races with accepting a peace proposal', async () => {
    const leia = await rebel();
    const mon = await rebel();
    const rogue = await alliance('Rogue Squadron', leia.id);
    const red = await alliance('Red Squadron', mon.id);

    await service.declareWar(leia.id, rogue.id, red.id);
    const proposal = await service.proposeRelationship(leia.id, rogue.id, {
      recipientAllianceId: red.id,
      type: AllianceRelationshipType.PEACE,
      contract: 'Waffenruhe',
    });

    const results = await Promise.allSettled([
      concurrentService().declareWar(leia.id, rogue.id, red.id),
      concurrentService().acceptRelationshipProposal(mon.id, proposal.id),
    ]);

    expect(results).toHaveLength(2);
    await expect(store.listActiveRelationships(rogue.id)).resolves.toEqual([
      expect.objectContaining({ type: AllianceRelationshipType.WAR }),
    ]);
    await expect(store.listRelationshipProposals(rogue.id)).resolves.toEqual(
      [],
    );
  });

  it('keeps war active when war races with accepting a relationship change', async () => {
    const leia = await rebel();
    const mon = await rebel();
    const rogue = await alliance('Rogue Squadron', leia.id);
    const red = await alliance('Red Squadron', mon.id);
    const proposal = await service.proposeRelationship(leia.id, rogue.id, {
      recipientAllianceId: red.id,
      type: AllianceRelationshipType.FRIENDSHIP,
      contract: 'Bisheriges Vertragswerk',
      permissions: { treatAsFriend: true, shareLivePositions: false },
    });
    await service.acceptRelationshipProposal(mon.id, proposal.id);
    const [relationship] = await store.listActiveRelationships(rogue.id);
    const change = await service.proposeRelationshipChange(
      leia.id,
      relationship.id,
      {
        contract: 'Neues Vertragswerk',
        permissions: { treatAsFriend: false, shareLivePositions: false },
      },
    );

    const results = await Promise.allSettled([
      concurrentService().declareWar(leia.id, rogue.id, red.id),
      concurrentService().acceptRelationshipChange(mon.id, change.id),
    ]);

    expect(results).toHaveLength(2);
    await expect(store.listActiveRelationships(rogue.id)).resolves.toEqual([
      expect.objectContaining({ type: AllianceRelationshipType.WAR }),
    ]);
    await expect(
      store.findRelationshipChangeProposal(change.id),
    ).resolves.toBeNull();
  });

  it('serializes two answers to one relationship proposal', async () => {
    const leia = await rebel();
    const mon = await rebel();
    const rogue = await alliance('Rogue Squadron', leia.id);
    const red = await alliance('Red Squadron', mon.id);
    const proposal = await service.proposeRelationship(leia.id, rogue.id, {
      recipientAllianceId: red.id,
      type: AllianceRelationshipType.FRIENDSHIP,
    });

    const results = await Promise.allSettled([
      concurrentService().acceptRelationshipProposal(mon.id, proposal.id),
      concurrentService().declineRelationshipProposal(mon.id, proposal.id),
    ]);

    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    const rejected = results.find(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );
    expect(rejected?.reason).toMatchObject({
      message: 'Der Beziehungsvorschlag ist nicht verfügbar',
    });
    const active = await store.listActiveRelationships(rogue.id);
    expect(active.length).toBeLessThanOrEqual(1);
    await expect(store.listRelationshipProposals(rogue.id)).resolves.toEqual(
      [],
    );
  });

  it('persists a failed post-commit diplomacy notification and retries its keyed physical message exactly once', async () => {
    const leia = await rebel();
    const mon = await rebel();
    const rogue = await alliance('Rogue Squadron', leia.id);
    const red = await alliance('Red Squadron', mon.id);
    const messaging = new MessagingService(
      dataSource.getRepository(Message),
      new StatisticsService(dataSource, []),
    );
    const failingService = new AllianceService(store, messaging);
    const markDelivered = jest
      .spyOn(store, 'markDiplomacyNotificationDelivered')
      .mockRejectedValueOnce(new Error('acknowledgment unavailable'));
    silenceDiplomacyDeliveryErrors(failingService);

    await expect(
      failingService.declareWar(leia.id, rogue.id, red.id),
    ).resolves.toBeUndefined();
    await expect(store.listActiveRelationships(rogue.id)).resolves.toEqual([
      expect.objectContaining({ type: AllianceRelationshipType.WAR }),
    ]);
    const [notification] = await dataSource.query(
      'SELECT "recipientUserId", "deliveryKey", "deliveredAt" FROM "alliance_diplomacy_notifications"',
    );
    expect(notification).toMatchObject({
      recipientUserId: mon.id,
      deliveryKey: expect.stringMatching(/^alliance-diplomacy-notification:/),
      deliveredAt: null,
    });
    await expect(
      dataSource.query(
        'SELECT "deliveryKey" FROM "messages" WHERE "deliveryKey" = $1',
        [notification.deliveryKey],
      ),
    ).resolves.toEqual([{ deliveryKey: notification.deliveryKey }]);

    await failingService.retryDiplomacyNotifications();

    expect(markDelivered).toHaveBeenCalledTimes(2);
    await expect(
      dataSource.query(
        'SELECT "deliveryKey" FROM "messages" WHERE "deliveryKey" = $1',
        [notification.deliveryKey],
      ),
    ).resolves.toEqual([{ deliveryKey: notification.deliveryKey }]);
    await expect(
      dataSource.query(
        'SELECT "deliveredAt" FROM "alliance_diplomacy_notifications"',
      ),
    ).resolves.toEqual([
      expect.objectContaining({ deliveredAt: expect.any(Date) }),
    ]);
  });

  it('leases a pending notification to one dispatcher across service instances', async () => {
    const mon = await rebel();
    await store.enqueueDiplomacyNotifications([
      { recipientUserId: mon.id, body: 'Eine Beziehung wurde geändert' },
    ]);

    let releaseFirstDelivery!: () => void;
    let firstDeliveryFinished!: () => void;
    const firstDeliveryFinishedPromise = new Promise<void>((resolve) => {
      firstDeliveryFinished = resolve;
    });
    let firstDeliveryStarted!: () => void;
    const firstDeliveryStartedPromise = new Promise<void>((resolve) => {
      firstDeliveryStarted = resolve;
    });
    const first = new AllianceService(new TypeOrmAllianceStore(dataSource), {
      sendSystem: jest.fn(async () => {
        firstDeliveryStarted();
        await new Promise<void>((release) => {
          releaseFirstDelivery = release;
        });
      }),
    } as never);
    void first.retryDiplomacyNotifications().finally(firstDeliveryFinished);

    await firstDeliveryStartedPromise;
    const secondMessaging = {
      sendSystem: jest.fn().mockResolvedValue(undefined),
    };
    const second = new AllianceService(
      new TypeOrmAllianceStore(dataSource),
      secondMessaging as never,
    );

    await second.retryDiplomacyNotifications();

    expect(secondMessaging.sendSystem).not.toHaveBeenCalled();
    releaseFirstDelivery();
    await firstDeliveryFinishedPromise;
  });

  it('persists immutable public chronicle snapshots without contract text', async () => {
    const leia = await rebel();
    const mon = await rebel();
    const rogue = await alliance('Rogue Squadron', leia.id);
    const red = await alliance('Red Squadron', mon.id);

    await service.declareWar(leia.id, rogue.id, red.id);

    const [entry] = await dataSource.query(
      'SELECT * FROM "alliance_diplomacy_chronicle_entries"',
    );
    expect(entry).toMatchObject({
      eventType: 'WAR_DECLARED',
      actorUserId: leia.id,
      actorName: leia.username,
      firstAllianceName: 'Rogue Squadron',
      secondAllianceName: 'Red Squadron',
      relationshipType: AllianceRelationshipType.WAR,
    });
    expect(entry).not.toHaveProperty('contract');
    await expect(
      dataSource.query(
        'UPDATE "alliance_diplomacy_chronicle_entries" SET "actorName" = $1 WHERE "id" = $2',
        ['Changed', entry.id],
      ),
    ).rejects.toMatchObject({ message: expect.stringContaining('immutable') });
    await expect(
      dataSource.query(
        'DELETE FROM "alliance_diplomacy_chronicle_entries" WHERE "id" = $1',
        [entry.id],
      ),
    ).rejects.toMatchObject({ message: expect.stringContaining('immutable') });
  });

  it('transitions war through an accepted peace proposal and atomically ends peace with pending changes', async () => {
    const leia = await rebel();
    const mon = await rebel();
    const rogue = await alliance('Rogue Squadron', leia.id);
    const red = await alliance('Red Squadron', mon.id);

    await service.declareWar(leia.id, rogue.id, red.id);
    const { id } = await service.proposeRelationship(leia.id, rogue.id, {
      recipientAllianceId: red.id,
      type: AllianceRelationshipType.PEACE,
      contract: 'Waffenruhe',
    });
    await service.acceptRelationshipProposal(mon.id, id);
    const [peace] = await store.listActiveRelationships(rogue.id);
    expect(peace).toMatchObject({
      type: AllianceRelationshipType.PEACE,
      contract: 'Waffenruhe',
      treatAsFriend: false,
      shareLivePositions: false,
    });

    await service.proposeRelationship(leia.id, rogue.id, {
      recipientAllianceId: red.id,
      type: AllianceRelationshipType.FRIENDSHIP,
    });
    await service.endRelationship(mon.id, peace.id);

    await expect(store.listActiveRelationships(rogue.id)).resolves.toEqual([]);
    await expect(store.listRelationshipProposals(rogue.id)).resolves.toEqual(
      [],
    );
  });

  it('applies migration defaults to a new alliance', async () => {
    const leia = await rebel();
    const { id } = await service.found(leia.id, {
      name: 'Rogue Squadron',
      description: 'Wir fliegen.',
    });

    const detail = await service.getDetail(leia.id, id);
    expect(detail).toMatchObject({
      name: 'Rogue Squadron',
      faction: Faction.REBEL_ALLIANCE,
      acceptsApplications: false,
      color: null,
      homepage: '',
      titles: {
        president: 'Präsident',
        vice: 'Vize-Präsident',
        diplomat: 'Diplomat',
      },
      members: [expect.objectContaining({ userId: leia.id, role: PRESIDENT })],
    });
  });

  describe('alliance name', () => {
    it('is unique regardless of case', async () => {
      const leia = await rebel();
      await alliance('Rogue Squadron', leia.id);

      await expect(
        store.insertAlliance({
          name: 'rogue squadron',
          description: '',
          factionId: rebels,
        }),
      ).rejects.toEqual(new AllianceConstraintViolation('alliance_name'));
    });

    it('rejects "rogue" when "Rogue" exists, also when renaming', async () => {
      const leia = await rebel();
      const han = await rebel();
      await alliance('Rogue', leia.id);
      const other = await alliance('Smugglers', han.id);

      await expect(
        store.updateAlliance(other.id, { name: 'rogue' }),
      ).rejects.toEqual(new AllianceConstraintViolation('alliance_name'));
    });

    it('surfaces as a domain error when founding races', async () => {
      const leia = await rebel();
      const han = await rebel();

      const results = await Promise.allSettled([
        service.found(leia.id, { name: 'Rogue Squadron', description: '' }),
        service.found(han.id, { name: 'ROGUE SQUADRON', description: '' }),
      ]);

      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      const rejected = results.find(
        (r): r is PromiseRejectedResult => r.status === 'rejected',
      );
      expect(rejected?.reason.message).toBe(
        'Dieser Allianzname ist bereits vergeben',
      );
      expect(await store.listAlliances()).toHaveLength(1);
    });

    it('does not treat LIKE wildcards as matches', async () => {
      const leia = await rebel();
      await alliance('Rogue Squadron', leia.id);

      expect(await store.isNameTaken('Rogue_Squadron')).toBe(false);
      expect(await store.isNameTaken('Rogue%')).toBe(false);
      expect(await store.isNameTaken('ROGUE SQUADRON')).toBe(true);
    });
  });

  it('keeps a player in at most one alliance', async () => {
    const leia = await rebel();
    const han = await rebel();
    const first = await alliance('Rogue Squadron', leia.id);
    await alliance('Smugglers', han.id);

    await expect(
      store.insertMembership({
        allianceId: first.id,
        userId: han.id,
        role: NONE,
      }),
    ).rejects.toEqual(new AllianceConstraintViolation('membership_user'));
  });

  it('allows only one president per alliance', async () => {
    const leia = await rebel();
    const wedge = await rebel();
    const rogue = await alliance('Rogue Squadron', leia.id);
    await store.insertMembership({
      allianceId: rogue.id,
      userId: wedge.id,
      role: VICE,
    });

    await expect(store.setRole(rogue.id, wedge.id, PRESIDENT)).rejects.toEqual(
      new AllianceConstraintViolation('alliance_president'),
    );
    await expect(
      store.insertMembership({
        allianceId: rogue.id,
        userId: (await rebel()).id,
        role: PRESIDENT,
      }),
    ).rejects.toEqual(new AllianceConstraintViolation('alliance_president'));
  });

  it('transfers the presidency atomically', async () => {
    const leia = await rebel();
    const wedge = await rebel();
    const rogue = await alliance('Rogue Squadron', leia.id);
    await store.insertMembership({
      allianceId: rogue.id,
      userId: wedge.id,
      role: NONE,
    });

    await service.transferPresidency(leia.id, rogue.id, wedge.id);

    expect((await store.findMembership(leia.id))?.role).toBe(NONE);
    expect((await store.findMembership(wedge.id))?.role).toBe(PRESIDENT);
  });

  it('cascades memberships and applications when an alliance is dissolved', async () => {
    const leia = await rebel();
    const wedge = await rebel();
    const han = await rebel();
    const rogue = await alliance('Rogue Squadron', leia.id);
    await store.insertMembership({
      allianceId: rogue.id,
      userId: wedge.id,
      role: NONE,
    });
    await store.insertApplication({ allianceId: rogue.id, userId: han.id });

    await service.dissolve(leia.id, rogue.id);

    expect(await store.findAlliance(rogue.id)).toBeNull();
    const [{ count: memberships }] = await dataSource.query(
      'SELECT COUNT(*)::int AS count FROM alliance_memberships',
    );
    const [{ count: applications }] = await dataSource.query(
      'SELECT COUNT(*)::int AS count FROM alliance_applications',
    );
    expect(memberships).toBe(0);
    expect(applications).toBe(0);
  });

  it('persists chronicle entries, keeps names after account deletion and cascades on dissolution', async () => {
    const leia = await rebel();
    const wedge = await rebel();
    const rogue = await alliance('Rogue Squadron', leia.id);
    await store.updateAlliance(rogue.id, { acceptsApplications: true });
    await service.apply(wedge.id, rogue.id);
    const [application] = await store.listApplicationsForAlliance(rogue.id);
    await service.acceptApplication(leia.id, application.id);
    await service.kick(leia.id, rogue.id, wedge.id);
    await service.declareWar(
      leia.id,
      rogue.id,
      (await alliance('Red Squadron', (await rebel()).id)).id,
    );

    const chronicle = await service.listChronicle(leia.id, rogue.id);
    expect(chronicle.entries.map((e) => e.type)).toEqual([
      'MEMBER_KICKED',
      'MEMBER_JOINED',
    ]);

    await dataSource.query('DELETE FROM "users" WHERE "id" = $1', [wedge.id]);
    const kicked = (await service.listChronicle(leia.id, rogue.id)).entries[0];
    expect(kicked.subject).toEqual({ userId: null, name: wedge.username });
    expect(kicked.actor).toEqual({ userId: leia.id, name: leia.username });

    await service.dissolve(leia.id, rogue.id);
    const [{ count }] = await dataSource.query(
      'SELECT COUNT(*)::int AS count FROM alliance_chronicle_entries',
    );
    expect(count).toBe(0);
    const [{ count: diplomacy }] = await dataSource.query(
      'SELECT COUNT(*)::int AS count FROM alliance_diplomacy_chronicle_entries',
    );
    expect(diplomacy).toBe(1);
  });

  it('accepts exactly one of two concurrent acceptances of the same applicant', async () => {
    const leia = await rebel();
    const mon = await rebel();
    const han = await rebel();
    const rogue = await alliance('Rogue Squadron', leia.id);
    const red = await alliance('Red Squadron', mon.id);
    await store.updateAlliance(rogue.id, { acceptsApplications: true });
    await store.updateAlliance(red.id, { acceptsApplications: true });
    await service.apply(han.id, rogue.id);
    await service.apply(han.id, red.id);
    const [toRogue] = await store.listApplicationsForAlliance(rogue.id);
    const [toRed] = await store.listApplicationsForAlliance(red.id);

    const results = await Promise.allSettled([
      service.acceptApplication(leia.id, toRogue.id),
      service.acceptApplication(mon.id, toRed.id),
    ]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find(
      (r): r is PromiseRejectedResult => r.status === 'rejected',
    );
    expect(rejected?.reason.message).toBe(
      'Der Siedler ist bereits Mitglied einer Allianz',
    );
    const membership = await store.findMembership(han.id);
    expect([rogue.id, red.id]).toContain(membership?.allianceId);
    expect(await store.listApplicationsOfPlayer(han.id)).toEqual([]);
  });

  it('closing applications and a concurrent application never leave one behind', async () => {
    const leia = await rebel();
    const rogue = await alliance('Rogue Squadron', leia.id);
    await store.updateAlliance(rogue.id, { acceptsApplications: true });
    const applicants = await Promise.all([rebel(), rebel(), rebel()]);

    await Promise.allSettled([
      ...applicants.map((a) => service.apply(a.id, rogue.id)),
      service.update(leia.id, rogue.id, { acceptsApplications: false }),
    ]);

    expect((await store.findAlliance(rogue.id))?.acceptsApplications).toBe(
      false,
    );
    expect(await store.listApplicationsForAlliance(rogue.id)).toEqual([]);
  });

  it('kick and leave of the same member delete it exactly once', async () => {
    const leia = await rebel();
    const wedge = await rebel();
    const rogue = await alliance('Rogue Squadron', leia.id);
    await store.insertMembership({
      allianceId: rogue.id,
      userId: wedge.id,
      role: NONE,
    });

    const results = await Promise.allSettled([
      service.kick(leia.id, rogue.id, wedge.id),
      service.leave(wedge.id),
    ]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await store.findMembership(wedge.id)).toBeNull();
  });

  it('allows one application per player and alliance', async () => {
    const leia = await rebel();
    const han = await rebel();
    const rogue = await alliance('Rogue Squadron', leia.id);
    await store.insertApplication({ allianceId: rogue.id, userId: han.id });

    await expect(
      store.insertApplication({ allianceId: rogue.id, userId: han.id }),
    ).rejects.toEqual(new AllianceConstraintViolation('application'));
  });
});
