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
import { allianceParty, playerParty } from './diplomacy-party';
import {
  NoPersonalContactStatusPort,
  RelationshipResolverService,
} from './relationship-resolver.service';
import {
  EMPIRE,
  InMemoryAllianceStore,
} from './testing/in-memory-alliance.store';

const { NONE, PRESIDENT, VICE, DIPLOMAT } = AllianceRole;
const { WAR, PEACE, FRIENDSHIP, ALLIANCE, TRADE_AGREEMENT, VASSALAGE } =
  AllianceRelationshipType;

/**
 * Settlers 1-3 (Rebels), Boba 4 (Empire settler); Rogue Squadron with
 * president 10, diplomat 11, vice 12, member 13; Phoenix (Rebels) with
 * president 20; Imperials (Empire) with president 30.
 */
function world() {
  const store = new InMemoryAllianceStore();
  const sent: Array<{ to: number; body: string }> = [];
  const messaging = {
    sendSystem: jest.fn(async (to: number, _subject: string, body: string) => {
      sent.push({ to, body });
    }),
  };
  const service = new AllianceService(store, messaging as never);
  const resolver = new RelationshipResolverService(
    store,
    new NoPersonalContactStatusPort(),
  );
  store.addPlayer(1, 'Han');
  store.addPlayer(2, 'Lando');
  store.addPlayer(3, 'Chewie');
  store.addPlayer(4, 'Boba', EMPIRE.id);
  for (const [id, name] of [
    [10, 'Leia'],
    [11, 'Mon'],
    [12, 'Wedge'],
    [13, 'Biggs'],
    [20, 'Ackbar'],
  ] as const) {
    store.addPlayer(id, name);
  }
  store.addPlayer(30, 'Vader', EMPIRE.id);
  const rogue = store.seedAlliance({ name: 'Rogue Squadron' }, [
    [10, PRESIDENT],
    [11, DIPLOMAT],
    [12, VICE],
    [13, NONE],
  ]);
  const phoenix = store.seedAlliance({ name: 'Phoenix' }, [[20, PRESIDENT]]);
  const imperials = store.seedAlliance(
    { name: 'Imperials', factionId: EMPIRE.id },
    [[30, PRESIDENT]],
  );
  return { store, sent, service, resolver, rogue, phoenix, imperials };
}
type Ctx = ReturnType<typeof world>;

async function rejects(promise: Promise<unknown>) {
  return promise.then(
    () => {
      throw new Error('expected rejection');
    },
    (e: unknown) => e,
  );
}
const expectForbidden = async (p: Promise<unknown>) =>
  expect(await rejects(p)).toBeInstanceOf(ForbiddenException);
const expectBadRequest = async (p: Promise<unknown>) =>
  expect(await rejects(p)).toBeInstanceOf(BadRequestException);

const MEMBERS = [10, 11, 12, 13];
type Perms = { treatAsFriend?: boolean; shareLivePositions?: boolean };

const ofHan = (ctx: Ctx) => ctx.store.listActiveRelationships(playerParty(1));

/** The alliance (as president Leia) proposes to Han, who accepts. */
async function allianceToHan(
  ctx: Ctx,
  type: AllianceRelationshipType,
  permissions: Perms = {},
) {
  const { id } = await ctx.service.proposeRelationship(10, ctx.rogue.id, {
    recipientPlayerId: 1,
    type,
    permissions,
  });
  await ctx.service.acceptRelationshipProposal(1, id);
}

/** Han proposes to the alliance, president Leia accepts. */
async function hanToAlliance(
  ctx: Ctx,
  type: AllianceRelationshipType,
  permissions: Perms = {},
) {
  const { id } = await ctx.service.proposeSettlerRelationship(1, {
    recipientAllianceId: ctx.rogue.id,
    type,
    permissions,
  });
  await ctx.service.acceptRelationshipProposal(10, id);
}

describe('Allianz↔Siedler relationships', () => {
  describe('the alliance proposes to a Siedler', () => {
    it.each([10, 11])(
      'lets office holder %i propose, notifies the Siedler and lets them accept',
      async (actor) => {
        const ctx = world();
        const { id } = await ctx.service.proposeRelationship(
          actor,
          ctx.rogue.id,
          { recipientPlayerId: 1, type: FRIENDSHIP, contract: 'Pakt' },
        );
        const name = actor === 10 ? 'Leia' : 'Mon';
        expect(ctx.sent).toEqual([
          {
            to: 1,
            body: `${name} hat im Namen der Allianz Rogue Squadron einen Beziehungsvorschlag gesendet`,
          },
        ]);

        await ctx.service.acceptRelationshipProposal(1, id);

        expect(await ofHan(ctx)).toEqual([
          expect.objectContaining({
            type: FRIENDSHIP,
            contract: 'Pakt',
            firstParty: allianceParty(ctx.rogue.id),
            secondParty: playerParty(1),
          }),
        ]);
        expect(
          ctx.sent
            .slice(1)
            .map((m) => m.to)
            .sort(),
        ).toEqual(MEMBERS);
        expect(ctx.sent.at(-1)?.body).toBe(
          'Han hat den Beziehungsvorschlag angenommen',
        );
      },
    );

    it.each([12, 13])(
      'refuses vice or member %i server-side',
      async (actor) => {
        const ctx = world();
        await expectForbidden(
          ctx.service.proposeRelationship(actor, ctx.rogue.id, {
            recipientPlayerId: 1,
            type: FRIENDSHIP,
          }),
        );
        await expectForbidden(
          ctx.service.declareWarOnSettler(actor, ctx.rogue.id, 1),
        );
        expect(ctx.sent).toEqual([]);
      },
    );

    it('refuses the president of a foreign alliance and a settler using a foreign alliance ID', async () => {
      const ctx = world();
      await expectForbidden(
        ctx.service.proposeRelationship(20, ctx.rogue.id, {
          recipientPlayerId: 1,
          type: FRIENDSHIP,
        }),
      );
      await expectForbidden(
        ctx.service.proposeRelationship(1, ctx.rogue.id, {
          recipientPlayerId: 2,
          type: FRIENDSHIP,
        }),
      );
    });

    it('rejects counterparties of the opposing faction, alliance members, the missing and ambiguous', async () => {
      const ctx = world();
      const propose = (request: object) =>
        ctx.service.proposeRelationship(10, ctx.rogue.id, {
          type: FRIENDSHIP,
          ...request,
        } as never);
      await expectBadRequest(propose({ recipientPlayerId: 4 }));
      await expectBadRequest(propose({ recipientPlayerId: 20 }));
      await expectBadRequest(propose({ recipientPlayerId: 999 }));
      await expectBadRequest(propose({}));
      await expectBadRequest(
        propose({ recipientPlayerId: 1, recipientAllianceId: ctx.phoenix.id }),
      );
      await expectBadRequest(
        propose({ recipientAllianceId: ctx.imperials.id }),
      );
    });
  });

  describe('a Siedler proposes to an alliance', () => {
    it.each([FRIENDSHIP, ALLIANCE, TRADE_AGREEMENT, VASSALAGE])(
      'lets the president accept a %s proposal, notifying every member',
      async (type) => {
        const ctx = world();
        const { id } = await ctx.service.proposeSettlerRelationship(1, {
          recipientAllianceId: ctx.rogue.id,
          type,
        });
        expect(ctx.sent.map((m) => m.to).sort()).toEqual(MEMBERS);
        expect(ctx.sent[0].body).toBe(
          'Han hat einen Beziehungsvorschlag gesendet',
        );

        await ctx.service.acceptRelationshipProposal(10, id);

        expect(await ofHan(ctx)).toEqual([expect.objectContaining({ type })]);
        expect(ctx.sent.at(-1)).toEqual({
          to: 1,
          body: 'Leia hat im Namen der Allianz Rogue Squadron den Beziehungsvorschlag angenommen',
        });
      },
    );

    it('lets the diplomat decline and the Siedler withdraw', async () => {
      const ctx = world();
      const first = await ctx.service.proposeSettlerRelationship(1, {
        recipientAllianceId: ctx.rogue.id,
        type: FRIENDSHIP,
      });
      await ctx.service.declineRelationshipProposal(11, first.id);
      const second = await ctx.service.proposeSettlerRelationship(1, {
        recipientAllianceId: ctx.rogue.id,
        type: FRIENDSHIP,
      });
      await ctx.service.withdrawRelationshipProposal(1, second.id);
      expect(await ctx.store.listRelationshipProposals(playerParty(1))).toEqual(
        [],
      );
    });

    it.each([12, 13, 20, 2])(
      'refuses user %i answering a proposal to the alliance',
      async (actor) => {
        const ctx = world();
        const { id } = await ctx.service.proposeSettlerRelationship(1, {
          recipientAllianceId: ctx.rogue.id,
          type: FRIENDSHIP,
        });
        await expectForbidden(
          ctx.service.acceptRelationshipProposal(actor, id),
        );
        await expectForbidden(
          ctx.service.declineRelationshipProposal(actor, id),
        );
        await expectForbidden(
          ctx.service.withdrawRelationshipProposal(actor, id),
        );
      },
    );

    it('keeps the vassalage direction: proposer is lord', async () => {
      const ctx = world();
      await hanToAlliance(ctx, VASSALAGE);
      const [relationship] = await ofHan(ctx);
      expect(relationship.lordParty).toEqual(playerParty(1));
      expect(relationship.vassalParty).toEqual(allianceParty(ctx.rogue.id));
    });

    it('refuses alliance members and foreign-faction or ambiguous targets', async () => {
      const ctx = world();
      await expectForbidden(
        ctx.service.proposeSettlerRelationship(10, {
          recipientAllianceId: ctx.phoenix.id,
          type: FRIENDSHIP,
        }),
      );
      await expectBadRequest(
        ctx.service.proposeSettlerRelationship(1, {
          recipientAllianceId: ctx.imperials.id,
          type: FRIENDSHIP,
        }),
      );
      await expectBadRequest(
        ctx.service.proposeSettlerRelationship(4, {
          recipientAllianceId: ctx.rogue.id,
          type: FRIENDSHIP,
        }),
      );
      await expectBadRequest(
        ctx.service.proposeSettlerRelationship(1, {
          recipientPlayerId: 2,
          recipientAllianceId: ctx.rogue.id,
          type: FRIENDSHIP,
        }),
      );
    });
  });

  describe('war and peace', () => {
    it('lets the alliance declare war on a Siedler, informing only the Siedler', async () => {
      const ctx = world();
      await ctx.service.declareWarOnSettler(11, ctx.rogue.id, 1);
      expect(ctx.sent).toEqual([
        {
          to: 1,
          body: 'Mon hat im Namen der Allianz Rogue Squadron den Krieg erklärt',
        },
      ]);
      expect(await ofHan(ctx)).toEqual([
        expect.objectContaining({
          type: WAR,
          firstParty: allianceParty(ctx.rogue.id),
          secondParty: playerParty(1),
        }),
      ]);
    });

    it('lets a Siedler declare war on an alliance, informing every member', async () => {
      const ctx = world();
      await hanToAlliance(ctx, FRIENDSHIP);
      ctx.sent.length = 0;
      await ctx.service.declareSettlerWarOnAlliance(1, ctx.rogue.id);
      expect(ctx.sent.map((m) => m.to).sort()).toEqual(MEMBERS);
      expect(ctx.sent[0].body).toBe('Han hat den Krieg erklärt');
      expect((await ofHan(ctx)).map((r) => r.type)).toEqual([WAR]);
    });

    it('refuses war across factions, against the own side and by the wrong actor', async () => {
      const ctx = world();
      await expectBadRequest(
        ctx.service.declareWarOnSettler(10, ctx.rogue.id, 4),
      );
      await expectBadRequest(
        ctx.service.declareWarOnSettler(10, ctx.rogue.id, 11),
      );
      await expectBadRequest(
        ctx.service.declareSettlerWarOnAlliance(1, ctx.imperials.id),
      );
      await expectBadRequest(ctx.service.declareSettlerWarOnAlliance(1, 999));
      await expectForbidden(
        ctx.service.declareSettlerWarOnAlliance(10, ctx.phoenix.id),
      );
    });

    it('ends war only through peace accepted by an office holder', async () => {
      const ctx = world();
      await ctx.service.declareWarOnSettler(10, ctx.rogue.id, 1);
      const { id } = await ctx.service.proposeSettlerRelationship(1, {
        recipientAllianceId: ctx.rogue.id,
        type: PEACE,
      });
      await expectForbidden(ctx.service.acceptRelationshipProposal(12, id));
      await ctx.service.acceptRelationshipProposal(10, id);
      expect((await ofHan(ctx)).map((r) => r.type)).toEqual([PEACE]);
    });
  });

  describe('ending and changing', () => {
    it('lets the diplomat and the Siedler end, refuses vice and others', async () => {
      const ctx = world();
      await allianceToHan(ctx, FRIENDSHIP);
      const [relationship] = await ofHan(ctx);
      await expectForbidden(ctx.service.endRelationship(12, relationship.id));
      await expectForbidden(ctx.service.endRelationship(13, relationship.id));
      await expectForbidden(ctx.service.endRelationship(2, relationship.id));
      await ctx.service.endRelationship(11, relationship.id);
      expect(await ofHan(ctx)).toEqual([]);
    });

    it('needs the other side to consent to a change', async () => {
      const ctx = world();
      await allianceToHan(ctx, ALLIANCE);
      const [relationship] = await ofHan(ctx);
      await expectForbidden(
        ctx.service.proposeRelationshipChange(12, relationship.id, {
          permissions: { treatAsFriend: true },
        }),
      );
      const { id } = await ctx.service.proposeRelationshipChange(
        1,
        relationship.id,
        { permissions: { treatAsFriend: true } },
      );
      await expectForbidden(ctx.service.acceptRelationshipChange(12, id));
      await ctx.service.acceptRelationshipChange(11, id);
      const [changed] = await ofHan(ctx);
      expect(changed.treatAsFriend).toBe(true);
    });
  });

  describe('effect on all alliance members', () => {
    it('makes the Siedler an Enemy of every member, in both directions', async () => {
      const ctx = world();
      await ctx.service.declareWarOnSettler(10, ctx.rogue.id, 1);
      for (const member of MEMBERS) {
        expect((await ctx.resolver.resolve(member, 1)).status).toBe('ENEMY');
        expect((await ctx.resolver.resolve(1, member)).status).toBe('ENEMY');
      }
      expect((await ctx.resolver.resolve(1, 2)).status).toBe('NEUTRAL');
      expect((await ctx.resolver.resolve(20, 1)).status).toBe('NEUTRAL');
    });

    it('makes the Siedler a Friend of every member with treatAsFriend, no live positions', async () => {
      const ctx = world();
      await allianceToHan(ctx, FRIENDSHIP, { treatAsFriend: true });
      for (const member of MEMBERS) {
        expect(await ctx.resolver.resolve(member, 1)).toMatchObject({
          status: 'FRIEND',
          mayShareLivePosition: false,
          mayShareHistoricalScans: false,
        });
        expect((await ctx.resolver.resolve(1, member)).status).toBe('FRIEND');
      }
    });

    it('stays Neutral without treatAsFriend', async () => {
      const ctx = world();
      await hanToAlliance(ctx, FRIENDSHIP);
      expect((await ctx.resolver.resolve(13, 1)).status).toBe('NEUTRAL');
    });

    it('shares live positions only in an alliance relationship and only while active', async () => {
      const ctx = world();
      await hanToAlliance(ctx, ALLIANCE, {
        treatAsFriend: true,
        shareLivePositions: true,
      });
      for (const member of MEMBERS) {
        expect(
          (await ctx.resolver.resolve(member, 1)).mayShareLivePosition,
        ).toBe(true);
        expect(
          (await ctx.resolver.resolve(1, member)).mayShareLivePosition,
        ).toBe(true);
      }
      expect((await ctx.resolver.starmapCandidates(13)).partnerIds).toEqual([
        1,
      ]);
      expect(
        [...(await ctx.resolver.starmapCandidates(1)).partnerIds].sort(),
      ).toEqual(MEMBERS);
      expect(await ctx.resolver.historicalScanSharerIds(1)).toEqual([1]);

      const [relationship] = await ofHan(ctx);
      await ctx.service.endRelationship(1, relationship.id);
      expect((await ctx.resolver.resolve(13, 1)).mayShareLivePosition).toBe(
        false,
      );
      expect((await ctx.resolver.starmapCandidates(13)).partnerIds).toEqual([]);
    });
  });

  describe('public Siedler view', () => {
    it('shows active relationships to any player and hides proposals and drafts', async () => {
      const ctx = world();
      await hanToAlliance(ctx, FRIENDSHIP);
      await ctx.service.proposeSettlerRelationship(1, {
        recipientPlayerId: 2,
        type: TRADE_AGREEMENT,
        contract: 'geheimer Entwurf',
      });
      const view = await ctx.service.getPublicSettlerDiplomacy(3, 1);
      expect(view).toMatchObject({ playerId: 1, name: 'Han' });
      expect(view.relationships).toHaveLength(1);
      expect(view.relationships[0]).toMatchObject({
        type: FRIENDSHIP,
        counterpartyType: DiplomacyPartyType.ALLIANCE,
        counterparty: { name: 'Rogue Squadron' },
      });
      expect(JSON.stringify(view)).not.toContain('geheimer Entwurf');
    });

    it('lists player partners on the alliance page and renders their names as plain text', async () => {
      const ctx = world();
      ctx.store.addPlayer(5, '[url=http://evil]Han[/url]');
      await ctx.service.update(10, ctx.rogue.id, {
        description: 'Partner:\n$ALLIANCE_DIPLOMATIC_RELATIONS',
      });
      const { id } = await ctx.service.proposeRelationship(10, ctx.rogue.id, {
        recipientPlayerId: 5,
        type: FRIENDSHIP,
        contract: 'geheim',
      });
      await ctx.service.acceptRelationshipProposal(5, id);
      await ctx.service.proposeRelationship(10, ctx.rogue.id, {
        recipientPlayerId: 2,
        type: TRADE_AGREEMENT,
      });

      const detail = await ctx.service.getDetail(3, ctx.rogue.id);

      expect(detail.relationships).toEqual([
        expect.objectContaining({
          counterpartyType: DiplomacyPartyType.PLAYER,
          counterparty: expect.objectContaining({ id: 5 }),
        }),
      ]);
      expect(detail.renderedDescription).toBe(
        'Partner:\nFreundschaft: \\[url=http://evil\\]Han\\[/url\\]',
      );
    });

    it('answers Not Found for an unknown player', async () => {
      const ctx = world();
      expect(
        await rejects(ctx.service.getPublicSettlerDiplomacy(1, 99)),
      ).toBeInstanceOf(NotFoundException);
    });

    it('serves the public contract and a newest-first chronicle of an active relationship', async () => {
      const ctx = world();
      const proposal = await ctx.service.proposeSettlerRelationship(1, {
        recipientAllianceId: ctx.rogue.id,
        type: FRIENDSHIP,
        contract: 'Offener Vertrag',
      });
      await ctx.service.acceptRelationshipProposal(10, proposal.id);
      const [relationship] = (await ctx.service.getPublicSettlerDiplomacy(3, 1))
        .relationships;
      await expect(
        ctx.service.getPublicSettlerRelationshipContract(1, relationship.id),
      ).resolves.toMatchObject({
        relationshipId: relationship.id,
        contract: 'Offener Vertrag',
      });
      await ctx.service.declareSettlerWar(1, 2);
      const first = await ctx.service.listSettlerDiplomacyChronicle(
        3,
        1,
        undefined,
        1,
      );
      expect(first.entries[0].type).toBe(
        AllianceDiplomacyChronicleEventType.WAR_DECLARED,
      );
      expect(first.nextCursor).not.toBeNull();
    });
  });

  describe('views', () => {
    it('lists alliances of the own faction as Siedler counterparties, with the other party type', async () => {
      const ctx = world();
      await hanToAlliance(ctx, FRIENDSHIP);
      const view = await ctx.service.getSettlerDiplomacy(1);
      expect(view.targets.map((t) => t.name).sort()).toEqual([
        'Phoenix',
        'Rogue Squadron',
      ]);
      expect(view.relationships[0].relationship).toMatchObject({
        counterpartyType: DiplomacyPartyType.ALLIANCE,
        counterparty: { id: ctx.rogue.id, name: 'Rogue Squadron' },
      });
    });

    it('shows the alliance management a Siedler counterparty and the sent proposal direction', async () => {
      const ctx = world();
      await allianceToHan(ctx, FRIENDSHIP);
      await ctx.service.proposeRelationship(10, ctx.rogue.id, {
        recipientPlayerId: 2,
        type: FRIENDSHIP,
      });
      const view = await ctx.service.getDiplomacyManagement(11, ctx.rogue.id);
      expect(view.relationships[0].relationship).toMatchObject({
        counterpartyType: DiplomacyPartyType.PLAYER,
        counterparty: { id: 1, name: 'Han' },
      });
      expect(view.proposals[0]).toMatchObject({
        direction: 'SENT',
        proposal: { recipientPartyType: DiplomacyPartyType.PLAYER },
      });
      await expectForbidden(
        ctx.service.getDiplomacyManagement(12, ctx.rogue.id),
      );
    });
  });

  describe('counterparty search for the alliance', () => {
    it('returns alliance-less players of the faction with id and name only', async () => {
      const ctx = world();
      const page = await ctx.service.searchAllianceCounterparties(
        10,
        ctx.rogue.id,
        '',
      );
      expect(page.players).toEqual([
        { id: 1, name: 'Han' },
        { id: 2, name: 'Lando' },
        { id: 3, name: 'Chewie' },
      ]);
      const filtered = await ctx.service.searchAllianceCounterparties(
        11,
        ctx.rogue.id,
        'lan',
      );
      expect(filtered.players).toEqual([{ id: 2, name: 'Lando' }]);
    });

    it('refuses vice, members, foreign alliances, Siedler and bad queries', async () => {
      const ctx = world();
      for (const actor of [12, 13, 20, 1]) {
        await expectForbidden(
          ctx.service.searchAllianceCounterparties(actor, ctx.rogue.id, ''),
        );
      }
      await expectBadRequest(
        ctx.service.searchAllianceCounterparties(
          10,
          ctx.rogue.id,
          'x'.repeat(41),
        ),
      );
    });
  });
});
