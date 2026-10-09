jest.mock('../messaging/messaging.service', () => ({
  MessagingService: class MessagingService {},
}));

import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  AllianceDiplomacyChronicleEndReason,
  AllianceRelationshipType,
  AllianceRole,
} from '@swuniverse/shared';
import { AllianceService } from './alliance.service';
import { playerParty } from './diplomacy-party';
import {
  NoPersonalContactStatusPort,
  RelationshipResolverService,
} from './relationship-resolver.service';
import { InMemoryAllianceStore } from './testing/in-memory-alliance.store';

const { NONE, PRESIDENT } = AllianceRole;
const { WAR, FRIENDSHIP, TRADE_AGREEMENT } = AllianceRelationshipType;

/** Settlers Han 1, Lando 2, Chewie 3; Rogue Squadron (president 10, member 11); Phoenix (president 20). */
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
  for (const [id, name] of [
    [1, 'Han'],
    [2, 'Lando'],
    [3, 'Chewie'],
    [10, 'Leia'],
    [11, 'Biggs'],
    [20, 'Ackbar'],
  ] as const) {
    store.addPlayer(id, name);
  }
  const rogue = store.seedAlliance({ name: 'Rogue Squadron' }, [
    [10, PRESIDENT],
    [11, NONE],
  ]);
  const phoenix = store.seedAlliance({ name: 'Phoenix' }, [[20, PRESIDENT]]);
  return { store, sent, service, resolver, rogue, phoenix };
}
type Ctx = ReturnType<typeof world>;

/**
 * Lando befriends Han (secret contract); Han is at war with Chewie; Phoenix
 * proposes trade to Han; Han proposes friendship to Rogue Squadron.
 */
async function giveHanDiplomacy(ctx: Ctx) {
  const { id } = await ctx.service.proposeSettlerRelationship(2, {
    recipientPlayerId: 1,
    type: FRIENDSHIP,
    contract: 'geheim',
    permissions: { treatAsFriend: true },
  });
  await ctx.service.acceptRelationshipProposal(1, id);
  await ctx.service.declareSettlerWar(1, 3);
  await ctx.service.proposeRelationship(20, ctx.phoenix.id, {
    recipientPlayerId: 1,
    type: TRADE_AGREEMENT,
  });
  await ctx.service.proposeSettlerRelationship(1, {
    recipientAllianceId: ctx.rogue.id,
    type: FRIENDSHIP,
  });
  ctx.sent.length = 0;
}

async function apply(ctx: Ctx, userId: number) {
  await ctx.service.apply(userId, ctx.rogue.id);
}

async function accept(ctx: Ctx) {
  const [application] = await ctx.store.listApplicationsForAlliance(
    ctx.rogue.id,
  );
  await ctx.service.acceptApplication(10, application.id);
}

async function applyAndAccept(ctx: Ctx, userId: number) {
  await apply(ctx, userId);
  await accept(ctx);
}

const ofHan = async (ctx: Ctx) => ({
  relationships: await ctx.store.listActiveRelationships(playerParty(1)),
  proposals: await ctx.store.listRelationshipProposals(playerParty(1)),
});

describe.each([
  [
    'founding an alliance',
    (ctx: Ctx) =>
      ctx.service.found(1, { name: 'Neue Hoffnung', description: '' }),
    async () => undefined,
    (ctx: Ctx) =>
      ctx.service.found(1, { name: 'Neue Hoffnung', description: '' }),
  ],
  [
    'acceptance of an application',
    (ctx: Ctx) => applyAndAccept(ctx, 1),
    (ctx: Ctx) => apply(ctx, 1),
    (ctx: Ctx) => accept(ctx),
  ],
])('party change by %s', (_name, join, prepare, commit) => {
  it('ends relationships including war and proposals both ways, nobody elses', async () => {
    const ctx = world();
    await giveHanDiplomacy(ctx);
    expect((await ofHan(ctx)).relationships).toHaveLength(2);
    expect((await ofHan(ctx)).proposals).toHaveLength(2);

    await join(ctx);

    expect(await ofHan(ctx)).toEqual({ relationships: [], proposals: [] });
    await ctx.service.declareSettlerWar(2, 3);
    expect(
      await ctx.store.listActiveRelationships(playerParty(2)),
    ).toHaveLength(1);
  });

  it('ends pending changes of the ended relationships', async () => {
    const ctx = world();
    await giveHanDiplomacy(ctx);
    const friendship = (await ofHan(ctx)).relationships.find(
      (r) => r.type === FRIENDSHIP,
    );
    await ctx.service.proposeRelationshipChange(2, friendship!.id, {
      permissions: { treatAsFriend: false },
    } as never);
    expect(
      await ctx.store.listRelationshipChangeProposals(playerParty(2)),
    ).toHaveLength(1);

    await join(ctx);

    expect(
      await ctx.store.listRelationshipChangeProposals(playerParty(2)),
    ).toEqual([]);
  });

  it('informs the counterparties with the reason after the commit, and nobody else', async () => {
    const ctx = world();
    await giveHanDiplomacy(ctx);

    await join(ctx);

    const bodies = (to: number) =>
      ctx.sent
        .filter((m) => m.to === to && !m.body.startsWith('Deine Bewerbung'))
        .map((m) => m.body);
    expect(bodies(2)).toHaveLength(1);
    expect(bodies(2)[0]).toContain('Han ist der Allianz');
    expect(bodies(2)[0]).toContain('Freundschaft');
    expect(bodies(3)[0]).toContain('Krieg');
    expect(bodies(20)[0]).toContain('Beziehungsvorschlag');
    expect(bodies(10).some((b) => b.includes('Beziehungsvorschlag'))).toBe(
      true,
    );
    expect(
      ctx.sent.some((m) => m.to === 1 && m.body.includes('Beziehung')),
    ).toBe(false);
  });

  it('keeps type, names at event time, timestamp and end reason, but no contract', async () => {
    const ctx = world();
    await giveHanDiplomacy(ctx);

    await join(ctx);
    ctx.store.renamePlayer(2, 'Lando Calrissian');

    const entries = await ctx.store.listDiplomacyChronicleEntries(
      playerParty(1),
      null,
      50,
    );
    const ended = entries.filter(
      (e) =>
        e.endReason ===
        AllianceDiplomacyChronicleEndReason.PARTY_JOINED_ALLIANCE,
    );
    expect(ended).toHaveLength(2);
    const friendship = ended.find((e) => e.relationshipType === FRIENDSHIP);
    expect(friendship).toMatchObject({
      eventType: 'RELATIONSHIP_ENDED',
      occurredAt: expect.any(Date),
    });
    expect(
      [friendship?.firstPartyName, friendship?.secondPartyName].sort(),
    ).toEqual(['Han', 'Lando']);
    expect(ended.some((e) => e.relationshipType === WAR)).toBe(true);
    expect(JSON.stringify(entries)).not.toContain('geheim');
    // Dropped proposals leave no public trace: friendship start, war, 2 ends.
    expect(entries).toHaveLength(4);
  });

  it('makes the effects vanish in the central resolution', async () => {
    const ctx = world();
    await giveHanDiplomacy(ctx);
    expect((await ctx.resolver.resolve(1, 3)).status).toBe('ENEMY');
    expect((await ctx.resolver.resolve(1, 2)).status).toBe('FRIEND');

    await join(ctx);

    expect((await ctx.resolver.resolve(1, 3)).status).toBe('NEUTRAL');
    expect((await ctx.resolver.resolve(3, 1)).status).toBe('NEUTRAL');
    expect((await ctx.resolver.resolve(1, 2)).status).toBe('NEUTRAL');
  });

  it('restores nothing when the player leaves again', async () => {
    const ctx = world();
    await giveHanDiplomacy(ctx);
    await join(ctx);

    await ctx.service.leave(1);

    expect(await ofHan(ctx)).toEqual({ relationships: [], proposals: [] });
    expect((await ctx.resolver.resolve(1, 3)).status).toBe('NEUTRAL');
  });

  it('refuses personal diplomacy for the new member on the server', async () => {
    const ctx = world();
    await join(ctx);
    const error = (p: Promise<unknown>) =>
      p.then(
        () => null,
        (e: unknown) => e,
      );
    expect(await error(ctx.service.declareSettlerWar(1, 3))).toBeInstanceOf(
      ForbiddenException,
    );
    expect(
      await error(
        ctx.service.proposeSettlerRelationship(1, {
          recipientPlayerId: 3,
          type: FRIENDSHIP,
        }),
      ),
    ).toBeInstanceOf(ForbiddenException);
    expect(await error(ctx.service.declareSettlerWar(3, 1))).toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rolls the whole join back when ending the diplomacy fails', async () => {
    const ctx = world();
    await giveHanDiplomacy(ctx);
    await prepare(ctx);
    ctx.sent.length = 0;
    const before = ctx.store.snapshot();
    jest
      .spyOn(ctx.store, 'appendDiplomacyChronicleEntry')
      .mockRejectedValueOnce(new Error('boom'));

    await expect(commit(ctx)).rejects.toThrow('boom');

    expect(ctx.store.snapshot()).toEqual(before);
    expect(await ctx.store.findMembership(1)).toBeNull();
    expect(ctx.sent).toEqual([]);
  });
});
