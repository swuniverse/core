import { DataSource } from 'typeorm';
import type { User } from '../../modules/auth/user.entity';
import { TradeNetworkTransferService } from '../../modules/trade/trade-network-transfer.service';
import { TradeStorageService } from '../../modules/trade/trade-storage.service';
import { connectIntegrationDatabase, createUser, resetDatabase } from './database';

const DOONIUM = 2;
const HOUR_MS = 60 * 60 * 1000;
const gameData = { getCommodity: (id: number) => ({ id, name: id === DOONIUM ? 'Doonium' : `Ware ${id}` }) };

/** tmw-T5: transfers between own accounts of one trade network (STU `TransferCommodities`). */
describe('trade network transfers (PostgreSQL)', () => {
  let source: DataSource;
  beforeAll(async () => { source = await connectIntegrationDatabase(); });
  beforeEach(async () => resetDatabase(source));
  afterAll(async () => source?.destroy());

  let player: User;
  let posts: { source: number; target: number; unlicensed: number; otherNetwork: number };
  let service: TradeNetworkTransferService;
  let now: Date;

  beforeEach(async () => {
    now = new Date();
    const npc = await createUser(source, { isNpc: true });
    player = await createUser(source, { username: 'Lando' });
    const layer = await source.getRepository('Layer').save({ name: 'Handel', width: 4, height: 1 });
    const fieldType = await source.getRepository('GalaxyFieldType').findOneByOrFail({});
    const locations: number[] = [];
    for (const cx of [1, 2, 3, 4]) {
      const field = await source.getRepository('GalaxyField').save({ layerId: layer.id, cx, cy: 1, fieldTypeId: fieldType.id });
      locations.push((await source.getRepository('SpaceLocation').findOneByOrFail({ galaxyFieldId: field.id })).id);
    }
    const save = async (name: string, networkId: number, index: number, values: Record<string, unknown> = {}) =>
      (await source.getRepository('TradePost').save({ name, networkId, ownerId: npc.id, locationId: locations[index], ...values })).id as number;
    posts = {
      source: await save('Mos Eisley', 1, 0, { transferCapacity: 100 }),
      target: await save('Anchorhead', 1, 1, { storageLimit: 1000 }),
      unlicensed: await save('Tosche', 1, 2),
      otherNetwork: await save('Nar Shaddaa', 2, 3),
    };
    for (const tradePostId of [posts.source, posts.target, posts.otherNetwork]) await license(player, tradePostId);
    service = new TradeNetworkTransferService(source, new TradeStorageService(source), gameData as never);
  });

  const license = (user: User, tradePostId: number, expiresAt = new Date(Date.now() + 24 * HOUR_MS)) =>
    source.getRepository('TradeLicense').save({ tradePostId, userId: user.id, startsAt: new Date(Date.now() - HOUR_MS), expiresAt, warningSentAt: null });

  const account = (tradePostId: number, commodityId: number, amount: number, user = player) =>
    source.getRepository('TradeAccountStorage').save({ tradePostId, userId: user.id, commodityId, amount });

  const stock = async (tradePostId: number, commodityId = DOONIUM) =>
    (await source.getRepository('TradeAccountStorage').findOneBy({ tradePostId, userId: player.id, commodityId }))?.amount ?? 0;

  const transfer = (values: Partial<{ targetPostId: number; commodityId: number; amount: number }> = {}, from = posts.source) =>
    service.transfer(from, player.id, { targetPostId: posts.target, commodityId: DOONIUM, amount: 30, ...values }, now);

  it('moves goods to the own account at the target and records the transfer', async () => {
    await account(posts.source, DOONIUM, 50);

    expect(await transfer()).toEqual({ message: 'Es wurde 30 Doonium zum Anchorhead transferiert', amount: 30 });

    expect(await stock(posts.source)).toBe(20);
    expect(await stock(posts.target)).toBe(30);
    expect(await source.getRepository('TradeTransfer').find()).toMatchObject([
      { sourceTradePostId: posts.source, targetTradePostId: posts.target, userId: player.id, commodityId: DOONIUM, amount: 30 },
    ]);
  });

  it('caps the amount by stock, free space at the target and the 24-hour capacity', async () => {
    await account(posts.source, DOONIUM, 500);
    await account(posts.target, 9, 990);
    expect((await transfer({ amount: 50 })).amount).toBe(10);

    await source.getRepository('TradeAccountStorage').delete({ tradePostId: posts.target, commodityId: 9 });
    expect((await transfer({ amount: 500 })).amount).toBe(90);
    await expect(transfer({ amount: 1 })).rejects.toThrow('Du hast an diesem Posten derzeit keine freie Transferkapazität');

    await source.getRepository('TradeAccountStorage').update({ tradePostId: posts.source, commodityId: DOONIUM }, { amount: 3 });
    await source.getRepository('TradeTransfer').update({ userId: player.id }, { createdAt: new Date(now.getTime() - 24 * HOUR_MS - 1000) });
    expect((await transfer({ amount: 50 })).amount).toBe(3);
  });

  it('counts only transfers of the last 24 hours from this post by this player', async () => {
    const other = await createUser(source);
    const old = new Date(now.getTime() - 24 * HOUR_MS - 1000);
    const recent = new Date(now.getTime() - 23 * HOUR_MS);
    const transfers = source.getRepository('TradeTransfer');
    for (const [userId, sourceTradePostId, amount, createdAt] of [
      [player.id, posts.source, 60, recent], [player.id, posts.source, 100, old], [other.id, posts.source, 100, recent], [player.id, posts.target, 100, recent],
    ] as const) {
      const saved = await transfers.save({ sourceTradePostId, targetTradePostId: sourceTradePostId === posts.source ? posts.target : posts.source, userId, commodityId: DOONIUM, amount });
      await transfers.update(saved.id, { createdAt });
    }
    await account(posts.source, DOONIUM, 500);

    expect(await service.targets(posts.source, player.id, now)).toMatchObject({ free: 40, capacity: 100 });
    expect((await transfer({ amount: 500 })).amount).toBe(40);
  });

  it('requires licenses at both posts, one network and two different posts', async () => {
    await account(posts.source, DOONIUM, 50);

    await expect(transfer({ targetPostId: posts.unlicensed })).rejects.toThrow('Du benötigst eine gültige Lizenz am Zielposten');
    await expect(transfer({ targetPostId: posts.otherNetwork })).rejects.toThrow('Der Zielposten liegt in einem anderen Handelsnetz');
    await expect(transfer({ targetPostId: posts.source })).rejects.toThrow('Quell- und Zielposten müssen verschieden sein');
    await expect(transfer({ targetPostId: 999999 })).rejects.toThrow('Zielposten nicht gefunden');
    await source.getRepository('TradeLicense').update({ tradePostId: posts.source }, { expiresAt: new Date(now.getTime() - 1000) });
    await expect(transfer()).rejects.toThrow('Du benötigst eine gültige Lizenz am Quellposten');
    expect(await stock(posts.source)).toBe(50);
    expect(await source.getRepository('TradeTransfer').count()).toBe(0);
  });

  it('rejects an empty account, a full target and invalid input', async () => {
    await expect(transfer()).rejects.toThrow('Nicht genügend Waren auf dem Handelskonto');
    await account(posts.source, DOONIUM, 50);
    await account(posts.target, 9, 1000);
    await expect(transfer()).rejects.toThrow('Am Zielposten ist kein freier Lagerplatz mehr vorhanden');
    await expect(transfer({ amount: 0 })).rejects.toThrow('Menge muss eine positive ganze Zahl sein');
  });

  it('never exceeds the capacity under concurrent transfers of different goods', async () => {
    const goods = [DOONIUM, 4, 9, 21];
    for (const commodityId of goods) await account(posts.source, commodityId, 500);

    const results = await Promise.allSettled(goods.map((commodityId) => transfer({ commodityId, amount: 40 })));

    const moved = results.flatMap((result) => (result.status === 'fulfilled' ? [result.value.amount] : []));
    expect(moved.reduce((sum, amount) => sum + amount, 0)).toBe(100);
    const arrived = await Promise.all(goods.map((commodityId) => stock(posts.target, commodityId)));
    expect(arrived.reduce((sum, amount) => sum + amount, 0)).toBe(100);
  });

  it('offers licensed posts of the same network as targets with their free space', async () => {
    await account(posts.target, 9, 400);

    expect(await service.targets(posts.source, player.id, now)).toEqual({
      tradePostId: posts.source,
      free: 100,
      capacity: 100,
      targets: [{ tradePostId: posts.target, tradePostName: 'Anchorhead', freeStorage: 600 }],
    });
  });
});
