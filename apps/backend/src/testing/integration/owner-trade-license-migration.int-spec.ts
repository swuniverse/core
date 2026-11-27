import { DataSource } from 'typeorm';
import { OwnerTradeLicenses20261127110000 } from '../../database/migrations/20261127110000-owner-trade-licenses';
import { UNLIMITED_LICENSE_EXPIRY } from '../../modules/trade/player-trade-post.service';
import { connectIntegrationDatabase, createUser, resetDatabase } from './database';

describe('owner trade license migration (PostgreSQL)', () => {
  let source: DataSource;
  beforeAll(async () => { source = await connectIntegrationDatabase(); });
  beforeEach(async () => resetDatabase(source));
  afterAll(async () => source?.destroy());

  it('backfills permanent owner licenses idempotently, leaving NPC and abandoned posts alone', async () => {
    const [a, b, c] = [await createUser(source), await createUser(source), await createUser(source)];
    const layer = await source.getRepository('Layer').save({ name: 'Handel', width: 5, height: 1 });
    const fieldType = await source.getRepository('GalaxyFieldType').findOneByOrFail({});
    const locations: number[] = [];
    for (const cx of [1, 2, 3, 4, 5]) {
      const field = await source.getRepository('GalaxyField').save({ layerId: layer.id, cx, cy: 1, fieldTypeId: fieldType.id });
      locations.push((await source.getRepository('SpaceLocation').findOneByOrFail({ galaxyFieldId: field.id })).id);
    }
    const posts = source.getRepository('TradePost');
    const shipClass = await source.getRepository('ShipClassDef').save({
      key: 'REBEL_OUTPOST', name: 'Außenposten', category: 'STATION', role: 'OUTPOST', buildTimeTicks: 1, hullBase: 100,
    });
    const station = async (n: number) =>
      (await source.getRepository('Spacecraft').save({
        name: `Station ${n}`, userId: a.id, shipClassId: shipClass.id, locationId: locations[n - 1], kind: 'STATION',
        stationRole: 'OUTPOST', status: 'IDLE', runtimeSystems: {},
      })).id;
    const missing = await posts.save({ name: 'Ohne', networkId: a.id, ownerId: a.id, locationId: locations[0], stationId: await station(1) });
    const expired = await posts.save({ name: 'Abgelaufen', networkId: b.id, ownerId: b.id, locationId: locations[1], stationId: await station(2) });
    const valid = await posts.save({ name: 'Gültig', networkId: c.id, ownerId: c.id, locationId: locations[2], stationId: await station(3) });
    const abandoned = await posts.save({ name: 'Verlassen', networkId: a.id, ownerId: null, locationId: locations[3], stationId: await station(4) });
    const npc = await posts.save({ name: 'NPC', networkId: 1, ownerId: a.id, locationId: locations[4] });
    const licenses = source.getRepository('TradeLicense');
    const day = 86_400_000;
    await licenses.save({ tradePostId: expired.id, userId: b.id, startsAt: new Date(Date.now() - 2 * day), expiresAt: new Date(Date.now() - day) });
    const soon = new Date(Date.now() + day);
    await licenses.save({ tradePostId: valid.id, userId: c.id, startsAt: new Date(Date.now() - day), expiresAt: soon });

    const migration = new OwnerTradeLicenses20261127110000();
    const runner = source.createQueryRunner();
    await migration.up(runner);
    await migration.up(runner);
    await runner.release();

    const rows = await licenses.find({ order: { tradePostId: 'ASC' } });
    expect(rows.map((r) => [r.tradePostId, r.userId, r.expiresAt.getTime()])).toEqual([
      [missing.id, a.id, UNLIMITED_LICENSE_EXPIRY.getTime()],
      [expired.id, b.id, UNLIMITED_LICENSE_EXPIRY.getTime()],
      [valid.id, c.id, soon.getTime()],
    ]);
    expect(rows.some((r) => r.tradePostId === abandoned.id || r.tradePostId === npc.id)).toBe(false);
  });
});
