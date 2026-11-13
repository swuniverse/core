import { DataSource } from 'typeorm';
import { PlayerDeletionService } from '../../modules/account-deletion/player-deletion.service';
import { PlayerTradePostService } from '../../modules/trade/player-trade-post.service';
import { TradeDeletionHandler } from '../../modules/trade/trade-deletion.handler';
import { connectIntegrationDatabase, createUser, resetDatabase } from './database';

/** tmw-T11b: deleting a player removes their trade data and keeps transactions anonymously. */
describe('trade data on player deletion (PostgreSQL)', () => {
  let source: DataSource;
  beforeAll(async () => { source = await connectIntegrationDatabase(); });
  beforeEach(async () => resetDatabase(source));
  afterAll(async () => source?.destroy());

  it('removes accounts, offers with reserves, licenses and transfers of the player and anonymizes their transactions', async () => {
    const npc = await createUser(source, { isNpc: true });
    const doomed = await createUser(source, { username: 'Doomed' });
    const other = await createUser(source, { username: 'Other' });
    const layer = await source.getRepository('Layer').save({ name: 'Handel', width: 2, height: 1 });
    const fieldType = await source.getRepository('GalaxyFieldType').findOneByOrFail({});
    const posts: number[] = [];
    for (const cx of [1, 2]) {
      const field = await source.getRepository('GalaxyField').save({ layerId: layer.id, cx, cy: 1, fieldTypeId: fieldType.id });
      const locationId = (await source.getRepository('SpaceLocation').findOneByOrFail({ galaxyFieldId: field.id })).id;
      posts.push((await source.getRepository('TradePost').save({ name: `Posten ${cx}`, networkId: 1, ownerId: npc.id, locationId })).id);
    }
    for (const user of [doomed, other]) {
      await source.getRepository('TradeAccountStorage').save({ tradePostId: posts[0], userId: user.id, commodityId: 5, amount: 20 });
      await source.getRepository('TradeOffer').save({
        tradePostId: posts[0], userId: user.id, wantedCommodityId: 5, wantedAmount: 1,
        offeredCommodityId: 6, offeredAmount: 2, offerCount: 3, reservedAmount: 6,
      });
      await source.getRepository('TradeLicense').save({
        tradePostId: posts[0], userId: user.id, startsAt: new Date(), expiresAt: new Date(Date.now() + 86_400_000), warningSentAt: null,
      });
      await source.getRepository('TradeTransfer').save({ sourceTradePostId: posts[0], targetTradePostId: posts[1], userId: user.id, commodityId: 5, amount: 4 });
      await source.getRepository('TradeShoutboxEntry').save({ networkId: 1, userId: user.id, message: 'Hallo' });
      await source.getRepository('LotteryTicket').save({ userId: user.id, period: '2026.11', isWinner: null });
    }
    const transaction = await source.getRepository('TradeTransaction').save({
      tradePostId: posts[0], buyerId: doomed.id, sellerId: other.id,
      wantedCommodityId: 5, wantedAmount: 1, offeredCommodityId: 6, offeredAmount: 2,
    });
    const rate = await source.getRepository('BasicTradeRate').save({
      rateId: '00000000-0000-4000-8000-000000000001', networkId: 1, commodityId: 2, buySell: 1, value: 1000, userId: doomed.id, dateMs: 1,
    });

    const deletions = new PlayerDeletionService(source);
    new TradeDeletionHandler(deletions, new PlayerTradePostService({} as never)).onModuleInit();
    await deletions.delete(doomed.id);

    for (const entity of ['TradeAccountStorage', 'TradeOffer', 'TradeLicense', 'TradeTransfer', 'TradeShoutboxEntry', 'LotteryTicket']) {
      expect(await source.getRepository(entity).countBy({ userId: doomed.id })).toBe(0);
      expect(await source.getRepository(entity).countBy({ userId: other.id })).toBe(1);
    }
    expect(await source.getRepository('TradeTransaction').findOneByOrFail({ id: transaction.id }))
      .toMatchObject({ tradePostId: posts[0], buyerId: null, sellerId: other.id });
    expect(await source.getRepository('BasicTradeRate').findOneByOrFail({ id: rate.id })).toMatchObject({ userId: null, value: 1000 });
    expect(await source.getRepository('User').countBy({ id: doomed.id })).toBe(0);
    expect(await source.getRepository('TradePost').count()).toBe(2);
  });

  it('cleans up in the deletion transaction even where the schema would not cascade', async () => {
    const doomed = await createUser(source);
    const removed: string[] = [];
    const manager = {
      delete: async (entity: { name: string }) => { removed.push(entity.name); },
      update: async (entity: { name: string }) => { removed.push(`${entity.name}:anonymized`); },
    };

    const posts = { abandonOwnedBy: async () => { removed.push('TradePost:abandoned'); } };
    await new TradeDeletionHandler({ register: () => undefined } as never, posts as never).delete(manager as never, doomed.id);

    expect(removed).toEqual([
      'TradePost:abandoned', 'TradeOffer', 'TradeTransfer', 'TradeLicense', 'TradeAccountStorage', 'TradeShoutboxEntry', 'LotteryTicket',
      'TradeDeal:anonymized', 'TradeAuctionBid',
      'TradeTransaction:anonymized', 'TradeTransaction:anonymized', 'BasicTradeRate:anonymized',
    ]);
  });
});
