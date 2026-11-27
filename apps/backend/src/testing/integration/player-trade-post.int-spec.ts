import { DataSource } from 'typeorm';
import type { User } from '../../modules/auth/user.entity';
import { MessagingService } from '../../modules/messaging/messaging.service';
import { StationConstructionService } from '../../modules/spacecraft/station-construction.service';
import { FieldEffectQuery } from '../../modules/starmap/field-effect-query';
import { PlayerTradePostService, UNLIMITED_LICENSE_EXPIRY } from '../../modules/trade/player-trade-post.service';
import { TradeAccountTransferService } from '../../modules/trade/trade-account-transfer.service';
import { TradeLicensePurchaseService } from '../../modules/trade/trade-license-purchase.service';
import { TradeLicenseService } from '../../modules/trade/trade-license.service';
import { TradeNetworkTransferService } from '../../modules/trade/trade-network-transfer.service';
import { TradeOfferService } from '../../modules/trade/trade-offer.service';
import { TradePostPresencePolicy } from '../../modules/trade/trade-post-presence.policy';
import { TradeQueryService } from '../../modules/trade/trade-query.service';
import { TradeStorageService } from '../../modules/trade/trade-storage.service';
import { connectIntegrationDatabase, createUser, resetDatabase } from './database';

const AURODIUM = 50;
const DURASTAHL = 10101;
const gameData = {
  getCommodity: (id: number) => ({ id, name: id === AURODIUM ? 'Aurodium' : 'Durastahl', isTradeable: true }),
  // Station definitions: no workbees needed, so one tick finishes the station.
  getShipClassDefByKey: () => ({ station: { location: 'EVERYWHERE', buildLimit: null, requiredWorkbees: 0, dockCapacity: 4 } }),
};

/** tmw-T12a: a finished outpost station becomes a player trade post. */
describe('player trade posts (PostgreSQL)', () => {
  let source: DataSource;
  beforeAll(async () => { source = await connectIntegrationDatabase(); });
  beforeEach(async () => resetDatabase(source));
  afterAll(async () => source?.destroy());

  let owner: User;
  let trader: User;
  let locationId: number;
  let stations: StationConstructionService;

  beforeEach(async () => {
    owner = await createUser(source, { username: 'Lando' });
    trader = await createUser(source, { username: 'Han' });
    const layer = await source.getRepository('Layer').save({ name: 'Rand', width: 1, height: 1 });
    const fieldType = await source.getRepository('GalaxyFieldType').findOneByOrFail({});
    const field = await source.getRepository('GalaxyField').save({ layerId: layer.id, cx: 1, cy: 1, fieldTypeId: fieldType.id });
    locationId = (await source.getRepository('SpaceLocation').findOneByOrFail({ galaxyFieldId: field.id })).id;
    stations = new StationConstructionService(source, gameData as never, new FieldEffectQuery(), new PlayerTradePostService({} as never, {} as never));
  });

  async function stationUnderConstruction(role: string) {
    const shipClass = await source.getRepository('ShipClassDef').save({
      key: `REBEL_${role}`, name: role === 'OUTPOST' ? 'Außenposten' : 'Sensorphalanx', category: 'STATION', role, buildTimeTicks: 1, hullBase: 100,
    });
    return (await source.getRepository('Spacecraft').save({
      name: 'Im Bau', userId: owner.id, shipClassId: shipClass.id, locationId, kind: 'STATION', stationRole: role,
      status: 'UNDER_CONSTRUCTION', constructionTicksRemaining: 1, runtimeSystems: {},
    })) as unknown as { id: number; userId: number; locationId: number };
  }

  it('numbers players from 100, like STU, so player networks never meet the NPC networks', () => {
    expect(owner.id).toBeGreaterThanOrEqual(100);
    expect(trader.id).toBeGreaterThan(owner.id);
  });

  it('creates the STU trade post and an unlimited owner license when an outpost is finished', async () => {
    const station = await stationUnderConstruction('OUTPOST');

    expect(await stations.processTick(station.id)).toMatchObject({ completed: true });

    const post = await source.getRepository('TradePost').findOneByOrFail({ stationId: station.id });
    expect(post).toMatchObject({
      name: 'Handelsposten', networkId: owner.id, ownerId: owner.id, level: 1,
      transferCapacity: 0, storageLimit: 10_000, locationId,
    });
    expect(await source.getRepository('TradeLicense').find()).toMatchObject([
      { tradePostId: post.id, userId: owner.id, expiresAt: UNLIMITED_LICENSE_EXPIRY },
    ]);
  });

  it('creates no post for other station roles', async () => {
    const station = await stationUnderConstruction('SENSOR');

    expect(await stations.processTick(station.id)).toMatchObject({ completed: true });

    expect(await source.getRepository('TradePost').count()).toBe(0);
    expect(await source.getRepository('TradeLicense').count()).toBe(0);
  });

  it('keeps one post per station and none on a field that already has a post', async () => {
    const posts = new PlayerTradePostService({} as never, {} as never);
    const station = await stationUnderConstruction('OUTPOST');
    const first = await posts.createForStation(source.manager, station);
    expect(await posts.createForStation(source.manager, station)).toMatchObject({ id: first?.id });

    const copy: Record<string, unknown> = { ...(await source.getRepository('Spacecraft').findOneByOrFail({ id: station.id })) };
    delete copy.id;
    const other = (await source.getRepository('Spacecraft').save({ ...copy, name: 'Zweiter' })) as unknown as typeof station;
    expect(await posts.createForStation(source.manager, other)).toBeNull();
    expect(await source.getRepository('TradePost').count()).toBe(1);
  });

  it('works end to end: listed, licensed by others, deposits and offers', async () => {
    const station = await stationUnderConstruction('OUTPOST');
    await stations.processTick(station.id);
    const post = await source.getRepository('TradePost').findOneByOrFail({ stationId: station.id });

    const query = new TradeQueryService(
      source.getRepository('TradePost') as never, source.getRepository('TradeAccountStorage') as never,
      source.getRepository('Spacecraft') as never, source.getRepository('User') as never, source.getRepository('SpaceLocation') as never,
    );
    expect(await query.listPosts(trader.id)).toEqual([
      expect.objectContaining({ id: post.id, name: 'Handelsposten', networkId: owner.id, owner: { id: owner.id, name: 'Lando' } }),
    ]);

    const licenses = new TradeLicenseService(
      source.getRepository('TradePost') as never, source.getRepository('TradeLicenseCondition') as never,
      gameData as never, source.getRepository('TradeLicense') as never,
    );
    await licenses.setCondition(post.id, owner.id, { commodityId: AURODIUM, amount: 5, durationDays: 7 });
    await expect(licenses.setCondition(post.id, trader.id, { commodityId: AURODIUM, amount: 1, durationDays: 7 })).rejects.toThrow();

    const shipClassId = (await source.getRepository('ShipClassDef').save({ key: 'TRADER', name: 'Händler', category: 'SHIP', role: 'FREIGHTER' })).id;
    const ship = await source.getRepository('Spacecraft').save({ name: 'Falke', userId: trader.id, shipClassId, locationId, runtimeSystems: {} });
    await source.getRepository('CargoItem').save([
      { spacecraftId: ship.id, commodityId: AURODIUM, amount: 5 },
      { spacecraftId: ship.id, commodityId: DURASTAHL, amount: 40 },
    ]);
    const messaging = new MessagingService(
      source.getRepository('Message') as never, source.getRepository('User') as never, {} as never,
      { emitToUser: () => undefined } as never, {} as never,
    );
    const purchases = new TradeLicensePurchaseService(
      source, new TradePostPresencePolicy(), messaging
    );
    await purchases.purchase(post.id, trader.id, { method: 'ship', shipId: ship.id, payShipId: ship.id });
    expect(await source.getRepository('TradeAccountStorage').findOneBy({ tradePostId: post.id, userId: owner.id, commodityId: AURODIUM }))
      .toMatchObject({ amount: 5 });

    const storage = new TradeStorageService(source);
    const deposits = new TradeAccountTransferService(source, new TradePostPresencePolicy(), storage, gameData as never);
    await deposits.transfer(ship.id, trader.id, post.id, 'TO_ACCOUNT', [{ commodityId: DURASTAHL, amount: 40 }]);
    expect(await source.getRepository('TradeAccountStorage').findOneBy({ tradePostId: post.id, userId: trader.id, commodityId: DURASTAHL }))
      .toMatchObject({ amount: 40 });

    const offers = new TradeOfferService(source, storage, gameData as never);
    const { offer } = await offers.create(post.id, trader.id, {
      offeredCommodityId: DURASTAHL, offeredAmount: 10, wantedCommodityId: AURODIUM, wantedAmount: 1, offerCount: 2,
    });
    expect(offer).toMatchObject({ tradePostId: post.id, offerCount: 2 });

    // The owner's network holds just this post: no transfer targets, and the capacity is 0 like in STU.
    const transfers = new TradeNetworkTransferService(source, storage, gameData as never);
    expect(await transfers.targets(post.id, owner.id)).toMatchObject({ free: 0, capacity: 0, targets: [] });
  });
});
