import { DataSource } from 'typeorm';
import { TradeOfferCommodityLocationSource } from '../../modules/database/trade-offer-commodity-location.source';
import { TradeOfferService } from '../../modules/trade/trade-offer.service';
import { TradeStorageService } from '../../modules/trade/trade-storage.service';
import { connectIntegrationDatabase, createUser, resetDatabase } from './database';

const AURODIUM = 5;
const DURASTAHL = 6;
const PRISONERS = 9;
const COMMODITIES = [
  { id: AURODIUM, name: 'Aurodium', isTradeable: true },
  { id: DURASTAHL, name: 'Durastahl', isTradeable: true },
  { id: PRISONERS, name: 'Gefangene', isTradeable: false },
];
const DAY_MS = 24 * 60 * 60 * 1000;

describe('trade offers (PostgreSQL)', () => {
  let source: DataSource;
  beforeAll(async () => { source = await connectIntegrationDatabase(); });
  beforeEach(async () => resetDatabase(source));
  afterAll(async () => source?.destroy());

  let userId: number;
  let postId: number;
  let storage: TradeStorageService;
  let offers: TradeOfferService;

  beforeEach(async () => {
    userId = (await createUser(source)).id;
    const owner = await createUser(source);
    const gameData = {
      getCommodity: (id: number) => COMMODITIES.find((commodity) => commodity.id === id),
      getAllCommodities: () => COMMODITIES,
    };
    storage = new TradeStorageService(source);
    offers = new TradeOfferService(source, storage, gameData as never);
    const layer = await source.getRepository('Layer').save({ name: 'Handel', width: 1, height: 1 });
    const fieldType = await source.getRepository('GalaxyFieldType').findOneByOrFail({});
    const field = await source.getRepository('GalaxyField').save({ layerId: layer.id, cx: 1, cy: 1, fieldTypeId: fieldType.id });
    const locationId = (await source.getRepository('SpaceLocation').findOneByOrFail({ galaxyFieldId: field.id })).id;
    postId = (await source.getRepository('TradePost').save({ name: 'Mos Eisley', networkId: 1, ownerId: owner.id, locationId, storageLimit: 100 })).id;
    await source.getRepository('TradeLicense').save({ tradePostId: postId, userId, startsAt: new Date(Date.now() - DAY_MS), expiresAt: new Date(Date.now() + DAY_MS) });
    await account(AURODIUM, 50);
  });

  function account(commodityId: number, amount: number, owner = userId) {
    return source.getRepository('TradeAccountStorage').save({ tradePostId: postId, userId: owner, commodityId, amount });
  }

  const stockOf = async (commodityId: number) =>
    (await source.getRepository('TradeAccountStorage').findOneBy({ tradePostId: postId, userId, commodityId }))?.amount ?? 0;

  const offer = (values: Partial<{ offeredCommodityId: number; offeredAmount: number; wantedCommodityId: number; wantedAmount: number; offerCount: number }> = {}) => ({
    offeredCommodityId: AURODIUM,
    offeredAmount: 10,
    wantedCommodityId: DURASTAHL,
    wantedAmount: 5,
    offerCount: 3,
    ...values,
  });

  it('reserves the offered goods from the account and keeps them counting against its space', async () => {
    const result = await offers.create(postId, userId, offer());

    expect(result.message).toBe('Das Angebot wurde erstellt');
    expect(result.offer).toMatchObject({
      tradePostId: postId,
      tradePostName: 'Mos Eisley',
      offeredCommodityName: 'Aurodium',
      offeredAmount: 10,
      wantedCommodityName: 'Durastahl',
      wantedAmount: 5,
      offerCount: 3,
      reservedAmount: 30,
    });
    expect(await stockOf(AURODIUM)).toBe(20);
    expect(await storage.getCapacity(postId, userId)).toMatchObject({ stock: 20, reserved: 30, occupied: 50, free: 50 });
  });

  it('truncates the number of offers to the stock like STU', async () => {
    const result = await offers.create(postId, userId, offer({ offerCount: 9 }));

    expect(result.offer).toMatchObject({ offerCount: 5, reservedAmount: 50 });
    expect(result.message).toBe('Das Angebot wurde erstellt (Anzahl auf 5 gekürzt)');
    expect(await source.getRepository('TradeAccountStorage').countBy({ userId })).toBe(0);
  });

  it('enforces every STU creation rule without touching the account', async () => {
    await account(PRISONERS, 10);
    const cases: Array<[ReturnType<typeof offer>, string]> = [
      [offer({ wantedCommodityId: AURODIUM }), 'Es kann nicht die gleiche Ware eingetauscht werden'],
      [offer({ offeredAmount: 0 }), 'Es wurde keine angebotene Menge angegeben'],
      [offer({ wantedAmount: 0 }), 'Es wurde keine verlangte Menge angegeben'],
      [offer({ offerCount: 0 }), 'Es wurde keine Anzahl an Angeboten angegeben'],
      [offer({ offerCount: 100 }), 'Es sind höchstens 99 Angebote auf einmal möglich'],
      [offer({ offeredCommodityId: PRISONERS }), 'Diese Ware kann nicht gehandelt werden'],
      [offer({ wantedCommodityId: PRISONERS }), 'Diese Ware kann nicht gehandelt werden'],
      [offer({ offeredCommodityId: DURASTAHL, wantedCommodityId: AURODIUM }), 'Waren zum Erstellen des Angebots nicht gefunden'],
      [offer({ offeredAmount: 60 }), 'Nicht genügend Waren im Warenkonto'],
    ];
    for (const [input, message] of cases) {
      await expect(offers.create(postId, userId, input)).rejects.toThrow(message);
    }
    expect(await stockOf(AURODIUM)).toBe(50);
    expect(await source.getRepository('TradeOffer').count()).toBe(0);
  });

  it('rejects an equivalent offer with the same rounded ratio but accepts a different one', async () => {
    await offers.create(postId, userId, offer({ offerCount: 1 }));

    await expect(offers.create(postId, userId, offer({ offeredAmount: 20, wantedAmount: 10, offerCount: 1 })))
      .rejects.toThrow('Du hast auf diesem Handelsposten bereits ein vergleichbares Angebot');
    await expect(offers.create(postId, userId, offer({ offeredAmount: 10, wantedAmount: 6, offerCount: 1 }))).resolves.toBeTruthy();
    expect(await source.getRepository('TradeOffer').count()).toBe(2);
  });

  it('requires a valid license and free account space', async () => {
    await source.getRepository('TradePost').update(postId, { storageLimit: 50 });
    await expect(offers.create(postId, userId, offer()))
      .rejects.toThrow('Dein Warenkonto auf diesem Handelsposten ist überfüllt - Angebot kann nicht erstellt werden');

    await source.getRepository('TradeLicense').update({ tradePostId: postId, userId }, { expiresAt: new Date(Date.now() - 1) });
    await expect(offers.create(postId, userId, offer())).rejects.toThrow('Du benötigst eine gültige Lizenz für diesen Handelsposten');
    expect(await stockOf(AURODIUM)).toBe(50);
  });

  it('returns the remaining reserve on cancel even when the account overflows, which then blocks deposits', async () => {
    const created = await offers.create(postId, userId, offer());
    await account(DURASTAHL, 0);
    await source.getRepository('TradePost').update(postId, { storageLimit: 25 });

    expect(await offers.cancel(created.offer.id, userId)).toEqual({ message: 'Das Angebot wurde gelöscht' });

    expect(await stockOf(AURODIUM)).toBe(50);
    expect(await source.getRepository('TradeOffer').count()).toBe(0);
    expect(await storage.getCapacity(postId, userId)).toMatchObject({ occupied: 50, free: 0, capacity: 25 });
    await expect(storage.add(postId, userId, DURASTAHL, 1)).rejects.toThrow('Nicht genügend Platz auf dem Handelskonto');
  });

  it('lets only the offering player cancel', async () => {
    const created = await offers.create(postId, userId, offer());
    const other = await createUser(source);

    await expect(offers.cancel(created.offer.id, other.id)).rejects.toThrow('Das Angebot gehört nicht dir');
    await expect(offers.cancel(999_999, userId)).rejects.toThrow('Angebot nicht gefunden');
    expect(await source.getRepository('TradeOffer').count()).toBe(1);
  });

  it('never reserves more than the stock under concurrent creation', async () => {
    const results = await Promise.allSettled([
      offers.create(postId, userId, offer({ offerCount: 5, wantedAmount: 5 })),
      offers.create(postId, userId, offer({ offerCount: 5, wantedAmount: 4 })),
    ]);

    expect(results.map((result) => result.status).sort()).toEqual(['fulfilled', 'rejected']);
    const reserved = (await source.getRepository('TradeOffer').find()).reduce((sum, row) => sum + row.reservedAmount, 0);
    expect(reserved).toBe(50);
    expect(await stockOf(AURODIUM)).toBe(0);
  });

  it('lists own offers, offer options and offer reserves as commodity locations', async () => {
    const created = await offers.create(postId, userId, offer());
    const other = await createUser(source);
    await source.getRepository('TradeOffer').save({
      tradePostId: postId, userId: other.id, offeredCommodityId: AURODIUM, offeredAmount: 1, wantedCommodityId: DURASTAHL, wantedAmount: 1, offerCount: 1, reservedAmount: 1,
    });
    await account(PRISONERS, 4);

    expect((await offers.listMine(userId)).map((row) => row.id)).toEqual([created.offer.id]);
    expect(await offers.getOptions(postId, userId)).toEqual({
      tradePostId: postId,
      tradePostName: 'Mos Eisley',
      hasLicense: true,
      accountFree: 46,
      accountGoods: [{ commodityId: AURODIUM, commodityName: 'Aurodium', amount: 20 }],
      tradeableCommodities: [{ id: AURODIUM, name: 'Aurodium' }, { id: DURASTAHL, name: 'Durastahl' }],
    });
    expect(await new TradeOfferCommodityLocationSource(source.getRepository('TradeOffer') as never).findLocations(userId, AURODIUM)).toEqual([
      { type: 'TRADE_OFFER', id: postId, name: 'Mos Eisley', location: null, amount: 30 },
    ]);
  });
});
