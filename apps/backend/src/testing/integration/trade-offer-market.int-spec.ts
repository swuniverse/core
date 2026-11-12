import { DataSource } from 'typeorm';
import { MessagingService } from '../../modules/messaging/messaging.service';
import { TradeOfferMaintenanceService } from '../../modules/trade/trade-offer-maintenance.service';
import { TradeOfferMarketService } from '../../modules/trade/trade-offer-market.service';
import { TradeStorageService } from '../../modules/trade/trade-storage.service';
import { connectIntegrationDatabase, createUser, resetDatabase } from './database';

const AURODIUM = 5;
const DURASTAHL = 6;
const TIBANNA = 7;
const COMMODITIES = [
  { id: AURODIUM, name: 'Aurodium', isTradeable: true },
  { id: DURASTAHL, name: 'Durastahl', isTradeable: true },
  { id: TIBANNA, name: 'Tibanna', isTradeable: true },
];
const DAY_MS = 24 * 60 * 60 * 1000;

describe('taking and searching trade offers (PostgreSQL)', () => {
  let source: DataSource;
  beforeAll(async () => { source = await connectIntegrationDatabase(); });
  beforeEach(async () => resetDatabase(source));
  afterAll(async () => source?.destroy());

  let takerId: number;
  let sellerId: number;
  let postId: number;
  let otherPostId: number;
  let market: TradeOfferMarketService;
  let maintenance: TradeOfferMaintenanceService;

  beforeEach(async () => {
    takerId = (await createUser(source)).id;
    sellerId = (await createUser(source)).id;
    const gameData = {
      getCommodity: (id: number) => COMMODITIES.find((commodity) => commodity.id === id),
      getAllCommodities: () => COMMODITIES,
    };
    const messaging = new MessagingService(
      source.getRepository('Message') as never,
      source.getRepository('User') as never,
      {} as never,
      { emitToUser: () => undefined } as never,
      {} as never,
    );
    market = new TradeOfferMarketService(source, new TradeStorageService(source), messaging, gameData as never);
    maintenance = new TradeOfferMaintenanceService(source, messaging, gameData as never);
    const layer = await source.getRepository('Layer').save({ name: 'Handel', width: 2, height: 1 });
    const fieldType = await source.getRepository('GalaxyFieldType').findOneByOrFail({});
    const locations: number[] = [];
    for (const cx of [1, 2]) {
      const field = await source.getRepository('GalaxyField').save({ layerId: layer.id, cx, cy: 1, fieldTypeId: fieldType.id });
      locations.push((await source.getRepository('SpaceLocation').findOneByOrFail({ galaxyFieldId: field.id })).id);
    }
    postId = (await source.getRepository('TradePost').save({ name: 'Mos Eisley', networkId: 1, ownerId: sellerId, locationId: locations[0], storageLimit: 100 })).id;
    otherPostId = (await source.getRepository('TradePost').save({ name: 'Anchorhead', networkId: 1, ownerId: sellerId, locationId: locations[1], storageLimit: 100 })).id;
    for (const userId of [takerId, sellerId]) await license(postId, userId);
    await account(postId, takerId, DURASTAHL, 20);
  });

  function license(tradePostId: number, userId: number) {
    return source.getRepository('TradeLicense').save({ tradePostId, userId, startsAt: new Date(Date.now() - DAY_MS), expiresAt: new Date(Date.now() + DAY_MS) });
  }

  function account(tradePostId: number, userId: number, commodityId: number, amount: number) {
    return source.getRepository('TradeAccountStorage').save({ tradePostId, userId, commodityId, amount });
  }

  const stockOf = async (userId: number, commodityId: number, tradePostId = postId) =>
    (await source.getRepository('TradeAccountStorage').findOneBy({ tradePostId, userId, commodityId }))?.amount ?? 0;

  /** Seller gives 10 Aurodium for 4 Durastahl, five times. */
  function sellerOffer(values: Record<string, unknown> = {}) {
    return source.getRepository('TradeOffer').save({
      tradePostId: postId,
      userId: sellerId,
      offeredCommodityId: AURODIUM,
      offeredAmount: 10,
      wantedCommodityId: DURASTAHL,
      wantedAmount: 4,
      offerCount: 5,
      reservedAmount: 50,
      ...values,
    });
  }

  it('takes an offer, books both accounts, records the transaction and informs the seller', async () => {
    const offer = await sellerOffer();

    expect(await market.take(offer.id, takerId, 3)).toEqual({ taken: 3, message: 'Das Angebot wurde 3 mal angenommen' });

    expect(await stockOf(takerId, DURASTAHL)).toBe(8);
    expect(await stockOf(takerId, AURODIUM)).toBe(30);
    expect(await stockOf(sellerId, DURASTAHL)).toBe(12);
    expect(await source.getRepository('TradeOffer').findOneByOrFail({ id: offer.id })).toMatchObject({ offerCount: 2, reservedAmount: 20 });
    expect(await source.getRepository('TradeTransaction').find()).toMatchObject([
      { tradePostId: postId, buyerId: takerId, sellerId, wantedCommodityId: DURASTAHL, wantedAmount: 12, offeredCommodityId: AURODIUM, offeredAmount: 30 },
    ]);
    const [message] = await source.getRepository('Message').find();
    expect(message).toMatchObject({ recipientId: sellerId, folder: 'TRADE', subject: 'Angebot angenommen' });
    expect(message.body).toContain('3-mal angenommen: Am Mos Eisley wurden insgesamt 30 Aurodium gegen 12 Durastahl getauscht.');
  });

  it('cuts the count to the payment stock, the free space for the net gain and the remaining offers', async () => {
    const offer = await sellerOffer();
    await source.getRepository('TradeAccountStorage').update({ tradePostId: postId, userId: takerId, commodityId: DURASTAHL }, { amount: 9 });
    expect((await market.take(offer.id, takerId, 5)).taken).toBe(2);

    await source.getRepository('TradeAccountStorage').update({ tradePostId: postId, userId: takerId, commodityId: DURASTAHL }, { amount: 20 });
    // occupied 20 Durastahl + 20 Aurodium from the first take = 40; limit 47 leaves 7 for a net gain of 6 per take
    await source.getRepository('TradePost').update(postId, { storageLimit: 47 });
    expect((await market.take(offer.id, takerId, 3)).taken).toBe(1);

    await source.getRepository('TradePost').update(postId, { storageLimit: 1000 });
    expect((await market.take(offer.id, takerId, 10)).taken).toBe(2);
    expect(await source.getRepository('TradeOffer').countBy({ id: offer.id })).toBe(0);
  });

  it('rejects takes without space, stock, license, own offers, NPC takers and gone offers', async () => {
    const offer = await sellerOffer();
    // Without a reserve, so the own offer does not take account space in the space cases below.
    const own = await sellerOffer({ userId: takerId, offeredCommodityId: DURASTAHL, wantedCommodityId: AURODIUM, reservedAmount: 0 });
    const npc = await createUser(source, { isNpc: true });
    await license(postId, npc.id);
    const unlicensed = await createUser(source);
    await account(postId, unlicensed.id, DURASTAHL, 50);

    await expect(market.take(offer.id, takerId, 0)).rejects.toThrow('Die Anzahl muss mindestens 1 sein');
    await expect(market.take(own.id, takerId, 1)).rejects.toThrow('Eigene Angebote können nicht angenommen werden');
    await expect(market.take(offer.id, npc.id, 1)).rejects.toThrow('NPC-Konten können keine Angebote annehmen');
    await expect(market.take(offer.id, unlicensed.id, 1)).rejects.toThrow('Du benötigst eine gültige Lizenz für diesen Handelsposten');
    await expect(market.take(999_999, takerId, 1)).rejects.toThrow('Das Angebot ist nicht mehr verfügbar');

    await source.getRepository('TradeAccountStorage').update({ tradePostId: postId, userId: takerId }, { amount: 3 });
    await expect(market.take(offer.id, takerId, 1)).rejects.toThrow('Nicht genügend Durastahl auf diesem Handelsposten vorhanden');

    await source.getRepository('TradeAccountStorage').update({ tradePostId: postId, userId: takerId }, { amount: 20 });
    await source.getRepository('TradePost').update(postId, { storageLimit: 20 });
    await expect(market.take(offer.id, takerId, 1)).rejects.toThrow('Dein Warenkonto auf diesem Handelsposten ist voll');
    await source.getRepository('TradePost').update(postId, { storageLimit: 25 });
    await expect(market.take(offer.id, takerId, 1))
      .rejects.toThrow('Es steht für diese Transaktion nicht genügend Platz in deinem Warenkonto zur Verfügung');

    expect(await source.getRepository('TradeOffer').findOneByOrFail({ id: offer.id })).toMatchObject({ offerCount: 5, reservedAmount: 50 });
    expect(await source.getRepository('TradeTransaction').count()).toBe(0);
    expect(await source.getRepository('Message').count()).toBe(0);
  });

  it('never takes more than the remaining offers under concurrent takes', async () => {
    const offer = await sellerOffer({ offerCount: 2, reservedAmount: 20 });
    const second = await createUser(source);
    await license(postId, second.id);
    await account(postId, second.id, DURASTAHL, 20);

    const results = await Promise.allSettled([
      market.take(offer.id, takerId, 2),
      market.take(offer.id, second.id, 2),
    ]);

    expect(results.map((result) => result.status).sort()).toEqual(['fulfilled', 'rejected']);
    expect(await source.getRepository('TradeOffer').countBy({ id: offer.id })).toBe(0);
    expect((await stockOf(takerId, AURODIUM)) + (await stockOf(second.id, AURODIUM))).toBe(20);
    expect(await stockOf(sellerId, DURASTAHL)).toBe(8);
  });

  it('searches offers at licensed posts by commodity mode and post with pagination', async () => {
    const giveAurodium = await sellerOffer();
    const wantAurodium = await sellerOffer({ offeredCommodityId: TIBANNA, wantedCommodityId: AURODIUM, offerCount: 1, reservedAmount: 10 });
    await sellerOffer({ tradePostId: otherPostId });

    const ids = async (query: Parameters<TradeOfferMarketService['search']>[1]) =>
      (await market.search(takerId, query)).items.map((item) => item.id).sort((a, b) => a - b);
    expect(await ids({ commodityId: AURODIUM, mode: 'offer' })).toEqual([giveAurodium.id]);
    expect(await ids({ commodityId: AURODIUM, mode: 'demand' })).toEqual([wantAurodium.id]);
    expect(await ids({ commodityId: AURODIUM, mode: 'both' })).toEqual([giveAurodium.id, wantAurodium.id]);
    expect(await ids({ postId: otherPostId })).toEqual([]);

    const result = await market.search(takerId, {});
    expect(result).toMatchObject({ total: 2, page: 1, pageSize: 25, licensedPosts: [{ id: postId, name: 'Mos Eisley' }] });
    expect(result.commodities.map((commodity) => commodity.name)).toEqual(['Aurodium', 'Durastahl', 'Tibanna']);
    expect(result.items.find((item) => item.id === giveAurodium.id)).toMatchObject({ isOwn: false, maxTake: 5, ownerName: expect.any(String), networkId: 1 });
    expect((await market.search(sellerId, {})).items.every((item) => item.isOwn && item.maxTake === 0)).toBe(true);
    expect((await market.search(takerId, { page: 2 })).items).toEqual([]);
  });

  it('summarizes offers giving or wanting one commodity, best deals first', async () => {
    const cheap = await sellerOffer({ offeredAmount: 10, wantedAmount: 2, offerCount: 1, reservedAmount: 10 });
    const dear = await sellerOffer({ offeredAmount: 10, wantedAmount: 5, offerCount: 1, reservedAmount: 10 });
    const wanting = await sellerOffer({ offeredCommodityId: TIBANNA, wantedCommodityId: AURODIUM, offerCount: 1, reservedAmount: 10 });

    const overview = await market.byCommodity(takerId, AURODIUM);

    expect(overview.commodityName).toBe('Aurodium');
    expect(overview.offered.map((item) => item.id)).toEqual([cheap.id, dear.id]);
    expect(overview.wanted.map((item) => item.id)).toEqual([wanting.id]);
  });

  it('expires offers older than two weeks, returns the reserve and informs the owner once', async () => {
    const now = new Date('2026-11-30T03:00:00Z');
    const old = await sellerOffer();
    const oldOther = await sellerOffer({ offeredCommodityId: TIBANNA, reservedAmount: 30, offerCount: 3 });
    const recent = await sellerOffer({ wantedAmount: 3 });
    await source.getRepository('TradeOffer').update([old.id, oldOther.id], { createdAt: new Date(now.getTime() - 15 * DAY_MS) });
    await source.getRepository('TradeOffer').update(recent.id, { createdAt: new Date(now.getTime() - 13 * DAY_MS) });

    expect(await maintenance.run(now)).toBe('2 Angebote verfallen');

    expect((await source.getRepository('TradeOffer').find()).map((offer) => offer.id)).toEqual([recent.id]);
    expect(await stockOf(sellerId, AURODIUM)).toBe(50);
    expect(await stockOf(sellerId, TIBANNA)).toBe(30);
    expect(await source.getRepository('Message').find()).toMatchObject([
      {
        recipientId: sellerId,
        folder: 'TRADE',
        body: [
          'Deine folgenden Angebote wurden gelöscht und der Inhalt wieder deinen lagernden Waren zugeschrieben.',
          '\nMos Eisley:',
          '5 x angeboten: 10 Aurodium, verlangt: 4 Durastahl',
          '3 x angeboten: 10 Tibanna, verlangt: 4 Durastahl',
        ].join('\n'),
      },
    ]);
  });
});
