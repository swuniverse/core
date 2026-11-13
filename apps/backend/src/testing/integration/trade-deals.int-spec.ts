import { DataSource, type EntityManager } from 'typeorm';
import { Faction } from '@swuniverse/shared';
import type { User } from '../../modules/auth/user.entity';
import { NpcKey } from '../../modules/auth/npc-account.service';
import { MessagingService } from '../../modules/messaging/messaging.service';
import { PrestigeService } from '../../modules/prestige/prestige.service';
import { ShipbuildingCoreService } from '../../modules/spacecraft/shipbuilding-core.service';
import { TradeDealFulfillmentAdapter } from '../../modules/spacecraft/trade-deal-fulfillment.adapter';
import { TradeDealAdminService } from '../../modules/trade/trade-deal-admin.service';
import { TradeDealNotificationService } from '../../modules/trade/trade-deal-notification.service';
import { TradeDealService } from '../../modules/trade/trade-deal.service';
import { TradeStorageService } from '../../modules/trade/trade-storage.service';
import { connectIntegrationDatabase, createUser, factionId, resetDatabase } from './database';

const AURODIUM = 50;
const DOONIUM = 2;
const HOUR_MS = 60 * 60 * 1000;
const gameData = {
  getCommodity: (id: number) => ({ id, name: id === AURODIUM ? 'Aurodium' : id === DOONIUM ? 'Doonium' : `Ware ${id}` }),
  getFabricationItemByOutputCommodity: () => ({ moduleType: 'HULL' }),
};

/** tmw-T8a: Hutt Cartel instant deals. */
describe('Hutt Cartel deals (PostgreSQL)', () => {
  let source: DataSource;
  beforeAll(async () => { source = await connectIntegrationDatabase(); });
  beforeEach(async () => resetDatabase(source));
  afterAll(async () => source?.destroy());

  let rebels: number;
  let empire: number;
  let player: User;
  let postId: number;
  let locationId: number;
  let shipClassId: number;
  let buildplanId: number;
  let deals: TradeDealService;
  let now: Date;

  beforeEach(async () => {
    now = new Date();
    rebels = await factionId(source, Faction.REBEL_ALLIANCE);
    empire = await factionId(source, Faction.GALACTIC_EMPIRE);
    const hutts = await createUser(source, { isNpc: true, npcKey: NpcKey.HUTT_CARTEL });
    player = await rebel('Lando', 100);
    const layer = await source.getRepository('Layer').save({ name: 'Handel', width: 1, height: 1 });
    const fieldType = await source.getRepository('GalaxyFieldType').findOneByOrFail({});
    const field = await source.getRepository('GalaxyField').save({ layerId: layer.id, cx: 1, cy: 1, fieldTypeId: fieldType.id });
    locationId = (await source.getRepository('SpaceLocation').findOneByOrFail({ galaxyFieldId: field.id })).id;
    postId = (await source.getRepository('TradePost').save({ name: 'Hutten-Handelsposten', networkId: 3, ownerId: hutts.id, locationId, storageLimit: 1000 })).id;
    await license(player);
    shipClassId = (await source.getRepository('ShipClassDef').save({ key: 'HUTT_FREIGHTER', name: 'Hutten-Frachter', category: 'SHIP', role: 'FREIGHTER' })).id;
    buildplanId = (await source.getRepository('AdminShipBuildplan').save({ name: 'Kartellfrachter', shipClassId, moduleSelections: [{ slotId: 'hull', commodityId: 901 }] })).id;
    deals = service();
  });

  function service(spacecraft = shipFactory()) {
    const instance = new TradeDealService(
      source,
      new TradeStorageService(source),
      new PrestigeService(source.getRepository('PrestigeHistoryEntry') as never),
      gameData as never,
    );
    new TradeDealFulfillmentAdapter(instance, spacecraft as never, new ShipbuildingCoreService({} as never, {} as never, {} as never, {} as never, {} as never), gameData as never).onModuleInit();
    return instance;
  }

  /** Stands in for `SpacecraftService.createShipInManager`, which the admin spawn tests cover. */
  function shipFactory() {
    return {
      createShipInManager: async (manager: EntityManager, input: { user: User; location: { id: number }; name: string; shipClass: { id: number } }) => {
        const ship = await manager.getRepository('Spacecraft').save({
          name: input.name, userId: input.user.id, shipClassId: input.shipClass.id, locationId: input.location.id,
          energyMax: 100, energy: 100, reactorFuelMax: 40, reactorFuel: 40, warpdriveMax: 20, warpdrive: 20,
        });
        return { ship, modules: [] };
      },
    };
  }

  const rebel = (username: string, prestige = 0) =>
    createUser(source, { username, faction: Faction.REBEL_ALLIANCE, factionId: rebels, prestige });

  const license = (user: User, expiresAt = new Date(Date.now() + 24 * HOUR_MS)) =>
    source.getRepository('TradeLicense').save({ tradePostId: postId, userId: user.id, startsAt: new Date(Date.now() - HOUR_MS), expiresAt, warningSentAt: null });

  const account = (user: User, commodityId: number, amount: number) =>
    source.getRepository('TradeAccountStorage').save({ tradePostId: postId, userId: user.id, commodityId, amount });

  const stock = async (user: User, commodityId: number) =>
    (await source.getRepository('TradeAccountStorage').findOneBy({ tradePostId: postId, userId: user.id, commodityId }))?.amount ?? 0;

  async function deal(values: Record<string, unknown>) {
    return (await source.getRepository('TradeDeal').save({
      giveCommodityId: DOONIUM, giveCommodityAmount: 10, wantCommodityId: AURODIUM, wantCommodityAmount: 1,
      amount: null, startsAt: new Date(now.getTime() - HOUR_MS), endsAt: new Date(now.getTime() + HOUR_MS),
      ...values,
    })).id as number;
  }

  describe('visibility', () => {
    it('lists only started, unexpired instant deals of the own faction for licensed players', async () => {
      const visible = await deal({});
      const imperial = await deal({ factionId: empire });
      const ownFaction = await deal({ factionId: rebels });
      await deal({ startsAt: new Date(now.getTime() + HOUR_MS), endsAt: new Date(now.getTime() + 2 * HOUR_MS) });
      await deal({ startsAt: new Date(now.getTime() - 2 * HOUR_MS), endsAt: new Date(now.getTime() - HOUR_MS) });
      await deal({ auction: true });

      const result = await deals.list(player.id, now);

      expect(result).toMatchObject({ hasLicense: true, notice: null, tradePostId: postId, prestige: 100 });
      expect(result.deals.map((entry) => entry.id)).toEqual([visible, ownFaction]);
      expect(result.deals.map((entry) => entry.id)).not.toContain(imperial);
      expect(result.deals[0]).toMatchObject({
        kind: 'COMMODITY', give: { commodityName: 'Doonium', amount: 10 }, want: { commodityName: 'Aurodium', amount: 1 },
      });
    });

    it('requires a valid license at the Hutt post', async () => {
      await deal({});
      const unlicensed = await rebel('Han');
      const expired = await rebel('Chewie');
      await license(expired, new Date(now.getTime() - 1000));

      for (const user of [unlicensed, expired]) {
        expect(await deals.list(user.id, now)).toMatchObject({ hasLicense: false, notice: 'Handelslizenz beim Hutten-Kartell erforderlich', deals: [] });
      }
      const id = await deal({});
      await expect(deals.take(id, unlicensed.id, 1, now)).rejects.toThrow('Handelslizenz beim Hutten-Kartell erforderlich');
    });
  });

  describe('taking a commodity deal', () => {
    it('pays from the Hutt account, credits the goods and counts the remaining amount down', async () => {
      await account(player, AURODIUM, 5);
      const id = await deal({ amount: 4 });

      const result = await deals.take(id, player.id, 3, now);

      expect(result).toEqual({ message: 'Der Deal wurde 3 mal angenommen', amount: 3 });
      expect(await stock(player, AURODIUM)).toBe(2);
      expect(await stock(player, DOONIUM)).toBe(30);
      expect(await source.getRepository('TradeDeal').findOneByOrFail({ id })).toMatchObject({ amount: 1 });
    });

    it('caps the takes by stock, account space and remaining amount and deletes a sold-out deal', async () => {
      await account(player, AURODIUM, 3);
      const id = await deal({ amount: 2 });

      expect((await deals.take(id, player.id, 10, now)).amount).toBe(2);
      expect(await source.getRepository('TradeDeal').countBy({ id })).toBe(0);
      await expect(deals.take(id, player.id, 1, now)).rejects.toThrow('Das Angebot ist nicht mehr verfügbar');

      await source.getRepository('TradePost').update(postId, { storageLimit: 30 });
      const spaceLimited = await deal({});
      // 1 Aurodium + 20 Doonium stored: 9 free, one take needs 10 - 1 = 9.
      expect((await deals.take(spaceLimited, player.id, 5, now)).amount).toBe(1);
      await account(player, AURODIUM, 5);
      await expect(deals.take(spaceLimited, player.id, 1, now)).rejects.toThrow('Dein Warenkonto auf diesem Handelsposten ist voll');
    });

    it('pays with prestige and logs it', async () => {
      const id = await deal({ wantCommodityId: null, wantCommodityAmount: null, wantPrestige: 30 });

      expect((await deals.take(id, player.id, 5, now)).amount).toBe(3);

      expect(await source.getRepository('User').findOneByOrFail({ id: player.id })).toMatchObject({ prestige: 10 });
      expect(await source.getRepository('PrestigeHistoryEntry').find()).toMatchObject([
        { userId: player.id, amount: -90, description: '-90 Prestige: Eingebüßt beim Deal des Hutten-Kartells' },
      ]);
      expect(await stock(player, DOONIUM)).toBe(30);
      await expect(deals.take(id, player.id, 1, now)).rejects.toThrow('Du hast nicht genügend Prestige');
    });

    it('rejects missing goods, NPCs and invalid amounts without side effects', async () => {
      const id = await deal({ wantCommodityAmount: 2 });
      await account(player, AURODIUM, 1);
      const npc = await createUser(source, { isNpc: true });

      await expect(deals.take(id, player.id, 1, now)).rejects.toThrow('Nicht genügend Aurodium auf diesem Handelsposten vorhanden');
      await expect(deals.take(id, npc.id, 1, now)).rejects.toThrow('NPCs können dieses Angebot nicht annehmen');
      await expect(deals.take(id, player.id, 0, now)).rejects.toThrow('Zu geringe Anzahl ausgewählt');
      expect(await stock(player, AURODIUM)).toBe(1);
      expect(await stock(player, DOONIUM)).toBe(0);
    });

    it('never sells more than the remaining amount to concurrent buyers', async () => {
      const id = await deal({ amount: 3 });
      const buyers = await Promise.all([1, 2, 3, 4, 5].map((index) => rebel(`Käufer ${index}`)));
      for (const buyer of buyers) {
        await license(buyer);
        await account(buyer, AURODIUM, 5);
      }

      const results = await Promise.allSettled(buyers.map((buyer) => deals.take(id, buyer.id, 1, now)));

      expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(3);
      expect(results.filter((result) => result.status === 'rejected').map((result) => String((result as PromiseRejectedResult).reason)))
        .toEqual([expect.stringContaining('nicht mehr verfügbar'), expect.stringContaining('nicht mehr verfügbar')]);
      const doonium = await Promise.all(buyers.map((buyer) => stock(buyer, DOONIUM)));
      expect(doonium.reduce((sum, amount) => sum + amount, 0)).toBe(30);
      expect(await source.getRepository('TradeDeal').countBy({ id })).toBe(0);
    });
  });

  it('builds a ship at the Hutt post once per take, loaded to 25 percent', async () => {
    await account(player, AURODIUM, 100);
    const id = await deal({ giveCommodityId: null, giveCommodityAmount: null, buildplanId, ship: true, wantCommodityAmount: 40 });

    expect((await deals.take(id, player.id, 5, now)).amount).toBe(1);

    expect(await source.getRepository('Spacecraft').find()).toMatchObject([
      { userId: player.id, locationId, shipClassId, name: 'Hutten-Frachter', energy: 25, reactorFuel: 10, warpdrive: 5 },
    ]);
    expect(await stock(player, AURODIUM)).toBe(60);
    expect((await deals.list(player.id, now)).deals[0]).toMatchObject({
      kind: 'SHIP', give: null, buildplan: { id: buildplanId, name: 'Kartellfrachter', shipClassName: 'Hutten-Frachter' },
    });
  });

  it('copies a buildplan to the player once and rolls a duplicate back', async () => {
    await account(player, AURODIUM, 100);
    const id = await deal({ giveCommodityId: null, giveCommodityAmount: null, buildplanId, ship: false, wantCommodityAmount: 10 });

    await deals.take(id, player.id, 1, now);

    expect(await source.getRepository('ColonyShipBuildplan').find()).toMatchObject([
      { userId: player.id, shipClassId, name: 'Kartellfrachter', moduleSelections: [{ slotId: 'hull', commodityId: 901 }], moduleCommodityIds: [901], moduleTypes: ['HULL'] },
    ]);
    await expect(deals.take(id, player.id, 1, now)).rejects.toThrow('Du besitzt bereits einen Bauplan mit dieser Konfiguration');
    expect(await stock(player, AURODIUM)).toBe(90);
  });

  describe('announcements', () => {
    function notifications() {
      const messaging = new MessagingService(
        source.getRepository('Message') as never,
        source.getRepository('User') as never,
        {} as never,
        { emitToUser: () => undefined } as never,
        {} as never,
      );
      return new TradeDealNotificationService(source, messaging);
    }

    it('tells licensed players of the deal faction exactly once about newly started deals', async () => {
      const imperial = await createUser(source, { username: 'Tarkin', faction: Faction.GALACTIC_EMPIRE, factionId: empire });
      await license(imperial);
      const unlicensed = await rebel('Han');
      await deal({ factionId: rebels });
      await deal({ startsAt: new Date(now.getTime() + HOUR_MS), endsAt: new Date(now.getTime() + 2 * HOUR_MS) });

      const service = notifications();
      expect(await service.notifyStarted(now)).toEqual({ deals: 1, recipients: 1 });
      expect(await service.notifyStarted(now)).toEqual({ deals: 0, recipients: 0 });

      const messages = await source.getRepository('Message').find();
      expect(messages).toMatchObject([{ recipientId: player.id, folder: 'TRADE', subject: 'Neue Deals beim Hutten-Kartell' }]);
      expect(messages.map((message) => message.recipientId)).not.toContain(unlicensed.id);

      expect(await service.notifyStarted(new Date(now.getTime() + HOUR_MS + 1000))).toEqual({ deals: 1, recipients: 2 });
      expect(await source.getRepository('Message').count()).toBe(3);
    });

    it('announces a deal only once even when runs overlap', async () => {
      await deal({});
      const service = notifications();

      await Promise.all([service.notifyStarted(now), service.notifyStarted(now), service.notifyStarted(now)]);

      expect(await source.getRepository('Message').countBy({ recipientId: player.id })).toBe(1);
    });
  });

  describe('admin', () => {
    const admin = () => new TradeDealAdminService(source, gameData as never);
    const input = (values: Record<string, unknown> = {}) => ({
      amount: 5, giveCommodityId: DOONIUM, giveCommodityAmount: 10, buildplanId: null, ship: false,
      wantCommodityId: AURODIUM, wantCommodityAmount: 1, wantPrestige: null, factionId: null,
      startsAt: new Date(now.getTime() - HOUR_MS).toISOString(), endsAt: new Date(now.getTime() + HOUR_MS).toISOString(),
      ...values,
    });

    it('creates, edits and ends deals', async () => {
      const created = await admin().create(input());
      await source.getRepository('TradeDeal').update(created.id, { notifiedAt: now });

      const sameStart = await admin().update(created.id, input({ amount: 7 }));
      expect(sameStart).toMatchObject({ amount: 7, notifiedAt: now.toISOString() });
      const moved = await admin().update(created.id, input({ startsAt: new Date(now.getTime() + HOUR_MS).toISOString(), endsAt: new Date(now.getTime() + 2 * HOUR_MS).toISOString() }));
      expect(moved.notifiedAt).toBeNull();

      const ended = await admin().end(created.id, now);
      expect(new Date(ended.endsAt).getTime()).toBe(now.getTime());
      expect((await deals.list(player.id, now)).deals).toEqual([]);
      expect(await admin().list()).toHaveLength(1);
    });

    it.each([
      [{ buildplanId: 1 }, 'Genau eine Ware oder einen Bauplan anbieten'],
      [{ giveCommodityId: null, giveCommodityAmount: null }, 'Genau eine Ware oder einen Bauplan anbieten'],
      [{ giveCommodityAmount: 0 }, 'Angebotene Ware und Menge müssen gültig sein'],
      [{ wantPrestige: 5 }, 'Genau eine Ware oder Prestige als Preis verlangen'],
      [{ wantCommodityId: null, wantCommodityAmount: null, wantPrestige: -1 }, 'Prestigepreis muss positiv sein'],
      [{ amount: 0 }, 'Anzahl muss leer oder positiv sein'],
      [{ factionId: 999999 }, 'Fraktion nicht gefunden'],
      [{ startsAt: '2026-11-02T00:00:00.000Z', endsAt: '2026-11-01T00:00:00.000Z' }, 'Das Ende muss nach dem Start liegen'],
    ])('rejects invalid input %#', async (values, message) => {
      await expect(admin().create(input(values))).rejects.toThrow(message);
    });

    it('rejects an unknown buildplan', async () => {
      await expect(admin().create(input({ giveCommodityId: null, giveCommodityAmount: null, buildplanId: buildplanId + 1000, ship: true })))
        .rejects.toThrow('Bauplan nicht gefunden');
    });
  });
});
