import { DataSource } from 'typeorm';
import { TradeAccountAurodiumRankingSource } from '../../modules/database/trade-account-aurodium-ranking.source';
import { TradeOfferAurodiumRankingSource } from '../../modules/database/trade-offer-aurodium-ranking.source';
import { TradePostActivityRanking } from '../../modules/database/trade-post-activity.ranking';
import { connectIntegrationDatabase, createUser, resetDatabase } from './database';

const AURODIUM = 50;
const DAY_MS = 24 * 60 * 60 * 1000;

/** tmw-T11a: the most active trade posts and trade holdings in the Aurodium ranking. */
describe('trade rankings (PostgreSQL)', () => {
  let source: DataSource;
  beforeAll(async () => { source = await connectIntegrationDatabase(); });
  beforeEach(async () => resetDatabase(source));
  afterAll(async () => source?.destroy());

  let locations: number[];
  let ownerId: number;

  beforeEach(async () => {
    ownerId = (await createUser(source, { isNpc: true })).id;
    const layer = await source.getRepository('Layer').save({ name: 'Handel', width: 12, height: 1 });
    const fieldType = await source.getRepository('GalaxyFieldType').findOneByOrFail({});
    locations = [];
    for (let cx = 1; cx <= 12; cx++) {
      const field = await source.getRepository('GalaxyField').save({ layerId: layer.id, cx, cy: 1, fieldTypeId: fieldType.id });
      locations.push((await source.getRepository('SpaceLocation').findOneByOrFail({ galaxyFieldId: field.id })).id);
    }
  });

  const post = async (name: string, networkId = 1, index = 0) =>
    (await source.getRepository('TradePost').save({ name, networkId, ownerId, locationId: locations[index] })).id as number;

  async function transactions(tradePostId: number, count: number, createdAt: Date) {
    for (let i = 0; i < count; i++) {
      const saved = await source.getRepository('TradeTransaction').save({
        tradePostId, buyerId: null, sellerId: null,
        wantedCommodityId: 1, wantedAmount: 1, offeredCommodityId: 2, offeredAmount: 1,
      });
      await source.getRepository('TradeTransaction').update(saved.id, { createdAt });
    }
  }

  describe('most active trade posts', () => {
    const now = new Date('2026-11-13T12:00:00Z');

    it('counts only transactions of the last 7 days, sorted by count then post', async () => {
      const busy = await post('Mos Eisley', 1, 0);
      const quiet = await post('Anchorhead', 2, 1);
      const old = await post('Nar Shaddaa', 3, 2);
      const tie = await post('Kessel', 1, 3);
      await transactions(busy, 3, new Date(now.getTime() - DAY_MS));
      await transactions(quiet, 1, new Date(now.getTime() - 7 * DAY_MS + 60_000));
      await transactions(quiet, 2, new Date(now.getTime() - 7 * DAY_MS - 60_000));
      await transactions(old, 5, new Date(now.getTime() - 8 * DAY_MS));
      await transactions(tie, 1, new Date(now.getTime() - 3 * DAY_MS));

      const ranking = await new TradePostActivityRanking(source.getRepository('TradeTransaction') as never).top(now);

      expect(ranking).toEqual([
        { tradePostId: busy, postName: 'Mos Eisley', networkId: 1, score: 3 },
        { tradePostId: quiet, postName: 'Anchorhead', networkId: 2, score: 1 },
        { tradePostId: tie, postName: 'Kessel', networkId: 1, score: 1 },
      ]);
    });

    it('limits the ranking to ten posts', async () => {
      for (let index = 0; index < 11; index++) {
        await transactions(await post(`Posten ${index}`, 1, index), 11 - index, new Date(now.getTime() - DAY_MS));
      }

      const ranking = await new TradePostActivityRanking(source.getRepository('TradeTransaction') as never).top(now);

      expect(ranking).toHaveLength(10);
      expect(ranking[0]).toMatchObject({ postName: 'Posten 0', score: 11 });
      expect(ranking[9]).toMatchObject({ postName: 'Posten 9', score: 2 });
    });
  });

  it('sums Aurodium in trade accounts and offer reserves per player, without NPCs', async () => {
    const lando = await createUser(source, { username: 'Lando' });
    const jabba = await createUser(source, { username: 'Jabba', isNpc: true });
    const first = await post('Mos Eisley', 1, 0);
    const second = await post('Anchorhead', 1, 1);
    const storage = source.getRepository('TradeAccountStorage');
    await storage.save([
      { tradePostId: first, userId: lando.id, commodityId: AURODIUM, amount: 30 },
      { tradePostId: second, userId: lando.id, commodityId: AURODIUM, amount: 12 },
      { tradePostId: first, userId: lando.id, commodityId: 51, amount: 999 },
      { tradePostId: first, userId: jabba.id, commodityId: AURODIUM, amount: 500 },
    ]);
    const offers = source.getRepository('TradeOffer');
    await offers.save([
      { tradePostId: first, userId: lando.id, wantedCommodityId: 2, wantedAmount: 1, offeredCommodityId: AURODIUM, offeredAmount: 4, offerCount: 2, reservedAmount: 8 },
      { tradePostId: second, userId: lando.id, wantedCommodityId: AURODIUM, wantedAmount: 4, offeredCommodityId: 2, offeredAmount: 1, offerCount: 1, reservedAmount: 1 },
      { tradePostId: first, userId: jabba.id, wantedCommodityId: 2, wantedAmount: 1, offeredCommodityId: AURODIUM, offeredAmount: 1, offerCount: 1, reservedAmount: 1 },
    ]);

    const accounts = await new TradeAccountAurodiumRankingSource(storage as never).totals(AURODIUM);
    const reserves = await new TradeOfferAurodiumRankingSource(offers as never).totals(AURODIUM);

    expect(accounts).toEqual([{ userId: lando.id, username: 'Lando', amount: 42 }]);
    expect(reserves).toEqual([{ userId: lando.id, username: 'Lando', amount: 8 }]);
  });
});
