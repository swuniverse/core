import { DataSource } from 'typeorm';
import { BasicTradeService } from '../../modules/trade/basic-trade.service';
import { TradeStorageService } from '../../modules/trade/trade-storage.service';
import { connectIntegrationDatabase, createUser, resetDatabase } from './database';

const AURODIUM = 50;
const DOONIUM = 2;
const TRANSPARISTAHL = 4;
const COMMODITIES: Record<number, string> = { [AURODIUM]: 'Aurodium', [DOONIUM]: 'Doonium', [TRANSPARISTAHL]: 'Transparistahl' };
const DAY_MS = 24 * 60 * 60 * 1000;

describe('basic trade (PostgreSQL)', () => {
  let source: DataSource;
  beforeAll(async () => { source = await connectIntegrationDatabase(); });
  beforeEach(async () => resetDatabase(source));
  afterAll(async () => source?.destroy());

  let userId: number;
  let posts: { rebelNpc: number; empireNpc: number; player: number };
  let now: number;
  let service: BasicTradeService;

  beforeEach(async () => {
    userId = (await createUser(source)).id;
    const rebels = await createUser(source, { isNpc: true });
    const empire = await createUser(source, { isNpc: true });
    const trader = await createUser(source);
    now = 1_800_000_000_000;
    const gameData = {
      getBasicTradeConfig: () => ({
        networks: [1, 2],
        commodities: [
          { commodityId: DOONIUM, startValue: 189643 },
          { commodityId: TRANSPARISTAHL, startValue: 94010 },
        ],
      }),
      getCommodity: (id: number) => (COMMODITIES[id] ? { name: COMMODITIES[id] } : undefined),
    };
    service = new BasicTradeService(source, new TradeStorageService(source), gameData as never, () => now++);
    const layer = await source.getRepository('Layer').save({ name: 'Handel', width: 3, height: 1 });
    const fieldType = await source.getRepository('GalaxyFieldType').findOneByOrFail({});
    const locations: number[] = [];
    for (const cx of [1, 2, 3]) {
      const field = await source.getRepository('GalaxyField').save({ layerId: layer.id, cx, cy: 1, fieldTypeId: fieldType.id });
      locations.push((await source.getRepository('SpaceLocation').findOneByOrFail({ galaxyFieldId: field.id })).id);
    }
    const tradePosts = source.getRepository('TradePost');
    posts = {
      rebelNpc: (await tradePosts.save({ name: 'Versorgungsstützpunkt Aurek', networkId: 2, ownerId: rebels.id, locationId: locations[0] })).id,
      empireNpc: (await tradePosts.save({ name: 'Imperialer Versorgungsknoten Aurek', networkId: 1, ownerId: empire.id, locationId: locations[1] })).id,
      player: (await tradePosts.save({ name: 'Spielerposten', networkId: 2, ownerId: trader.id, locationId: locations[2] })).id,
    };
    for (const tradePostId of Object.values(posts)) await license(tradePostId, userId);
    await service.seed();
  });

  function license(tradePostId: number, owner: number) {
    return source.getRepository('TradeLicense').save({ tradePostId, userId: owner, startsAt: new Date(Date.now() - DAY_MS), expiresAt: new Date(Date.now() + DAY_MS) });
  }

  function account(tradePostId: number, commodityId: number, amount: number, owner = userId) {
    return source.getRepository('TradeAccountStorage').save({ tradePostId, userId: owner, commodityId, amount });
  }

  const stockOf = async (commodityId: number, tradePostId = posts.rebelNpc) =>
    (await source.getRepository('TradeAccountStorage').findOneBy({ tradePostId, userId, commodityId }))?.amount ?? 0;

  async function newestRate(networkId: number, commodityId: number) {
    return (await source.getRepository('BasicTradeRate').find({ where: { networkId, commodityId }, order: { dateMs: 'DESC', id: 'DESC' }, take: 1 }))[0];
  }

  it('seeds one start rate per network and commodity once and keeps histories', async () => {
    expect(await source.getRepository('BasicTradeRate').count()).toBe(4);
    const before = await newestRate(2, DOONIUM);
    expect(before).toMatchObject({ value: 189643, buySell: 0, userId: null });

    expect(await service.seed()).toBe(0);
    expect(await source.getRepository('BasicTradeRate').count()).toBe(4);
    expect((await newestRate(2, DOONIUM)).rateId).toBe(before.rateId);
  });

  it('buys goods for one Aurodium and lowers the network rate', async () => {
    await account(posts.rebelNpc, AURODIUM, 3);
    const start = await newestRate(2, DOONIUM);

    expect(await service.buy(userId, { postId: posts.rebelNpc, rateId: start.rateId })).toEqual({ message: 'Die Waren wurden gekauft' });

    expect(await stockOf(AURODIUM)).toBe(2);
    expect(await stockOf(DOONIUM)).toBe(1896);
    expect(await newestRate(2, DOONIUM)).toMatchObject({ value: 189143, buySell: -10, userId });
    // The empire network keeps its own rate.
    expect((await newestRate(1, DOONIUM)).value).toBe(189643);
    await expect(service.buy(userId, { postId: posts.rebelNpc, rateId: start.rateId }))
      .rejects.toThrow('Kurs wurde zwischenzeitlich aktualisiert - es konnte nicht gekauft werden');
    expect(await stockOf(AURODIUM)).toBe(2);
  });

  it('sells goods for one Aurodium and raises the rate', async () => {
    const start = await newestRate(2, DOONIUM);
    await account(posts.rebelNpc, DOONIUM, 2085);
    await expect(service.sell(userId, { postId: posts.rebelNpc, rateId: start.rateId }))
      .rejects.toThrow('Dein Warenkonto verfügt nicht über ausreichend Waren - es konnte nicht verkauft werden');

    await source.getRepository('TradeAccountStorage').update({ tradePostId: posts.rebelNpc, userId, commodityId: DOONIUM }, { amount: 2100 });
    expect(await service.sell(userId, { postId: posts.rebelNpc, rateId: start.rateId })).toEqual({ message: 'Die Waren wurden verkauft' });

    expect(await stockOf(DOONIUM)).toBe(14);
    expect(await stockOf(AURODIUM)).toBe(1);
    expect(await newestRate(2, DOONIUM)).toMatchObject({ value: 190143, buySell: 10 });
  });

  it('rejects trades without Aurodium, space, an NPC post license of the network, or by NPCs', async () => {
    const rate = await newestRate(2, DOONIUM);
    const input = { postId: posts.rebelNpc, rateId: rate.rateId };
    await expect(service.buy(userId, input)).rejects.toThrow('Dein Warenkonto verfügt über kein Aurodium - es konnte nicht gekauft werden');

    await account(posts.rebelNpc, AURODIUM, 5);
    await source.getRepository('TradePost').update(posts.rebelNpc, { storageLimit: 5 });
    await expect(service.buy(userId, input)).rejects.toThrow('Dein Warenkonto auf diesem Handelsposten ist überfüllt - es konnte nicht gekauft werden');
    await source.getRepository('TradePost').update(posts.rebelNpc, { storageLimit: 10_000 });

    const licenseMessage = 'Du benötigst eine gültige Lizenz an einem NPC-Handelsposten dieses Netzes';
    await expect(service.buy(userId, { postId: posts.player, rateId: rate.rateId })).rejects.toThrow(licenseMessage);
    await expect(service.buy(userId, { postId: posts.empireNpc, rateId: rate.rateId })).rejects.toThrow(licenseMessage);
    const stranger = await createUser(source);
    await account(posts.rebelNpc, AURODIUM, 5, stranger.id);
    await expect(service.buy(stranger.id, input)).rejects.toThrow(licenseMessage);
    const npc = await createUser(source, { isNpc: true });
    await expect(service.buy(npc.id, input)).rejects.toThrow('NPCs können dieses Angebot nicht annehmen');
    await expect(service.buy(userId, { postId: posts.rebelNpc, rateId: 'unknown' })).rejects.toThrow('Kurs nicht gefunden');

    expect(await stockOf(AURODIUM)).toBe(5);
    expect(await source.getRepository('BasicTradeRate').count()).toBe(4);
  });

  it('lets only one of two concurrent trades on the same rate through', async () => {
    await account(posts.rebelNpc, AURODIUM, 5);
    const rate = await newestRate(2, DOONIUM);

    const results = await Promise.allSettled([
      service.buy(userId, { postId: posts.rebelNpc, rateId: rate.rateId }),
      service.buy(userId, { postId: posts.rebelNpc, rateId: rate.rateId }),
    ]);

    expect(results.map((result) => result.status).sort()).toEqual(['fulfilled', 'rejected']);
    expect(await stockOf(AURODIUM)).toBe(4);
    expect(await source.getRepository('BasicTradeRate').count()).toBe(5);
  });

  it('lists licensed NPC posts with current values and clamps the chart limit', async () => {
    await account(posts.rebelNpc, AURODIUM, 7);
    await account(posts.rebelNpc, TRANSPARISTAHL, 33);
    for (let index = 0; index < 6; index++) {
      const rate = await newestRate(2, DOONIUM);
      await service.buy(userId, { postId: posts.rebelNpc, rateId: rate.rateId });
    }
    const newest = await newestRate(2, DOONIUM);

    const overview = await service.getOverview(userId, 3);

    expect(overview.limit).toBe(5);
    expect(overview.accounts.map((account) => account.tradePostName)).toEqual(['Imperialer Versorgungsknoten Aurek', 'Versorgungsstützpunkt Aurek']);
    const rebel = overview.accounts.find((account) => account.tradePostId === posts.rebelNpc);
    expect(rebel).toMatchObject({ networkId: 2, aurodium: 1 });
    expect(rebel?.items.find((item) => item.commodityId === DOONIUM)).toEqual({
      commodityId: DOONIUM,
      commodityName: 'Doonium',
      rateId: newest.rateId,
      buyValue: Math.trunc(newest.value / 100),
      sellValue: Math.trunc((newest.value / 100) * 1.1),
      stored: (await stockOf(DOONIUM)),
    });
    expect(rebel?.items.find((item) => item.commodityId === TRANSPARISTAHL)).toMatchObject({ stored: 33, buyValue: 940, sellValue: 1034 });
    const chart = overview.charts.find((entry) => entry.networkId === 2 && entry.commodityId === DOONIUM);
    expect(chart?.totalTradeCount).toBe(7);
    expect(chart?.points).toHaveLength(5);
    expect(chart?.points.at(-1)?.value).toBe(newest.value);
    expect(chart?.points[0].dateMs).toBeLessThan(chart?.points.at(-1)?.dateMs ?? 0);
    expect((await service.getOverview(userId, 1000)).limit).toBe(100);
    expect((await service.getOverview(userId)).limit).toBe(25);
  });
});
