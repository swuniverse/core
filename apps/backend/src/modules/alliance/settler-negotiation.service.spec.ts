jest.mock('../messaging/messaging.service', () => ({
  MessagingService: class MessagingService {},
}));

import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  AllianceDiplomacyChronicleEventType,
  AllianceRelationshipType,
  AllianceRole,
  DiplomacyPartyType,
} from '@swuniverse/shared';
import { AllianceService } from './alliance.service';
import { playerParty } from './diplomacy-party';
import {
  NoPersonalContactStatusPort,
  RelationshipResolverService,
} from './relationship-resolver.service';
import {
  EMPIRE,
  InMemoryAllianceStore,
} from './testing/in-memory-alliance.store';

const { NONE, PRESIDENT, VICE, DIPLOMAT } = AllianceRole;
const { WAR, FRIENDSHIP, ALLIANCE, TRADE_AGREEMENT, VASSALAGE } =
  AllianceRelationshipType;

/** Settlers 1-3 (Rebels), Boba 4 (Empire settler), alliance members 10-13. */
function world() {
  const store = new InMemoryAllianceStore();
  const sent: Array<{ to: number; body: string }> = [];
  const messaging = {
    sendSystem: jest.fn(async (to: number, _subject: string, body: string) => {
      sent.push({ to, body });
    }),
  };
  const service = new AllianceService(store, messaging as never);
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
  return { store, sent, service };
}

type Ctx = ReturnType<typeof world>;

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

const active = (ctx: Ctx, viewer = 1) =>
  ctx.store.listActiveRelationships(playerParty(viewer));

/** Han proposes, Lando accepts. */
async function establish(
  ctx: Ctx,
  type: AllianceRelationshipType,
  extra: {
    contract?: string;
    permissions?: { treatAsFriend?: boolean; shareLivePositions?: boolean };
  } = {},
) {
  const { id } = await ctx.service.proposeSettlerRelationship(1, {
    recipientPlayerId: 2,
    type,
    ...extra,
  });
  await ctx.service.acceptRelationshipProposal(2, id);
  const [relationship] = await active(ctx);
  return relationship;
}

describe('Siedler negotiations', () => {
  describe('proposals between Siedler', () => {
    it.each([FRIENDSHIP, ALLIANCE, TRADE_AGREEMENT, VASSALAGE])(
      'lets the recipient accept a %s proposal with permissions and contract',
      async (type) => {
        const ctx = world();
        const permissions =
          type === ALLIANCE
            ? { treatAsFriend: true, shareLivePositions: true }
            : { treatAsFriend: true };
        const { id } = await ctx.service.proposeSettlerRelationship(1, {
          recipientPlayerId: 2,
          type,
          contract: '  Unser Pakt  ',
          permissions,
        });
        expect(ctx.sent).toEqual([
          { to: 2, body: 'Han hat einen Beziehungsvorschlag gesendet' },
        ]);

        await ctx.service.acceptRelationshipProposal(2, id);

        expect(await active(ctx)).toEqual([
          expect.objectContaining({
            type,
            contract: 'Unser Pakt',
            treatAsFriend: true,
            shareLivePositions: type === ALLIANCE,
          }),
        ]);
        expect(
          await ctx.store.listRelationshipProposals(playerParty(1)),
        ).toEqual([]);
        expect(ctx.sent.at(-1)).toEqual({
          to: 1,
          body: 'Lando hat den Beziehungsvorschlag angenommen',
        });
      },
    );

    it('makes the sender the lord of a vassalage', async () => {
      const ctx = world();
      const relationship = await establish(ctx, VASSALAGE);
      expect(relationship.lordParty).toEqual(playerParty(1));
      expect(relationship.vassalParty).toEqual(playerParty(2));
    });

    it('lets the recipient decline and the sender withdraw', async () => {
      const ctx = world();
      const first = await ctx.service.proposeSettlerRelationship(1, {
        recipientPlayerId: 2,
        type: FRIENDSHIP,
      });
      await ctx.service.declineRelationshipProposal(2, first.id);
      expect(await active(ctx)).toEqual([]);
      expect(ctx.sent.at(-1)?.body).toBe(
        'Lando hat den Beziehungsvorschlag abgelehnt',
      );

      const second = await ctx.service.proposeSettlerRelationship(1, {
        recipientPlayerId: 2,
        type: FRIENDSHIP,
      });
      await ctx.service.withdrawRelationshipProposal(1, second.id);
      expect(await ctx.store.listRelationshipProposals(playerParty(1))).toEqual(
        [],
      );
      expect(ctx.sent.at(-1)).toEqual({
        to: 2,
        body: 'Han hat den Beziehungsvorschlag zurückgezogen',
      });
    });

    it('allows at most one proposal per pair', async () => {
      const ctx = world();
      await ctx.service.proposeSettlerRelationship(1, {
        recipientPlayerId: 2,
        type: FRIENDSHIP,
      });
      await expectError(
        ctx.service.proposeSettlerRelationship(2, {
          recipientPlayerId: 1,
          type: ALLIANCE,
        }),
        BadRequestException,
      );
    });

    it('replaces the active relationship when a type change is accepted and chronicles it', async () => {
      const ctx = world();
      await establish(ctx, FRIENDSHIP);
      await establish(ctx, ALLIANCE);

      const relationships = await active(ctx);
      expect(relationships).toHaveLength(1);
      expect(relationships[0].type).toBe(ALLIANCE);
      const chronicle = await ctx.service.listSettlerDiplomacyChronicle(3, 1);
      expect(chronicle.entries.map((entry) => entry.type)).toEqual([
        AllianceDiplomacyChronicleEventType.RELATIONSHIP_CHANGED,
        AllianceDiplomacyChronicleEventType.RELATIONSHIP_STARTED,
      ]);
    });

    it('chronicles an accepted contract with names and vassalage direction, without the text', async () => {
      const ctx = world();
      await establish(ctx, VASSALAGE, { contract: 'geheim' });
      const [entry] = (await ctx.service.listSettlerDiplomacyChronicle(3, 2))
        .entries;
      expect(entry).toEqual(
        expect.objectContaining({
          type: AllianceDiplomacyChronicleEventType.RELATIONSHIP_STARTED,
          actor: { userId: 2, name: 'Lando' },
          firstPartyType: DiplomacyPartyType.PLAYER,
          secondPartyType: DiplomacyPartyType.PLAYER,
        }),
      );
      expect(entry.relationship.vassalage).toEqual(
        expect.objectContaining({ lordAllianceId: 1, vassalAllianceId: 2 }),
      );
      expect(JSON.stringify(entry)).not.toContain('geheim');
    });

    it('rejects ordinary types during war and war as a proposal', async () => {
      const ctx = world();
      await ctx.service.declareSettlerWar(1, 2);
      await expectError(
        ctx.service.proposeSettlerRelationship(1, {
          recipientPlayerId: 2,
          type: TRADE_AGREEMENT,
        }),
        BadRequestException,
      );
      await expectError(
        ctx.service.proposeSettlerRelationship(1, {
          recipientPlayerId: 2,
          type: WAR,
        }),
        BadRequestException,
      );
    });

    it('validates permissions and the Vertragswerk length after trim', async () => {
      const ctx = world();
      const propose = (type: AllianceRelationshipType, extra: object) =>
        ctx.service.proposeSettlerRelationship(1, {
          recipientPlayerId: 2,
          type,
          ...extra,
        });
      await expectError(
        propose(FRIENDSHIP, { permissions: { shareLivePositions: true } }),
        BadRequestException,
      );
      await expectError(
        propose(FRIENDSHIP, { permissions: { treatAsFriend: 'yes' } }),
        BadRequestException,
      );
      await expectError(
        propose(FRIENDSHIP, { contract: 'x'.repeat(20_001) }),
        BadRequestException,
      );
      await expectError(
        propose(FRIENDSHIP, { contract: 5 }),
        BadRequestException,
      );
      const { id } = await propose(FRIENDSHIP, {
        contract: `  ${'x'.repeat(20_000)}  `,
      });
      expect(
        (await ctx.store.findRelationshipProposal(id))?.contract,
      ).toHaveLength(20_000);
      await ctx.service.withdrawRelationshipProposal(1, id);
      await propose(FRIENDSHIP, { contract: '' });
    });

    it('rejects members, the opposing faction and foreign targets', async () => {
      const ctx = world();
      const propose = (actor: number, recipientPlayerId: number) =>
        ctx.service.proposeSettlerRelationship(actor, {
          recipientPlayerId,
          type: FRIENDSHIP,
        });
      for (const member of [10, 11, 12, 13]) {
        await expectError(propose(member, 1), ForbiddenException);
      }
      await expectError(propose(4, 1), BadRequestException);
      await expectError(propose(1, 4), BadRequestException);
      await expectError(propose(1, 13), BadRequestException);
      await expectError(propose(1, 1), BadRequestException);
    });

    it('refuses answers from members, foreign settlers and the opposing faction', async () => {
      const ctx = world();
      const { id } = await ctx.service.proposeSettlerRelationship(1, {
        recipientPlayerId: 2,
        type: FRIENDSHIP,
      });
      for (const actor of [10, 11, 12, 13, 3, 4, 1]) {
        await expectError(
          ctx.service.acceptRelationshipProposal(actor, id),
          ForbiddenException,
        );
        await expectError(
          ctx.service.declineRelationshipProposal(actor, id),
          ForbiddenException,
        );
      }
      for (const actor of [10, 11, 12, 13, 3, 4, 2]) {
        await expectError(
          ctx.service.withdrawRelationshipProposal(actor, id),
          ForbiddenException,
        );
      }
    });
  });

  describe('confidentiality', () => {
    it('shows drafts only to the two parties and the active contract publicly', async () => {
      const ctx = world();
      const { id } = await ctx.service.proposeSettlerRelationship(1, {
        recipientPlayerId: 2,
        type: FRIENDSHIP,
        contract: 'Entwurf',
      });
      expect((await ctx.service.getSettlerDiplomacy(1)).proposals).toHaveLength(
        1,
      );
      expect((await ctx.service.getSettlerDiplomacy(2)).proposals).toHaveLength(
        1,
      );
      expect(await ctx.service.getSettlerDiplomacy(3)).toEqual(
        expect.objectContaining({ proposals: [], relationships: [] }),
      );

      await ctx.service.acceptRelationshipProposal(2, id);
      const [relationship] = await active(ctx);
      await expect(
        ctx.service.getPublicSettlerRelationshipContract(1, relationship.id),
      ).resolves.toEqual({
        relationshipId: relationship.id,
        contract: 'Entwurf',
      });
      await expectError(
        ctx.service.getPublicSettlerRelationshipContract(3, relationship.id),
        NotFoundException,
      );
    });

    it('keeps change drafts invisible to unrelated settlers', async () => {
      const ctx = world();
      const relationship = await establish(ctx, FRIENDSHIP);
      await ctx.service.proposeRelationshipChange(1, relationship.id, {
        contract: 'Neuer Entwurf',
      });
      const third = await ctx.service.getSettlerDiplomacy(3);
      expect(JSON.stringify(third)).not.toContain('Neuer Entwurf');
    });
  });

  describe('changes with consent', () => {
    it('keeps the old state until the recipient accepts', async () => {
      const ctx = world();
      const relationship = await establish(ctx, ALLIANCE, {
        contract: 'alt',
      });
      const { id } = await ctx.service.proposeRelationshipChange(
        2,
        relationship.id,
        {
          contract: 'neu',
          permissions: { treatAsFriend: true, shareLivePositions: true },
        },
      );
      expect(ctx.sent.at(-1)).toEqual({
        to: 1,
        body: 'Lando hat eine Beziehungsänderung vorgeschlagen',
      });
      expect(await active(ctx)).toEqual([
        expect.objectContaining({ contract: 'alt', treatAsFriend: false }),
      ]);

      await expectError(
        ctx.service.acceptRelationshipChange(2, id),
        ForbiddenException,
      );
      await ctx.service.acceptRelationshipChange(1, id);

      expect(await active(ctx)).toEqual([
        expect.objectContaining({
          contract: 'neu',
          treatAsFriend: true,
          shareLivePositions: true,
        }),
      ]);
      expect(ctx.sent.at(-1)).toEqual({
        to: 2,
        body: 'Han hat die Beziehungsänderung angenommen',
      });
    });

    it('lets the recipient decline and the sender withdraw', async () => {
      const ctx = world();
      const relationship = await establish(ctx, FRIENDSHIP);
      const first = await ctx.service.proposeRelationshipChange(
        1,
        relationship.id,
        { contract: 'a' },
      );
      await ctx.service.declineRelationshipChange(2, first.id);
      expect((await active(ctx))[0].contract).toBe('');
      const second = await ctx.service.proposeRelationshipChange(
        1,
        relationship.id,
        { contract: 'b' },
      );
      await ctx.service.withdrawRelationshipChange(1, second.id);
      expect(
        await ctx.store.listRelationshipChangeProposals(playerParty(1)),
      ).toEqual([]);
    });

    it('rejects unchanged, invalid and concurrent change proposals', async () => {
      const ctx = world();
      const relationship = await establish(ctx, FRIENDSHIP, { contract: 'x' });
      await expectError(
        ctx.service.proposeRelationshipChange(1, relationship.id, {
          contract: ' x ',
        }),
        BadRequestException,
      );
      await expectError(
        ctx.service.proposeRelationshipChange(1, relationship.id, {
          contract: 'x',
          permissions: { shareLivePositions: true },
        }),
        BadRequestException,
      );
      await ctx.service.proposeRelationshipChange(1, relationship.id, {
        contract: 'y',
      });
      await expectError(
        ctx.service.proposeRelationshipChange(2, relationship.id, {
          contract: 'z',
        }),
        Error,
      );
    });

    it('refuses members, foreign settlers and the opposing faction', async () => {
      const ctx = world();
      const relationship = await establish(ctx, FRIENDSHIP);
      const { id } = await ctx.service.proposeRelationshipChange(
        1,
        relationship.id,
        { contract: 'y' },
      );
      for (const actor of [10, 11, 12, 13, 3, 4, 999]) {
        await expectError(
          ctx.service.proposeRelationshipChange(actor, relationship.id, {
            contract: 'q',
          }),
          ForbiddenException,
        );
        await expectError(
          ctx.service.acceptRelationshipChange(actor, id),
          ForbiddenException,
        );
        await expectError(
          ctx.service.declineRelationshipChange(actor, id),
          ForbiddenException,
        );
        await expectError(
          ctx.service.withdrawRelationshipChange(actor, id),
          ForbiddenException,
        );
      }
    });

    it('does not allow changes to a war', async () => {
      const ctx = world();
      await ctx.service.declareSettlerWar(1, 2);
      const [war] = await active(ctx);
      await expectError(
        ctx.service.proposeRelationshipChange(1, war.id, { contract: 'x' }),
        NotFoundException,
      );
    });
  });

  describe('ending a relationship', () => {
    it.each([1, 2])(
      'lets party %s end it with chronicle and message',
      async (actor) => {
        const ctx = world();
        const relationship = await establish(ctx, ALLIANCE);

        await ctx.service.endRelationship(actor, relationship.id);

        expect(await active(ctx)).toEqual([]);
        const [entry] = (await ctx.service.listSettlerDiplomacyChronicle(3, 1))
          .entries;
        expect(entry).toEqual(
          expect.objectContaining({
            type: AllianceDiplomacyChronicleEventType.RELATIONSHIP_ENDED,
            actor: { userId: actor, name: actor === 1 ? 'Han' : 'Lando' },
          }),
        );
        expect(ctx.sent.at(-1)).toEqual({
          to: actor === 1 ? 2 : 1,
          body: `${actor === 1 ? 'Han' : 'Lando'} hat die Beziehung beendet`,
        });
      },
    );

    it('refuses members, foreign settlers and the opposing faction', async () => {
      const ctx = world();
      const relationship = await establish(ctx, FRIENDSHIP);
      for (const actor of [10, 11, 12, 13, 3, 4, 999]) {
        await expectError(
          ctx.service.endRelationship(actor, relationship.id),
          ForbiddenException,
        );
      }
      expect(await active(ctx)).toHaveLength(1);
    });
  });

  describe('server-provided action flags', () => {
    it('offers change, end and consent actions according to the pending change', async () => {
      const ctx = world();
      const relationship = await establish(ctx, FRIENDSHIP);
      const flags = async (viewer: number) =>
        (await ctx.service.getSettlerDiplomacy(viewer)).relationships[0];

      expect((await flags(1)).capabilities).toEqual(
        expect.objectContaining({
          change: true,
          end: true,
          declareWar: true,
          offerPeace: false,
          accept: false,
        }),
      );

      await ctx.service.proposeRelationshipChange(1, relationship.id, {
        contract: 'neu',
      });
      expect(await flags(1)).toEqual(
        expect.objectContaining({
          change: expect.objectContaining({ direction: 'SENT' }),
          capabilities: expect.objectContaining({
            withdraw: true,
            accept: false,
            decline: false,
          }),
        }),
      );
      expect(await flags(2)).toEqual(
        expect.objectContaining({
          change: expect.objectContaining({ direction: 'RECEIVED' }),
          capabilities: expect.objectContaining({
            withdraw: false,
            accept: true,
            decline: true,
          }),
        }),
      );
    });

    it('allows no change or end for war and reports create', async () => {
      const ctx = world();
      await ctx.service.declareSettlerWar(1, 2);
      const view = await ctx.service.getSettlerDiplomacy(1);
      expect(view.capabilities).toEqual({ create: true, declareWar: true });
      expect(view.relationships[0].capabilities).toEqual(
        expect.objectContaining({ change: false, end: false }),
      );
    });
  });

  describe('central resolution', () => {
    it('makes Siedler friends through treatAsFriend and enemies again through war', async () => {
      const ctx = world();
      const resolver = new RelationshipResolverService(
        ctx.store,
        new NoPersonalContactStatusPort(),
      );
      await expect(resolver.resolve(1, 2)).resolves.toMatchObject({
        status: 'NEUTRAL',
      });

      await establish(ctx, TRADE_AGREEMENT, {
        permissions: { treatAsFriend: true },
      });
      await expect(resolver.resolve(1, 2)).resolves.toMatchObject({
        status: 'FRIEND',
      });
      await expect(resolver.resolve(2, 1)).resolves.toMatchObject({
        status: 'FRIEND',
      });
      await expect(resolver.resolve(3, 2)).resolves.toMatchObject({
        status: 'NEUTRAL',
      });

      await ctx.service.declareSettlerWar(2, 1);
      await expect(resolver.resolve(1, 2)).resolves.toMatchObject({
        status: 'ENEMY',
      });
    });
  });
});
