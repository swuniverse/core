import { DataSource } from 'typeorm';
import { Faction } from '@swuniverse/shared';
import type { User } from '../../modules/auth/user.entity';
import { NpcKey } from '../../modules/auth/npc-account.service';
import { PlayerDeletionService } from '../../modules/account-deletion/player-deletion.service';
import { MessagingService } from '../../modules/messaging/messaging.service';
import { PrestigeService } from '../../modules/prestige/prestige.service';
import { TradeAuctionService } from '../../modules/trade/trade-auction.service';
import { TradeDealService } from '../../modules/trade/trade-deal.service';
import { TradeDeletionHandler } from '../../modules/trade/trade-deletion.handler';
import { TradeStorageService } from '../../modules/trade/trade-storage.service';
import { connectIntegrationDatabase, createUser, factionId, resetDatabase } from './database';

const AURODIUM = 50;
const DOONIUM = 2;
const HOUR_MS = 60 * 60 * 1000;
const gameData = {
  getCommodity: (id: number) => ({ id, name: id === AURODIUM ? 'Aurodium' : id === DOONIUM ? 'Doonium' : `Ware ${id}` }),
};

/** tmw-T8b: Hutt Cartel auctions (STU `DealsBidAuction`, `DealsTakeAuction`). */
describe('Hutt Cartel auctions (PostgreSQL)', () => {
  let source: DataSource;
  beforeAll(async () => { source = await connectIntegrationDatabase(); });
  beforeEach(async () => resetDatabase(source));
  afterAll(async () => source?.destroy());

  let rebels: number;
  let postId: number;
  let locationId: number;
  let deals: TradeDealService;
  let auctions: TradeAuctionService;
  let ships: Array<{ userId: number; buildplanId: number }>;
  let now: Date;
  let lando: User;
  let han: User;
  let leia: User;

  beforeEach(async () => {
    now = new Date();
    ships = [];
    rebels = await factionId(source, Faction.REBEL_ALLIANCE);
    const hutts = await createUser(source, { isNpc: true, npcKey: NpcKey.HUTT_CARTEL });
    const layer = await source.getRepository('Layer').save({ name: 'Handel', width: 1, height: 1 });
    const fieldType = await source.getRepository('GalaxyFieldType').findOneByOrFail({});
    const field = await source.getRepository('GalaxyField').save({ layerId: layer.id, cx: 1, cy: 1, fieldTypeId: fieldType.id });
    locationId = (await source.getRepository('SpaceLocation').findOneByOrFail({ galaxyFieldId: field.id })).id;
    postId = (await source.getRepository('TradePost').save({ name: 'Hutten-Handelsposten', networkId: 3, ownerId: hutts.id, locationId })).id;
    lando = await rebel('Lando', 100);
    han = await rebel('Han', 100);
    leia = await rebel('Leia', 100);

    const prestige = new PrestigeService(source.getRepository('PrestigeHistoryEntry') as never);
    deals = new TradeDealService(source, new TradeStorageService(source), prestige, gameData as never);
    deals.registerFulfillment({
      createShip: async (_manager, input) => { ships.push(input); },
      grantBuildplan: async () => undefined,
    });
    const messaging = new MessagingService(
      source.getRepository('Message') as never,
      source.getRepository('User') as never,
      {} as never,
      { emitToUser: () => undefined } as never,
      {} as never,
    );
    auctions = new TradeAuctionService(source, deals, prestige, messaging);
  });

  async function rebel(username: string, prestige: number) {
    const user = await createUser(source, { username, faction: Faction.REBEL_ALLIANCE, factionId: rebels, prestige });
    await source.getRepository('TradeLicense').save({ tradePostId: postId, userId: user.id, startsAt: new Date(Date.now() - HOUR_MS), expiresAt: new Date(Date.now() + 24 * HOUR_MS), warningSentAt: null });
    return user;
  }

  async function auction(values: Record<string, unknown> = {}) {
    return (await source.getRepository('TradeDeal').save({
      auction: true, giveCommodityId: DOONIUM, giveCommodityAmount: 500, wantPrestige: 1,
      startsAt: new Date(now.getTime() - HOUR_MS), endsAt: new Date(now.getTime() + HOUR_MS),
      ...values,
    })).id as number;
  }

  const prestigeOf = async (user: User) => (await source.getRepository('User').findOneByOrFail({ id: user.id })).prestige;
  const dealOf = (id: number) => source.getRepository('TradeDeal').findOneByOrFail({ id });
  const stock = async (user: User, commodityId: number) =>
    (await source.getRepository('TradeAccountStorage').findOneBy({ tradePostId: postId, userId: user.id, commodityId }))?.amount ?? 0;
  const messagesTo = (user: User) => source.getRepository('Message').find({ where: { recipientId: user.id }, order: { id: 'ASC' } });
  const end = (id: number) => source.getRepository('TradeDeal').update(id, { endsAt: new Date(now.getTime() - 1000) });

  describe('bidding with prestige', () => {
    it('reserves the first maximum and starts at a price of 1', async () => {
      const id = await auction();

      expect(await auctions.bid(id, lando.id, 10, now)).toEqual({ message: 'Du hast das erste Gebot abgegeben. Dein Maximalgebot liegt bei 10' });

      expect(await prestigeOf(lando)).toBe(90);
      expect(await dealOf(id)).toMatchObject({ auctionUserId: lando.id, auctionAmount: 1 });
      expect(await source.getRepository('PrestigeHistoryEntry').find()).toMatchObject([
        { userId: lando.id, amount: -10, description: '-10 Prestige: Eingebüßt durch Setzen eines Erstgebots bei einer Auktion des Hutten-Kartells' },
      ]);
    });

    it('raises the own maximum by collecting only the difference', async () => {
      const id = await auction();
      await auctions.bid(id, lando.id, 10, now);

      await expect(auctions.bid(id, lando.id, 10, now)).rejects.toThrow('Dein neues Maximalgebot muss über deinem bisherigen Maximalgebot liegen');
      expect(await auctions.bid(id, lando.id, 15, now)).toEqual({ message: 'Dein Maximalgebot wurde auf 15 erhöht' });

      expect(await prestigeOf(lando)).toBe(85);
      expect(await dealOf(id)).toMatchObject({ auctionUserId: lando.id, auctionAmount: 1 });
    });

    it('raises the price without collecting when a foreign bid stays below the maximum', async () => {
      const id = await auction();
      await auctions.bid(id, lando.id, 15, now);

      expect(await auctions.bid(id, han.id, 8, now)).toEqual({ message: 'Dein Maximalgebot hat nicht ausgereicht. Höchstgebot liegt nun bei 9' });
      expect(await prestigeOf(han)).toBe(100);
      expect(await dealOf(id)).toMatchObject({ auctionUserId: lando.id, auctionAmount: 9 });
      expect((await messagesTo(lando)).map((message) => message.body)).toEqual([
        'Ein Spieler hat auf eine Auktion des Hutten-Kartells geboten, aber dein Maximalgebot nicht überschritten. Dein Höchstgebot liegt nun bei 9 Prestige',
      ]);

      // A tie keeps the earlier bidder.
      await auctions.bid(id, han.id, 15, now);
      expect(await dealOf(id)).toMatchObject({ auctionUserId: lando.id, auctionAmount: 15 });
      await expect(auctions.bid(id, han.id, 15, now)).rejects.toThrow('Zu geringe Anzahl ausgewählt');
    });

    it('lets a higher maximum take over and refunds the outbid maximum in full', async () => {
      const id = await auction();
      await auctions.bid(id, lando.id, 15, now);

      expect(await auctions.bid(id, han.id, 20, now)).toEqual({ message: 'Gebot wurde auf 16 erhöht. Dein Maximalgebot liegt bei 20. Du bist nun Meistbietender!' });

      expect(await prestigeOf(lando)).toBe(100);
      expect(await prestigeOf(han)).toBe(80);
      expect(await dealOf(id)).toMatchObject({ auctionUserId: han.id, auctionAmount: 16 });
      expect(await source.getRepository('PrestigeHistoryEntry').find({ where: { userId: lando.id }, order: { id: 'ASC' } })).toMatchObject([
        { amount: -15 },
        { amount: 15, description: '15 Prestige: Du wurdest bei einer Auktion des Hutten-Kartells überboten und hast dein Prestige zurück erhalten' },
      ]);
      expect((await messagesTo(lando)).map((message) => message.body)).toEqual([
        'Du wurdest bei einer Auktion des Hutten-Kartells von Han überboten und hast 15 Prestige zurück bekommen. Das aktuelle Gebot liegt bei: 16 Prestige',
      ]);
    });

    it('rejects bids without enough prestige, after the end, at or below the price and for other factions', async () => {
      const id = await auction();
      await expect(auctions.bid(id, lando.id, 101, now)).rejects.toThrow('Du hast nicht genügend Prestige, benötigt: 1');
      await auctions.bid(id, lando.id, 10, now);
      await auctions.bid(id, han.id, 5, now);
      await expect(auctions.bid(id, leia.id, 6, now)).rejects.toThrow('Zu geringe Anzahl ausgewählt');

      const imperial = await auction({ factionId: await factionId(source, Faction.GALACTIC_EMPIRE) });
      await expect(auctions.bid(imperial, lando.id, 5, now)).rejects.toThrow('Das Angebot ist nicht mehr verfügbar');
      const instant = await auction({ auction: false });
      await expect(auctions.bid(instant, lando.id, 5, now)).rejects.toThrow('Das Angebot ist nicht mehr verfügbar');
      await end(id);
      await expect(auctions.bid(id, leia.id, 50, now)).rejects.toThrow('Die Auktion ist bereits beendet');
    });

    it('stays consistent when several players bid at once', async () => {
      const id = await auction();
      const bidders = [lando, han, leia, await rebel('Chewie', 100), await rebel('Wedge', 100)];

      await Promise.allSettled(bidders.map((user, index) => auctions.bid(id, user.id, 10 + index * 7, now)));

      const deal = await dealOf(id);
      expect(deal.auctionUserId).toBe(bidders[4].id);
      const prestige = await Promise.all(bidders.map(prestigeOf));
      // Only the leader's maximum (38) is reserved; every other stake is back.
      expect(prestige.reduce((sum, value) => sum + value, 0)).toBe(500 - 38);
      expect(await prestigeOf(bidders[4])).toBe(62);
    });
  });

  it('bids and refunds in a commodity currency on the Hutt account', async () => {
    const id = await auction({ wantPrestige: null, wantCommodityId: AURODIUM, wantCommodityAmount: 1 });
    await source.getRepository('TradeAccountStorage').save([
      { tradePostId: postId, userId: lando.id, commodityId: AURODIUM, amount: 30 },
      { tradePostId: postId, userId: han.id, commodityId: AURODIUM, amount: 30 },
    ]);

    await auctions.bid(id, lando.id, 12, now);
    await expect(auctions.bid(id, han.id, 31, now)).rejects.toThrow('Nicht genügend Aurodium auf diesem Handelsposten vorhanden');
    await auctions.bid(id, han.id, 20, now);

    expect(await stock(lando, AURODIUM)).toBe(30);
    expect(await stock(han, AURODIUM)).toBe(10);
    expect(await prestigeOf(han)).toBe(100);
  });

  describe('claiming', () => {
    it('delivers the item once to the winner and returns the unused part of the maximum', async () => {
      const id = await auction();
      await auctions.bid(id, lando.id, 30, now);
      await auctions.bid(id, han.id, 12, now);
      await expect(auctions.claim(id, lando.id, now)).rejects.toThrow('Die Auktion läuft noch');
      await end(id);

      expect((await deals.list(lando.id, now)).wonAuctions).toEqual([
        expect.objectContaining({ id, kind: 'COMMODITY', price: 13, refund: 17, currency: null }),
      ]);
      expect(await auctions.claim(id, lando.id, now)).toEqual({ message: 'Dir wurden 17 Prestige gutgeschrieben. Du hast 500 Doonium erhalten' });

      expect(await prestigeOf(lando)).toBe(87);
      expect(await stock(lando, DOONIUM)).toBe(500);
      expect((await dealOf(id)).takenAt).not.toBeNull();
      await expect(auctions.claim(id, lando.id, now)).rejects.toThrow('Der Gewinn wurde bereits abgeholt');
      await expect(auctions.claim(id, han.id, now)).rejects.toThrow('Du hast diese Auktion nicht gewonnen');
      expect((await deals.list(lando.id, now)).wonAuctions).toEqual([]);
    });

    it('builds a won ship at the Hutt post', async () => {
      const shipClassId = (await source.getRepository('ShipClassDef').save({ key: 'AUKTION', name: 'Auktionsschiff', category: 'SHIP', role: 'FREIGHTER' })).id;
      const buildplanId = (await source.getRepository('AdminShipBuildplan').save({ name: 'Auktionsplan', shipClassId, moduleSelections: [] })).id;
      const id = await auction({ giveCommodityId: null, giveCommodityAmount: null, buildplanId, ship: true });
      await auctions.bid(id, lando.id, 5, now);
      await end(id);

      expect(await auctions.claim(id, lando.id, now)).toEqual({ message: 'Dir wurden 4 Prestige gutgeschrieben. Du hast dein Schiff erhalten' });
      expect(ships).toEqual([expect.objectContaining({ userId: lando.id, buildplanId, locationId })]);
    });

    it('never delivers twice to concurrent claims', async () => {
      const id = await auction();
      await auctions.bid(id, lando.id, 3, now);
      await end(id);

      const results = await Promise.allSettled([1, 2, 3].map(() => auctions.claim(id, lando.id, now)));

      expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
      expect(await stock(lando, DOONIUM)).toBe(500);
    });
  });

  it('lists running auctions with price, own maximum and end', async () => {
    const id = await auction();
    await auctions.bid(id, lando.id, 25, now);

    expect((await deals.list(lando.id, now)).auctions).toEqual([
      expect.objectContaining({ id, kind: 'COMMODITY', currentAmount: 1, isHighestBidder: true, ownMaxAmount: 25, currency: null }),
    ]);
    expect((await deals.list(han.id, now)).auctions).toEqual([
      expect.objectContaining({ id, currentAmount: 1, isHighestBidder: false, ownMaxAmount: null }),
    ]);
    expect((await deals.list(lando.id, now)).deals).toEqual([]);
  });

  it('leaves an auction without a bid when its leader deletes the account', async () => {
    const id = await auction();
    await auctions.bid(id, han.id, 10, now);
    await auctions.bid(id, lando.id, 20, now);
    const deletions = new PlayerDeletionService(source);
    new TradeDeletionHandler(deletions).onModuleInit();

    await deletions.delete(lando.id);

    expect(await dealOf(id)).toMatchObject({ auctionUserId: null, auctionAmount: null });
    expect(await source.getRepository('TradeAuctionBid').countBy({ dealId: id })).toBe(1);
    expect(await auctions.bid(id, leia.id, 4, now)).toEqual({ message: 'Du hast das erste Gebot abgegeben. Dein Maximalgebot liegt bei 4' });
  });
});
