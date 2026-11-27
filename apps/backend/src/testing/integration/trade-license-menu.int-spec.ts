import { DataSource } from 'typeorm';
import { TradeLicenseMenuService } from '../../modules/trade/trade-license-menu.service';
import { TradePostPresencePolicy } from '../../modules/trade/trade-post-presence.policy';
import { connectIntegrationDatabase, createUser, resetDatabase } from './database';

const COMMODITY = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

describe('trade license menu (PostgreSQL)', () => {
  let source: DataSource;
  beforeAll(async () => { source = await connectIntegrationDatabase(); });
  beforeEach(async () => resetDatabase(source));
  afterAll(async () => source?.destroy());

  let buyerId: number;
  let ownerId: number;
  let locations: number[];
  let shipClassId: number;
  let posts: { licensed: number; sameNetwork: number; otherNetwork: number };
  let menus: TradeLicenseMenuService;

  beforeEach(async () => {
    buyerId = (await createUser(source)).id;
    ownerId = (await createUser(source)).id;
    const gameData = {
      getCommodity: (id: number) => (id === COMMODITY ? { name: 'Aurodium' } : undefined),
      getAllCommodities: () => [
        { id: 7, name: 'Tibanna', isTradeable: true },
        { id: COMMODITY, name: 'Aurodium', isTradeable: true },
        { id: 9, name: 'Gefangene', isTradeable: false },
      ],
    };
    menus = new TradeLicenseMenuService(source, new TradePostPresencePolicy(), gameData as never);
    const layer = await source.getRepository('Layer').save({ name: 'Handel', width: 4, height: 1 });
    const fieldType = await source.getRepository('GalaxyFieldType').findOneByOrFail({});
    locations = [];
    for (const cx of [1, 2, 3, 4]) {
      const field = await source.getRepository('GalaxyField').save({ layerId: layer.id, cx, cy: 1, fieldTypeId: fieldType.id });
      locations.push((await source.getRepository('SpaceLocation').findOneByOrFail({ galaxyFieldId: field.id })).id);
    }
    const tradePosts = source.getRepository('TradePost');
    posts = {
      licensed: (await tradePosts.save({ name: 'Mos Eisley', networkId: 1, ownerId, locationId: locations[0] })).id,
      sameNetwork: (await tradePosts.save({ name: 'Anchorhead', networkId: 1, ownerId, locationId: locations[1] })).id,
      otherNetwork: (await tradePosts.save({ name: 'Nar Shaddaa', networkId: 2, ownerId, locationId: locations[2] })).id,
    };
    await source.getRepository('TradeLicenseCondition').save({ tradePostId: posts.licensed, commodityId: COMMODITY, amount: 10, durationDays: 30 });
    shipClassId = (await source.getRepository('ShipClassDef').save({ key: 'TRADER', name: 'Händler', category: 'SHIP', role: 'FREIGHTER' })).id;
  });

  async function ship(name: string, cargo: number, values: Record<string, unknown> = {}) {
    const saved = await source.getRepository('Spacecraft').save({ name, userId: buyerId, shipClassId, locationId: locations[0], runtimeSystems: {}, ...values });
    if (cargo) await source.getRepository('CargoItem').save({ spacecraftId: saved.id, commodityId: COMMODITY, amount: cargo });
    return saved;
  }

  function account(tradePostId: number, userId: number, amount: number) {
    return source.getRepository('TradeAccountStorage').save({ tradePostId, userId, commodityId: COMMODITY, amount });
  }

  it('offers only own present ships and own same-network accounts that cover the price', async () => {
    const initiator = await ship('Falke', 0);
    const payer = await ship('Barke', 12);
    await ship('Arm', 9);
    await ship('Unterwegs', 50, { runtimeSystems: { WARPDRIVE: { active: true } } });
    await ship('Fern', 50, { locationId: locations[1] });
    await ship('Fremd', 50, { userId: ownerId });
    await account(posts.sameNetwork, buyerId, 10);
    await account(posts.licensed, buyerId, 3);
    await account(posts.otherNetwork, buyerId, 99);
    await account(posts.sameNetwork, ownerId, 99);

    const menu = await menus.getMenu(posts.licensed, buyerId, initiator.id);

    expect(menu).toEqual({
      tradePostId: posts.licensed,
      tradePostName: 'Mos Eisley',
      networkId: 1,
      isOwner: false,
      condition: { commodityId: COMMODITY, commodityName: 'Aurodium', amount: 10, durationDays: 30 },
      license: null,
      renewalExpiresAt: null,
      purchase: { shipId: initiator.id, rejection: null, payShips: [{ id: payer.id, name: 'Barke', amount: 12 }] },
      accounts: [{ tradePostId: posts.sameNetwork, tradePostName: 'Anchorhead', amount: 10 }],
      tradeableCommodities: [],
    });
  });

  it('explains why no purchase is possible without a ship, from a ship under hyperdrive or without sources', async () => {
    const flying = await ship('Unterwegs', 50, { runtimeSystems: { WARPDRIVE: { active: true } } });
    const poor = await ship('Arm', 5);

    expect((await menus.getMenu(posts.licensed, buyerId, null)).purchase).toEqual({
      shipId: null,
      rejection: 'Lizenzen werden über das Handelsmenü eines eigenen Schiffs am Posten gekauft',
      payShips: [],
    });
    expect((await menus.getMenu(posts.licensed, buyerId, flying.id)).purchase.rejection).toBe('Der Hyperantrieb ist aktiv');
    expect((await menus.getMenu(posts.licensed, buyerId, poor.id)).purchase.rejection).toBe('Keine Zahlquelle mit ausreichendem Bestand');
    expect((await menus.getMenu(posts.sameNetwork, buyerId, poor.id)).purchase.rejection).toBe('Dieser Handelsposten vergibt keine Lizenzen');
  });

  it('shows a valid license with the resulting renewal expiry instead of a purchase', async () => {
    const initiator = await ship('Falke', 50);
    const expiresAt = new Date(Date.now() + 5 * DAY_MS);
    const license = await source.getRepository('TradeLicense').save({
      tradePostId: posts.licensed, userId: buyerId, startsAt: new Date(Date.now() - DAY_MS), expiresAt,
    });

    const menu = await menus.getMenu(posts.licensed, buyerId, initiator.id);

    expect(menu.license).toEqual({ id: license.id, startsAt: license.startsAt.toISOString(), expiresAt: expiresAt.toISOString() });
    expect(menu.renewalExpiresAt).toBe(new Date(expiresAt.getTime() + 30 * DAY_MS).toISOString());
    expect(menu.purchase).toEqual({
      shipId: initiator.id,
      rejection: 'Du besitzt bereits eine gültige Lizenz für diesen Handelsposten',
      payShips: [],
    });
  });

  it('lists tradeable price commodities for the post owner only', async () => {
    const menu = await menus.getMenu(posts.licensed, ownerId, null);

    expect(menu.isOwner).toBe(true);
    expect(menu.tradeableCommodities).toEqual([
      { id: COMMODITY, name: 'Aurodium' },
      { id: 7, name: 'Tibanna' },
    ]);
  });

  it('reports the trade post at a ship and why the ship cannot use it', async () => {
    const present = await ship('Falke', 0);
    const cloaked = await ship('Schatten', 0, { runtimeSystems: { CLOAK: { active: true } } });
    const elsewhere = await ship('Leer', 0, { locationId: locations[3] });
    const foreign = await ship('Fremd', 0, { userId: ownerId });

    expect(await menus.getPostAtSpacecraft(present.id, buyerId)).toEqual({ tradePostId: posts.licensed, tradePostName: 'Mos Eisley', reason: null });
    expect(await menus.getPostAtSpacecraft(cloaked.id, buyerId)).toMatchObject({ reason: 'Die Tarnung ist aktiv' });
    expect(await menus.getPostAtSpacecraft(elsewhere.id, buyerId)).toBeNull();
    await expect(menus.getPostAtSpacecraft(foreign.id, buyerId)).rejects.toThrow('Schiff nicht gefunden');
  });
});
