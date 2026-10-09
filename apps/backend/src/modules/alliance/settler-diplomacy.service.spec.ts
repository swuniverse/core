jest.mock('../messaging/messaging.service', () => ({
  MessagingService: class MessagingService {},
}));

import {
  BadRequestException,
  ForbiddenException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  AllianceDiplomacyChronicleEventType,
  AllianceRelationshipType,
  AllianceRole,
  DiplomacyPartyType,
} from '@swuniverse/shared';
import { AllianceService } from './alliance.service';
import { AllianceRateLimiterService } from './alliance-rate-limiter.service';
import { playerParty } from './diplomacy-party';
import {
  EMPIRE,
  InMemoryAllianceStore,
} from './testing/in-memory-alliance.store';

const { NONE, PRESIDENT, VICE, DIPLOMAT } = AllianceRole;
const { WAR, PEACE, FRIENDSHIP } = AllianceRelationshipType;

function setup(rateLimiter?: AllianceRateLimiterService) {
  const store = new InMemoryAllianceStore();
  const sent: Array<{ to: number; body: string }> = [];
  const messaging = {
    sendSystem: jest.fn(async (to: number, _subject: string, body: string) => {
      sent.push({ to, body });
    }),
  };
  const service = new AllianceService(store, messaging as never, rateLimiter);
  return { store, sent, messaging, service };
}

/** Settlers 1-3 (Rebels), Boba 4 (Empire settler), alliance members 10-13. */
function world(rateLimiter?: AllianceRateLimiterService) {
  const ctx = setup(rateLimiter);
  const { store } = ctx;
  store.addPlayer(1, 'Han');
  store.addPlayer(2, 'Lando');
  store.addPlayer(3, 'Chewie');
  store.addPlayer(4, 'Boba', EMPIRE.id);
  store.addPlayer(10, 'Leia');
  store.addPlayer(11, 'Mon');
  store.addPlayer(12, 'Wedge');
  store.addPlayer(13, 'Biggs');
  store.seedAlliance({ name: 'Rogue Squadron' }, [
    [10, PRESIDENT],
    [11, DIPLOMAT],
    [12, VICE],
    [13, NONE],
  ]);
  return ctx;
}

async function expectError(
  promise: Promise<unknown>,
  type: new (...args: never[]) => Error,
) {
  const error = await promise.then(
    () => {
      throw new Error('expected rejection');
    },
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(type);
}

async function declareWarAndProposePeace(ctx: ReturnType<typeof world>) {
  await ctx.service.declareSettlerWar(1, 2);
  const { id } = await ctx.service.proposeSettlerRelationship(1, {
    recipientPlayerId: 2,
    type: PEACE,
  });
  return id;
}

describe('Siedler war and peace', () => {
  describe('declareSettlerWar', () => {
    it('makes war active at once, replaces the pair state and tells the target', async () => {
      const ctx = world();
      const { service, store, sent } = ctx;
      await store.insertRelationshipProposal({
        senderParty: playerParty(2),
        recipientParty: playerParty(1),
        type: PEACE,
        contract: '',
        treatAsFriend: false,
        shareLivePositions: false,
      });

      await service.declareSettlerWar(1, 2);

      expect(await store.listActiveRelationships(playerParty(1))).toEqual([
        expect.objectContaining({
          type: WAR,
          firstParty: playerParty(1),
          secondParty: playerParty(2),
        }),
      ]);
      expect(await store.listRelationshipProposals(playerParty(1))).toEqual([]);
      expect(sent).toEqual([{ to: 2, body: 'Han hat den Krieg erklärt' }]);
    });

    it('replaces an active friendship of the pair with war', async () => {
      const { service, store } = world();
      store.seedActiveAllianceRelationship({
        firstParty: playerParty(1),
        secondParty: playerParty(2),
        type: FRIENDSHIP,
        treatAsFriend: true,
      });

      await service.declareSettlerWar(2, 1);

      expect(await store.listActiveRelationships(playerParty(1))).toEqual([
        expect.objectContaining({ type: WAR, treatAsFriend: false }),
      ]);
    });

    it('records the chronicle with player names as of the event time', async () => {
      const { service, store } = world();
      await service.declareSettlerWar(1, 2);
      store.renamePlayer(2, 'Lando Calrissian');

      for (const viewer of [1, 3]) {
        const chronicle = await service.listSettlerDiplomacyChronicle(viewer, 2);
        expect(chronicle.entries).toEqual([
          expect.objectContaining({
            type: AllianceDiplomacyChronicleEventType.WAR_DECLARED,
            actor: { userId: 1, name: 'Han' },
            firstAlliance: { id: 1, name: 'Han' },
            secondAlliance: { id: 2, name: 'Lando' },
            firstPartyType: DiplomacyPartyType.PLAYER,
            secondPartyType: DiplomacyPartyType.PLAYER,
          }),
        ]);
      }
    });

    it('rejects alliance members of every office', async () => {
      const { service, store } = world();
      for (const member of [10, 11, 12, 13]) {
        await expectError(
          service.declareSettlerWar(member, 1),
          ForbiddenException,
        );
      }
      expect(await store.listActiveRelationships(playerParty(1))).toEqual([]);
    });

    it('rejects unknown actors, the opposing faction, foreign IDs, members and self as targets', async () => {
      const { service, store } = world();
      await expectError(service.declareSettlerWar(999, 1), ForbiddenException);
      await expectError(service.declareSettlerWar(4, 1), BadRequestException);
      await expectError(service.declareSettlerWar(1, 4), BadRequestException);
      await expectError(service.declareSettlerWar(1, 999), BadRequestException);
      await expectError(service.declareSettlerWar(1, 1), BadRequestException);
      await expectError(service.declareSettlerWar(1, 13), BadRequestException);
      expect(await store.listActiveRelationships(playerParty(1))).toEqual([]);
      expect(await store.listActiveRelationships(playerParty(4))).toEqual([]);
    });

    it('is rate limited per acting player', async () => {
      const { service } = world(
        AllianceRateLimiterService.forTesting({ maximumAttempts: 1 }),
      );
      await service.declareSettlerWar(1, 2);
      await expectError(service.declareSettlerWar(1, 3), BadRequestException);
      await service.declareSettlerWar(3, 2);
    });

    it('commits even when delivery fails and delivers on retry', async () => {
      const { service, store, sent, messaging } = world();
      jest
        .spyOn((service as unknown as { logger: Logger }).logger, 'error')
        .mockImplementation();
      messaging.sendSystem.mockRejectedValueOnce(new Error('down'));

      await service.declareSettlerWar(1, 2);

      expect(await store.listActiveRelationships(playerParty(1))).toHaveLength(
        1,
      );
      expect(sent).toEqual([]);
      await service.retryDiplomacyNotifications();
      expect(sent).toEqual([{ to: 2, body: 'Han hat den Krieg erklärt' }]);
      await service.retryDiplomacyNotifications();
      expect(sent).toHaveLength(1);
    });
  });

  describe('peace negotiation', () => {
    it('lets the recipient accept peace, which replaces the war', async () => {
      const ctx = world();
      const { service, store, sent } = ctx;
      const proposalId = await declareWarAndProposePeace(ctx);
      sent.length = 0;

      await service.acceptRelationshipProposal(2, proposalId);

      expect(await store.listActiveRelationships(playerParty(1))).toEqual([
        expect.objectContaining({ type: PEACE }),
      ]);
      expect(await store.listRelationshipProposals(playerParty(1))).toEqual([]);
      expect(sent).toEqual([
        { to: 1, body: 'Lando hat den Beziehungsvorschlag angenommen' },
      ]);
      const chronicle = await service.listSettlerDiplomacyChronicle(1, 1);
      expect(chronicle.entries.map((entry) => entry.type)).toEqual([
        AllianceDiplomacyChronicleEventType.RELATIONSHIP_CHANGED,
        AllianceDiplomacyChronicleEventType.WAR_DECLARED,
      ]);
      expect(chronicle.entries[0].relationship.type).toBe(PEACE);
    });

    it('keeps the war when the recipient declines', async () => {
      const ctx = world();
      const proposalId = await declareWarAndProposePeace(ctx);
      ctx.sent.length = 0;

      await ctx.service.declineRelationshipProposal(2, proposalId);

      expect(await ctx.store.listActiveRelationships(playerParty(1))).toEqual([
        expect.objectContaining({ type: WAR }),
      ]);
      expect(await ctx.store.listRelationshipProposals(playerParty(1))).toEqual(
        [],
      );
      expect(ctx.sent).toEqual([
        { to: 1, body: 'Lando hat den Beziehungsvorschlag abgelehnt' },
      ]);
    });

    it('lets the sender withdraw the proposal and propose again', async () => {
      const ctx = world();
      const proposalId = await declareWarAndProposePeace(ctx);
      ctx.sent.length = 0;

      await ctx.service.withdrawRelationshipProposal(1, proposalId);

      expect(ctx.sent).toEqual([
        { to: 2, body: 'Han hat den Beziehungsvorschlag zurückgezogen' },
      ]);
      await ctx.service.proposeSettlerRelationship(2, {
        recipientPlayerId: 1,
        type: PEACE,
      });
    });

    it('allows peace only out of war, only one proposal per pair and no other types yet', async () => {
      const ctx = world();
      const { service } = ctx;
      await expectError(
        service.proposeSettlerRelationship(1, {
          recipientPlayerId: 2,
          type: PEACE,
        }),
        BadRequestException,
      );
      await service.declareSettlerWar(1, 2);
      await expectError(
        service.proposeSettlerRelationship(1, {
          recipientPlayerId: 2,
          type: FRIENDSHIP,
        }),
        BadRequestException,
      );
      await service.proposeSettlerRelationship(1, {
        recipientPlayerId: 2,
        type: PEACE,
      });
      await expectError(
        service.proposeSettlerRelationship(2, {
          recipientPlayerId: 1,
          type: PEACE,
        }),
        BadRequestException,
      );
    });

    it('cannot end a war directly', async () => {
      const { service, store } = world();
      await service.declareSettlerWar(1, 2);
      const [war] = await store.listActiveRelationships(playerParty(1));

      await expectError(service.endRelationship(1, war.id), NotFoundException);

      expect(await store.listActiveRelationships(playerParty(1))).toHaveLength(
        1,
      );
    });

    it('rejects alliance members, opposing faction and foreign IDs as proposers and recipients', async () => {
      const { service } = world();
      await service.declareSettlerWar(1, 2);
      const peace = (actor: number, recipientPlayerId: number) =>
        service.proposeSettlerRelationship(actor, {
          recipientPlayerId,
          type: PEACE,
        });
      await expectError(peace(10, 1), ForbiddenException);
      await expectError(peace(4, 1), BadRequestException);
      await expectError(peace(1, 4), BadRequestException);
      await expectError(peace(1, 999), BadRequestException);
      await expectError(peace(1, 1), BadRequestException);
      await expectError(peace(1, 13), BadRequestException);
      await expectError(peace(3, 1), BadRequestException);
    });

    it('refuses answers from alliance members, foreign settlers and the wrong side', async () => {
      const ctx = world();
      const { service, store } = ctx;
      const proposalId = await declareWarAndProposePeace(ctx);
      const answers = [
        (actor: number) => service.acceptRelationshipProposal(actor, proposalId),
        (actor: number) => service.declineRelationshipProposal(actor, proposalId),
      ];
      for (const answer of answers) {
        for (const actor of [10, 11, 12, 13, 3, 4, 999, 1]) {
          await expectError(answer(actor), ForbiddenException);
        }
      }
      for (const actor of [10, 11, 12, 13, 3, 4, 999, 2]) {
        await expectError(
          service.withdrawRelationshipProposal(actor, proposalId),
          ForbiddenException,
        );
      }
      expect(await store.listRelationshipProposals(playerParty(1))).toHaveLength(
        1,
      );
    });

    it('does not let a player who joined an alliance answer for the player party', async () => {
      const ctx = world();
      const proposalId = await declareWarAndProposePeace(ctx);
      await ctx.store.insertMembership({
        allianceId: 1,
        userId: 2,
        role: NONE,
      });

      await expectError(
        ctx.service.acceptRelationshipProposal(2, proposalId),
        ForbiddenException,
      );
    });
  });

  describe('getSettlerDiplomacy', () => {
    it('shows relationships and proposals separately with server-provided actions', async () => {
      const ctx = world();
      const { service } = ctx;
      await service.declareSettlerWar(1, 2);
      await service.declareSettlerWar(3, 1);
      await service.proposeSettlerRelationship(1, {
        recipientPlayerId: 2,
        type: PEACE,
      });

      const own = await service.getSettlerDiplomacy(1);
      expect(own.capabilities).toEqual({ declareWar: true });
      const byName = Object.fromEntries(
        own.relationships.map((entry) => [
          entry.relationship.counterparty.name,
          entry,
        ]),
      );
      expect(byName.Lando.relationship).toEqual(
        expect.objectContaining({
          type: WAR,
          counterpartyType: DiplomacyPartyType.PLAYER,
          counterparty: { id: 2, name: 'Lando', color: null },
        }),
      );
      // A pending peace proposal blocks a second offer for the same pair.
      expect(byName.Lando.capabilities).toEqual(
        expect.objectContaining({
          declareWar: false,
          offerPeace: false,
          end: false,
          change: false,
        }),
      );
      expect(byName.Chewie.capabilities).toEqual(
        expect.objectContaining({ declareWar: false, offerPeace: true }),
      );
      expect(own.proposals).toEqual([
        expect.objectContaining({
          direction: 'SENT',
          capabilities: expect.objectContaining({
            accept: false,
            decline: false,
            withdraw: true,
          }),
        }),
      ]);

      const other = await service.getSettlerDiplomacy(2);
      expect(other.proposals).toEqual([
        expect.objectContaining({
          direction: 'RECEIVED',
          capabilities: expect.objectContaining({
            accept: true,
            decline: true,
            withdraw: false,
          }),
        }),
      ]);
    });

    it('hides drafts from unrelated settlers and refuses alliance members', async () => {
      const { service } = world();
      await service.declareSettlerWar(1, 2);
      await service.proposeSettlerRelationship(1, {
        recipientPlayerId: 2,
        type: PEACE,
        contract: 'geheim',
      });

      expect((await service.getSettlerDiplomacy(3)).proposals).toEqual([]);
      expect((await service.getSettlerDiplomacy(4)).relationships).toEqual([]);
      for (const member of [10, 11, 12, 13, 999]) {
        await expectError(
          service.getSettlerDiplomacy(member),
          ForbiddenException,
        );
      }
    });

    it('offers the settler area only to alliance-less players', async () => {
      const { service } = world();
      expect((await service.getMyAlliance(1)).actions).toEqual({
        settlerDiplomacy: true,
      });
      expect(await service.getMyAlliance(10)).toEqual({
        alliance: expect.objectContaining({ name: 'Rogue Squadron' }),
        actions: { settlerDiplomacy: false },
      });
    });
  });

  describe('searchSettlerCounterparties', () => {
    function manySettlers(store: InMemoryAllianceStore, count: number) {
      for (let index = 0; index < count; index += 1) {
        store.addPlayer(100 + index, `Pilot ${String(index).padStart(2, '0')}`);
      }
    }

    it('lists only alliance-less players of the own faction, without the own person', async () => {
      const { service } = world();

      const page = await service.searchSettlerCounterparties(1);

      expect(page.players).toEqual([
        { id: 2, name: 'Lando' },
        { id: 3, name: 'Chewie' },
      ]);
      expect(page.nextCursor).toBeNull();
      expect(Object.keys(page.players[0]).sort()).toEqual(['id', 'name']);
    });

    it('filters by name case-insensitively and treats wildcards literally', async () => {
      const { service, store } = world();
      store.addPlayer(50, '100%_Pilot');

      expect(
        (await service.searchSettlerCounterparties(1, 'LAND')).players,
      ).toEqual([{ id: 2, name: 'Lando' }]);
      expect(
        (await service.searchSettlerCounterparties(1, '%_')).players,
      ).toEqual([{ id: 50, name: '100%_Pilot' }]);
      expect(
        (await service.searchSettlerCounterparties(1, '%')).players,
      ).toEqual([{ id: 50, name: '100%_Pilot' }]);
    });

    it('is paginated and bounded', async () => {
      const { service, store } = world();
      manySettlers(store, 60);

      const first = await service.searchSettlerCounterparties(
        1,
        'Pilot',
        undefined,
        1000,
      );
      expect(first.players).toHaveLength(50);
      expect(first.nextCursor).not.toBeNull();
      const second = await service.searchSettlerCounterparties(
        1,
        'Pilot',
        first.nextCursor!,
        1000,
      );
      expect(second.players).toHaveLength(10);
      expect(second.nextCursor).toBeNull();
      expect(
        new Set([...first.players, ...second.players].map((p) => p.id)).size,
      ).toBe(60);
      await expectError(
        service.searchSettlerCounterparties(1, 'x'.repeat(200)),
        BadRequestException,
      );
      await expectError(
        service.searchSettlerCounterparties(1, 'Pilot', 'garbage'),
        BadRequestException,
      );
    });

    it('is refused for alliance members and unknown players', async () => {
      const { service } = world();
      for (const member of [10, 11, 12, 13, 999]) {
        await expectError(
          service.searchSettlerCounterparties(member),
          ForbiddenException,
        );
      }
    });
  });
});
