import { DataSource } from 'typeorm';
import type { User } from '../../modules/auth/user.entity';
import { PlayerDeletionService } from '../../modules/account-deletion/player-deletion.service';
import { GameEvent, GameEventType } from '../../modules/events/entities/game-event.entity';
import { GameEventService } from '../../modules/events/game-event.service';
import { MessagingService } from '../../modules/messaging/messaging.service';
import { ABANDONED_TRADE_POST_NAME, PlayerTradePostService } from '../../modules/trade/player-trade-post.service';
import { TradeAccountTransferService } from '../../modules/trade/trade-account-transfer.service';
import { TradeDeletionHandler } from '../../modules/trade/trade-deletion.handler';
import { TradeLicensePurchaseService } from '../../modules/trade/trade-license-purchase.service';
import { TradeNetworkTransferService } from '../../modules/trade/trade-network-transfer.service';
import { TradeOfferMarketService } from '../../modules/trade/trade-offer-market.service';
import { TradeOfferService } from '../../modules/trade/trade-offer.service';
import { TradePostPresencePolicy } from '../../modules/trade/trade-post-presence.policy';
import { TradeQueryService } from '../../modules/trade/trade-query.service';
import { TradeStorageService } from '../../modules/trade/trade-storage.service';
import { connectIntegrationDatabase, createUser, resetDatabase } from './database';

const AURODIUM = 50;
const DURASTAHL = 10101;
const TIBANNA = 10102;
const DAY_MS = 24 * 60 * 60 * 1000;
const ABANDONED = 'Dieser Handelsposten wurde verlassen. Handel ist nicht mehr möglich.';
const gameData = {
  getCommodity: (id: number) => ({ id, name: `Ware ${id}`, isTradeable: true, isBeamable: true }),
};

/** tmw-T12c: destruction and abandonment of player trade posts. */
describe('player trade post destruction and abandonment (PostgreSQL)', () => {
  let source: DataSource;
  beforeAll(async () => { source = await connectIntegrationDatabase(); });
  beforeEach(async () => resetDatabase(source));
  afterAll(async () => source?.destroy());

  let owner: User;
  let trader: User;
  let bystander: User;
  let messaging: MessagingService;
  let posts: PlayerTradePostService;
  let stationId: number;
  let postId: number;
  let otherPostId: number;
  let locationId: number;
  let shipClassId: number;

  const messagesOf = (recipientId: number) =>
    source.getRepository('Message').find({ where: { recipientId }, order: { id: 'ASC' } }) as Promise<Array<{ body: string }>>;

  beforeEach(async () => {
    owner = await createUser(source, { username: 'Lando' });
    trader = await createUser(source, { username: 'Han' });
    bystander = await createUser(source, { username: 'Leia' });
    messaging = new MessagingService(
      source.getRepository('Message') as never, source.getRepository('User') as never, {} as never,
      { emitToUser: () => undefined } as never, {} as never,
    );
    posts = new PlayerTradePostService(messaging, new GameEventService(source.getRepository(GameEvent), {} as never));
    const layer = await source.getRepository('Layer').save({ name: 'Rand', width: 3, height: 1 });
    const fieldType = await source.getRepository('GalaxyFieldType').findOneByOrFail({});
    const locations: number[] = [];
    for (const cx of [1, 2]) {
      const field = await source.getRepository('GalaxyField').save({ layerId: layer.id, cx, cy: 1, fieldTypeId: fieldType.id });
      locations.push((await source.getRepository('SpaceLocation').findOneByOrFail({ galaxyFieldId: field.id })).id);
    }
    locationId = locations[0];
    shipClassId = (await source.getRepository('ShipClassDef').save({
      key: 'REBEL_OUTPOST', name: 'Außenposten', category: 'STATION', role: 'OUTPOST',
    }) as unknown as { id: number }).id;
    stationId = (await source.getRepository('Spacecraft').save({
      name: 'Außenposten', userId: owner.id, shipClassId, locationId, kind: 'STATION', stationRole: 'OUTPOST', runtimeSystems: {},
    }) as unknown as { id: number }).id;
    postId = (await source.getRepository('TradePost').save({
      name: 'Wolkenhafen', description: 'Bespin', networkId: owner.id, level: 1, transferCapacity: 100, storageLimit: 10_000,
      ownerId: owner.id, locationId, stationId,
    }) as unknown as { id: number }).id;
    // A second post of the same network that stays occupied, so transfers between both are possible.
    otherPostId = (await source.getRepository('TradePost').save({
      name: 'Zweitposten', description: '', networkId: owner.id, level: 1, transferCapacity: 100, storageLimit: 10_000,
      ownerId: bystander.id, locationId: locations[1], stationId: null,
    }) as unknown as { id: number }).id;
    const now = Date.now();
    for (const user of [owner, trader]) {
      for (const tradePostId of [postId, otherPostId]) {
        await source.getRepository('TradeLicense').save({
          tradePostId, userId: user.id, startsAt: new Date(now), expiresAt: new Date(now + 30 * DAY_MS),
        });
      }
    }
    await source.getRepository('TradeLicenseCondition').save({ tradePostId: postId, commodityId: AURODIUM, amount: 5, durationDays: 7 });
    await source.getRepository('TradeAccountStorage').save([
      { tradePostId: postId, userId: owner.id, commodityId: AURODIUM, amount: 10 },
      { tradePostId: postId, userId: trader.id, commodityId: DURASTAHL, amount: 100 },
      { tradePostId: postId, userId: trader.id, commodityId: TIBANNA, amount: 7 },
    ]);
    await source.getRepository('TradeOffer').save({
      tradePostId: postId, userId: trader.id, offeredCommodityId: TIBANNA, offeredAmount: 3, wantedCommodityId: AURODIUM,
      wantedAmount: 1, offerCount: 2, reservedAmount: 6,
    });
  });

  describe('destruction of the station', () => {
    it('salvages by the STU rule, removes the post with everything on it and notifies the account holders', async () => {
      // Per line: keep? (0 = lost), then 0-50 % of the amount, rounded up.
      const draws = [1, 50, 0, 1, 10, 1, 0];
      const randomInt = jest.fn(() => draws.shift() as number);

      const salvage = await source.transaction((manager) =>
        posts.destroyForStation(manager, { id: stationId }, { manager, afterCommit: [] }, randomInt),
      );

      // Lines in id order: owner Aurodium 10, trader Durastahl 100, trader Tibanna 7, trader offer reserve Tibanna 6.
      expect(randomInt.mock.calls).toEqual([[0, 1], [0, 50], [0, 1], [0, 1], [0, 50], [0, 1], [0, 50]]);
      expect(salvage).toEqual([
        { commodityId: AURODIUM, amount: 5 },
        { commodityId: TIBANNA, amount: 1 },
      ]);
      for (const entity of ['TradePost', 'TradeAccountStorage', 'TradeOffer', 'TradeLicense', 'TradeLicenseCondition']) {
        expect(await source.getRepository(entity).countBy({ ...(entity === 'TradePost' ? { id: postId } : { tradePostId: postId }) })).toBe(0);
      }
      expect(await source.getRepository('TradePost').countBy({ id: otherPostId })).toBe(1);
      for (const user of [owner, trader]) {
        expect(await messagesOf(user.id)).toEqual([
          expect.objectContaining({
            body: 'Der Handelsposten "Wolkenhafen" bei 1|1 wurde zerstört. Deine Waren und Angebote dort sind verloren.',
          }),
        ]);
      }
      expect(await messagesOf(bystander.id)).toEqual([]);
    });

    it('does nothing for a station without trade post', async () => {
      await source.getRepository('TradePost').update(postId, { stationId: null });
      const randomInt = jest.fn(() => 1);
      await expect(
        source.transaction((manager) =>
          posts.destroyForStation(manager, { id: stationId }, { manager, afterCommit: [] }, randomInt),
        ),
      ).resolves.toEqual([]);
      expect(randomInt).not.toHaveBeenCalled();
      expect(await source.getRepository('TradePost').countBy({ id: postId })).toBe(1);
    });
  });

  describe('deletion of the owner', () => {
    async function deleteOwner() {
      const deletions = new PlayerDeletionService(source);
      new TradeDeletionHandler(deletions, posts).onModuleInit();
      await deletions.delete(owner.id);
    }

    it('abandons the post: no owner, STU name, detached from the deleted station, holders notified', async () => {
      await deleteOwner();

      expect(await source.getRepository('User').countBy({ id: owner.id })).toBe(0);
      expect(await source.getRepository('Spacecraft').countBy({ id: stationId })).toBe(0);
      expect(await source.getRepository('TradePost').findOneByOrFail({ id: postId })).toMatchObject({
        ownerId: null, stationId: null, locationId, networkId: owner.id,
        name: ABANDONED_TRADE_POST_NAME, description: ABANDONED_TRADE_POST_NAME,
      });
      expect(await source.getRepository('TradeLicenseCondition').countBy({ tradePostId: postId })).toBe(0);
      // Accounts, offers and licenses of other players stay, so they can still withdraw.
      expect(await source.getRepository('TradeAccountStorage').countBy({ tradePostId: postId, userId: trader.id })).toBe(2);
      expect(await source.getRepository('TradeLicense').countBy({ tradePostId: postId, userId: trader.id })).toBe(1);
      expect(await messagesOf(trader.id)).toEqual([
        expect.objectContaining({
          body: 'Der Handelsposten "Wolkenhafen" bei den Koordinaten 1|1 wurde verlassen. Du solltest deine Waren hier schleunigst abholen, sonst gehen sie verloren.',
        }),
      ]);
      expect(await messagesOf(bystander.id)).toEqual([]);
      expect(await source.getRepository(GameEvent).find()).toEqual([
        expect.objectContaining({
          type: GameEventType.STATION, text: 'Der Handelsposten in Sektor 1|1 wurde verlassen.',
          scope: 'GALAXY', x: 1, y: 1, locationId,
        }),
      ]);

      const query = new TradeQueryService(
        source.getRepository('TradePost') as never, source.getRepository('TradeAccountStorage') as never,
        source.getRepository('Spacecraft') as never, source.getRepository('User') as never, source.getRepository('SpaceLocation') as never,
      );
      expect((await query.listPosts(trader.id)).find((post) => post.id === postId)).toMatchObject({
        name: ABANDONED_TRADE_POST_NAME, owner: null,
      });
    });

    it('blocks trading at the abandoned post like STU but keeps withdrawals possible', async () => {
      const storage = new TradeStorageService(source);
      const presence = new TradePostPresencePolicy();
      const ship = await source.getRepository('Spacecraft').save({
        name: 'Falke', userId: trader.id, shipClassId, locationId, runtimeSystems: {}, cargoMax: 500,
      }) as unknown as { id: number };
      await source.getRepository('CargoItem').save({ spacecraftId: ship.id, commodityId: AURODIUM, amount: 5 });
      const buyer = await createUser(source, { username: 'Chewie' });
      await source.getRepository('TradeLicense').save({
        tradePostId: postId, userId: buyer.id, startsAt: new Date(), expiresAt: new Date(Date.now() + DAY_MS),
      });
      await source.getRepository('TradeAccountStorage').save({ tradePostId: postId, userId: buyer.id, commodityId: AURODIUM, amount: 5 });
      const offer = await source.getRepository('TradeOffer').findOneByOrFail({ tradePostId: postId, userId: trader.id }) as { id: number };
      await deleteOwner();

      const offers = new TradeOfferService(source, storage, gameData as never);
      await expect(offers.create(postId, trader.id, {
        offeredCommodityId: DURASTAHL, offeredAmount: 10, wantedCommodityId: AURODIUM, wantedAmount: 1, offerCount: 1,
      })).rejects.toThrow(ABANDONED);
      const market = new TradeOfferMarketService(source, storage, messaging, gameData as never);
      await expect(market.take(offer.id, buyer.id, 1)).rejects.toThrow(ABANDONED);
      const purchases = new TradeLicensePurchaseService(
        source, presence, messaging
      );
      await source.getRepository('TradeLicense').delete({ tradePostId: postId, userId: trader.id });
      await expect(purchases.purchase(postId, trader.id, { method: 'ship', shipId: ship.id, payShipId: ship.id }))
        .rejects.toThrow(ABANDONED);
      await source.getRepository('TradeLicense').save({
        tradePostId: postId, userId: trader.id, startsAt: new Date(), expiresAt: new Date(Date.now() + DAY_MS),
      });
      await expect(purchases.renew(postId, trader.id, { accountPostId: postId })).rejects.toThrow(ABANDONED);
      const transfers = new TradeNetworkTransferService(source, storage, gameData as never);
      await source.getRepository('TradeAccountStorage').save({ tradePostId: otherPostId, userId: trader.id, commodityId: DURASTAHL, amount: 50 });
      await expect(transfers.transfer(otherPostId, trader.id, { targetPostId: postId, commodityId: DURASTAHL, amount: 5 }))
        .rejects.toThrow(ABANDONED);
      expect((await transfers.targets(otherPostId, trader.id)).targets).toEqual([]);

      // Withdrawing to the ship and cancelling the own offer remain possible.
      await offers.cancel(offer.id, trader.id);
      const accounts = new TradeAccountTransferService(source, presence, storage, gameData as never);
      await accounts.transfer(ship.id, trader.id, postId, 'FROM_ACCOUNT', [{ commodityId: DURASTAHL, amount: 40 }]);
      expect(await source.getRepository('CargoItem').findOneBy({ spacecraftId: ship.id, commodityId: DURASTAHL }))
        .toMatchObject({ amount: 40 });
      await transfers.transfer(postId, trader.id, { targetPostId: otherPostId, commodityId: DURASTAHL, amount: 10 });
    });
  });
});
