import { AllianceRole } from '@swuniverse/shared';
import { AllianceContextCleanup } from './alliance-context-cleanup';
import { AllianceResetService } from './alliance-reset.service';
import { InMemoryAllianceStore } from './testing/in-memory-alliance.store';
import { InMemoryAssetStorage } from './testing/in-memory-asset-storage';

const { PRESIDENT, VICE } = AllianceRole;

function setup() {
  const store = new InMemoryAllianceStore();
  const assets = new InMemoryAssetStorage();
  const cleanup = new AllianceContextCleanup();
  const reset = jest.fn().mockResolvedValue(undefined);
  cleanup.register({ reset });
  const service = new AllianceResetService(store, assets, cleanup);
  for (const [id, name] of [
    [1, 'Leia'],
    [2, 'Han'],
    [3, 'Wedge'],
  ] as const) {
    store.addPlayer(id, name);
  }
  return { store, assets, cleanup, reset, service };
}

async function populate(ctx: ReturnType<typeof setup>) {
  const { store, assets } = ctx;
  await assets.save('a'.repeat(32), Buffer.from('referenced'));
  await assets.save('b'.repeat(32), Buffer.from('orphan'));
  const rogue = store.seedAlliance(
    { name: 'Rogue Squadron', bannerKey: 'a'.repeat(32) },
    [
      [1, PRESIDENT],
      [2, VICE],
    ],
  );
  const red = store.seedAlliance({ name: 'Red Squadron' }, [[3, PRESIDENT]]);
  store.seedApplication(red.id, 2);
  store.seedActiveAllianceRelationship({
    firstAllianceId: rogue.id,
    secondAllianceId: red.id,
    type: 'ALLIANCE' as never,
  });
  await store.appendDiplomacyChronicleEntry({
    eventType: 'RELATIONSHIP_STARTED' as never,
    actorUserId: 1,
    actorName: 'Leia',
    firstAllianceId: rogue.id,
    firstAllianceName: rogue.name,
    secondAllianceId: red.id,
    secondAllianceName: red.name,
    relationshipType: 'ALLIANCE' as never,
    lordAllianceId: null,
    vassalAllianceId: null,
  });
  await store.appendAllianceChronicleEntry({
    allianceId: rogue.id,
    eventType: 'MEMBER_JOINED' as never,
    actorUserId: 1,
    actorName: 'Leia',
    subjectUserId: 1,
    subjectName: 'Leia',
    metadata: null,
  });
  await store.enqueueDiplomacyNotifications([
    { recipientUserId: 1, body: 'x' },
  ]);
  await store.enqueueAssetDeletion('c'.repeat(32));
  return { rogue, red };
}

function emptyData(store: InMemoryAllianceStore) {
  const s = store.snapshot();
  return [
    s.alliances,
    s.memberships,
    s.applications,
    s.relationships,
    s.relationshipProposals,
    s.relationshipChangeProposals,
    s.diplomacyChronicleEntries,
    s.allianceChronicleEntries,
    s.diplomacyNotifications,
    s.assetDeletions,
  ].every((rows) => rows.length === 0);
}

describe('AllianceResetService', () => {
  it('removes all alliance data and every banner asset, referenced or not', async () => {
    const ctx = setup();
    await populate(ctx);

    await ctx.service.resetAllianceData();

    expect(emptyData(ctx.store)).toBe(true);
    expect(ctx.assets.size).toBe(0);
  });

  it('is idempotent when called twice', async () => {
    const ctx = setup();
    await populate(ctx);

    await ctx.service.resetAllianceData();
    await ctx.service.resetAllianceData();

    expect(emptyData(ctx.store)).toBe(true);
    expect(ctx.assets.size).toBe(0);
  });

  it('can be repeated after an aborted reset that left files behind', async () => {
    const ctx = setup();
    await populate(ctx);
    ctx.assets.failNextDelete = true;

    await expect(ctx.service.resetAllianceData()).rejects.toThrow();
    expect(emptyData(ctx.store)).toBe(true);
    expect(ctx.assets.size).toBeGreaterThan(0);

    await ctx.service.resetAllianceData();

    expect(emptyData(ctx.store)).toBe(true);
    expect(ctx.assets.size).toBe(0);
  });

  it('notifies the cleanup port inside the reset transaction', async () => {
    const ctx = setup();
    await populate(ctx);

    await ctx.service.resetAllianceData();

    expect(ctx.reset).toHaveBeenCalledTimes(1);
    expect(ctx.reset).toHaveBeenCalledWith({ transaction: expect.anything() });
  });

  it('leaves everything untouched when a cleanup consumer fails', async () => {
    const ctx = setup();
    await populate(ctx);
    ctx.reset.mockRejectedValueOnce(new Error('consumer failed'));

    await expect(ctx.service.resetAllianceData()).rejects.toThrow(
      'consumer failed',
    );

    expect(emptyData(ctx.store)).toBe(false);
    expect(ctx.assets.size).toBe(2);
  });

  it('never hands out an old alliance id again', async () => {
    const ctx = setup();
    const { rogue, red } = await populate(ctx);

    await ctx.service.resetAllianceData();
    const fresh = await ctx.store.insertAlliance({
      name: 'New',
      description: '',
      factionId: 1,
    });

    expect(fresh.id).toBeGreaterThan(Math.max(rogue.id, red.id));
  });
});
