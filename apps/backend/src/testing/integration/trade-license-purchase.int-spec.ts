import { DataSource } from 'typeorm';
import { MessagingService } from '../../modules/messaging/messaging.service';
import { TradeLicensePurchaseService } from '../../modules/trade/trade-license-purchase.service';
import { TradePostPresencePolicy } from '../../modules/trade/trade-post-presence.policy';
import { connectIntegrationDatabase, createUser, resetDatabase } from './database';

const COMMODITY = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

describe('trade license purchase (PostgreSQL)', () => {
  let source: DataSource;
  beforeAll(async () => { source = await connectIntegrationDatabase(); });
  beforeEach(async () => resetDatabase(source));
  afterAll(async () => source?.destroy());

  let buyerId: number;
  let ownerId: number;
  let emitted: Array<[number, string]>;
  let service: TradeLicensePurchaseService;
  let locations: number[];
  let shipClassId: number;
  let posts: { licensed: number; sameNetwork: number; otherNetwork: number };

  beforeEach(async () => {
    buyerId = (await createUser(source)).id;
    ownerId = (await createUser(source)).id;
    emitted = [];
    const messaging = new MessagingService(
      source.getRepository('Message') as never,
      source.getRepository('User') as never,
      {} as never,
      { emitToUser: (userId: number, event: string) => emitted.push([userId, event]) } as never,
      {} as never,
    );
    service = new TradeLicensePurchaseService(source, new TradePostPresencePolicy(), messaging);

    const layer = await source.getRepository('Layer').save({ name: 'Handel', width: 3, height: 1 });
    const fieldType = await source.getRepository('GalaxyFieldType').findOneByOrFail({});
    locations = [];
    for (const cx of [1, 2, 3]) {
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

  async function ship(values: Record<string, unknown> = {}) {
    return source.getRepository('Spacecraft').save({ name: 'Frachter', userId: buyerId, shipClassId, locationId: locations[0], runtimeSystems: {}, ...values });
  }

  async function cargo(spacecraftId: number, amount: number) {
    return source.getRepository('CargoItem').save({ spacecraftId, commodityId: COMMODITY, amount });
  }

  async function account(tradePostId: number, userId: number, amount: number) {
    return source.getRepository('TradeAccountStorage').save({ tradePostId, userId, commodityId: COMMODITY, amount });
  }

  const ownerCredit = async () =>
    (await source.getRepository('TradeAccountStorage').findOneBy({ tradePostId: posts.licensed, userId: ownerId, commodityId: COMMODITY }))?.amount ?? 0;

  async function unchanged() {
    expect(await source.getRepository('TradeLicense').count()).toBe(0);
    expect(await ownerCredit()).toBe(0);
    expect(await source.getRepository('Message').count()).toBe(0);
    expect(emitted).toEqual([]);
  }

  it('pays from the cargo of an own ship at the post and credits the owner atomically', async () => {
    const initiator = await ship();
    const payer = await ship({ name: 'Zahlschiff' });
    await cargo(payer.id, 25);
    const before = Date.now();

    const result = await service.purchase(posts.licensed, buyerId, { method: 'ship', shipId: initiator.id, payShipId: payer.id });

    expect(result.message).toBe('Handelslizenz wurde erteilt');
    const license = await source.getRepository('TradeLicense').findOneByOrFail({ tradePostId: posts.licensed, userId: buyerId });
    expect(license.expiresAt.getTime() - license.startsAt.getTime()).toBe(30 * DAY_MS);
    expect(license.startsAt.getTime()).toBeGreaterThanOrEqual(before - 1000);
    expect(await source.getRepository('CargoItem').findOneByOrFail({ spacecraftId: payer.id })).toMatchObject({ amount: 15 });
    expect(await ownerCredit()).toBe(10);
    expect(await source.getRepository('Message').find()).toMatchObject([
      { recipientId: ownerId, folder: 'TRADE', body: expect.stringContaining('eine Handelslizenz') },
    ]);
    expect(emitted).toEqual([[ownerId, expect.any(String)]]);
  });

  it('lets the initiating ship pay itself and removes an emptied cargo row', async () => {
    const initiator = await ship();
    await cargo(initiator.id, 10);

    await service.purchase(posts.licensed, buyerId, { method: 'ship', shipId: initiator.id, payShipId: initiator.id });

    expect(await source.getRepository('CargoItem').countBy({ spacecraftId: initiator.id })).toBe(0);
    expect(await ownerCredit()).toBe(10);
  });

  it('pays from an own trade account in the same network', async () => {
    const initiator = await ship();
    await account(posts.sameNetwork, buyerId, 12);

    await service.purchase(posts.licensed, buyerId, { method: 'account', shipId: initiator.id, accountPostId: posts.sameNetwork });

    expect(await source.getRepository('TradeAccountStorage').findOneByOrFail({ tradePostId: posts.sameNetwork, userId: buyerId })).toMatchObject({ amount: 2 });
    expect(await ownerCredit()).toBe(10);
    expect(await source.getRepository('TradeLicense').countBy({ userId: buyerId })).toBe(1);
  });

  it('rejects an initiating ship or paying ship away from the post or under hyperdrive', async () => {
    const away = await ship({ locationId: locations[1] });
    const warping = await ship({ runtimeSystems: { WARPDRIVE: { active: true } } });
    const present = await ship();
    const remotePayer = await ship({ locationId: locations[1] });
    await cargo(present.id, 50);
    await cargo(remotePayer.id, 50);

    for (const shipId of [away.id, warping.id]) {
      await expect(service.purchase(posts.licensed, buyerId, { method: 'ship', shipId, payShipId: present.id }))
        .rejects.toThrow('Das Schiff befindet sich nicht am Handelsposten');
    }
    await expect(service.purchase(posts.licensed, buyerId, { method: 'ship', shipId: present.id, payShipId: remotePayer.id }))
      .rejects.toThrow('Das Zahlschiff befindet sich nicht am Handelsposten');
    await expect(service.purchase(posts.licensed, buyerId, { method: 'account', shipId: away.id, accountPostId: posts.sameNetwork }))
      .rejects.toThrow('Das Schiff befindet sich nicht am Handelsposten');
    await unchanged();
  });

  it('rejects foreign ships and foreign accounts as payment sources', async () => {
    const initiator = await ship();
    const foreign = await ship({ userId: ownerId });
    await cargo(foreign.id, 50);
    await account(posts.sameNetwork, ownerId, 50);

    await expect(service.purchase(posts.licensed, buyerId, { method: 'ship', shipId: initiator.id, payShipId: foreign.id }))
      .rejects.toThrow('Das Zahlschiff gehört nicht dir');
    await expect(service.purchase(posts.licensed, buyerId, { method: 'ship', shipId: foreign.id, payShipId: foreign.id }))
      .rejects.toThrow('Das Schiff befindet sich nicht am Handelsposten');
    await expect(service.purchase(posts.licensed, buyerId, { method: 'account', shipId: initiator.id, accountPostId: posts.sameNetwork }))
      .rejects.toThrow('Nicht genügend Waren auf dem Handelskonto');
    expect(await source.getRepository('CargoItem').findOneByOrFail({ spacecraftId: foreign.id })).toMatchObject({ amount: 50 });
    await unchanged();
  });

  it('rejects an account in another network, insufficient stock and unknown payment methods', async () => {
    const initiator = await ship();
    await account(posts.otherNetwork, buyerId, 50);
    await account(posts.sameNetwork, buyerId, 9);
    await cargo(initiator.id, 9);

    await expect(service.purchase(posts.licensed, buyerId, { method: 'account', shipId: initiator.id, accountPostId: posts.otherNetwork }))
      .rejects.toThrow('Das Warenkonto liegt in einem anderen Handelsnetz');
    await expect(service.purchase(posts.licensed, buyerId, { method: 'account', shipId: initiator.id, accountPostId: posts.sameNetwork }))
      .rejects.toThrow('Nicht genügend Waren auf dem Handelskonto');
    await expect(service.purchase(posts.licensed, buyerId, { method: 'ship', shipId: initiator.id, payShipId: initiator.id }))
      .rejects.toThrow('Nicht genügend Waren im Frachtraum');
    await expect(service.purchase(posts.licensed, buyerId, { method: 'credit', shipId: initiator.id } as never))
      .rejects.toThrow('Unbekannte Zahlart');
    expect(await source.getRepository('TradeAccountStorage').findOneByOrFail({ tradePostId: posts.otherNetwork, userId: buyerId })).toMatchObject({ amount: 50 });
    expect(await source.getRepository('CargoItem').findOneByOrFail({ spacecraftId: initiator.id })).toMatchObject({ amount: 9 });
    await unchanged();
  });

  it('charges a repeated purchase only once', async () => {
    const initiator = await ship();
    await cargo(initiator.id, 30);
    const input = { method: 'ship' as const, shipId: initiator.id, payShipId: initiator.id };

    await service.purchase(posts.licensed, buyerId, input);
    await expect(service.purchase(posts.licensed, buyerId, input))
      .rejects.toThrow('Du besitzt bereits eine gültige Lizenz für diesen Handelsposten');

    expect(await source.getRepository('CargoItem').findOneByOrFail({ spacecraftId: initiator.id })).toMatchObject({ amount: 20 });
    expect(await ownerCredit()).toBe(10);
    expect(await source.getRepository('Message').count()).toBe(1);
  });

  it('serializes concurrent purchases into exactly one license and one payment', async () => {
    const first = await ship();
    const second = await ship();
    await cargo(first.id, 10);
    await cargo(second.id, 10);

    const results = await Promise.allSettled([
      service.purchase(posts.licensed, buyerId, { method: 'ship', shipId: first.id, payShipId: first.id }),
      service.purchase(posts.licensed, buyerId, { method: 'ship', shipId: second.id, payShipId: second.id }),
    ]);

    expect(results.map((result) => result.status).sort()).toEqual(['fulfilled', 'rejected']);
    expect(await source.getRepository('TradeLicense').count()).toBe(1);
    expect(await source.getRepository('CargoItem').count()).toBe(1);
    expect(await ownerCredit()).toBe(10);
  });

  it('reissues an expired license that daily cleanup has not removed yet', async () => {
    const initiator = await ship();
    await cargo(initiator.id, 10);
    const expired = await source.getRepository('TradeLicense').save({
      tradePostId: posts.licensed,
      userId: buyerId,
      startsAt: new Date(Date.now() - 40 * DAY_MS),
      expiresAt: new Date(Date.now() - DAY_MS),
      warningSentAt: new Date(Date.now() - 8 * DAY_MS),
    });

    await service.purchase(posts.licensed, buyerId, { method: 'ship', shipId: initiator.id, payShipId: initiator.id });

    const renewed = await source.getRepository('TradeLicense').findOneByOrFail({ id: expired.id });
    expect(renewed.expiresAt.getTime()).toBeGreaterThan(Date.now() + 29 * DAY_MS);
    expect(renewed.warningSentAt).toBeNull();
    expect(await source.getRepository('TradeLicense').count()).toBe(1);
  });

  it('credits an NPC post owner and rejects posts without license conditions', async () => {
    const npc = await createUser(source, { isNpc: true });
    await source.getRepository('TradePost').update(posts.licensed, { ownerId: npc.id });
    const initiator = await ship();
    await cargo(initiator.id, 10);

    await service.purchase(posts.licensed, buyerId, { method: 'ship', shipId: initiator.id, payShipId: initiator.id });

    expect(await source.getRepository('TradeAccountStorage').findOneByOrFail({ tradePostId: posts.licensed, userId: npc.id })).toMatchObject({ amount: 10 });
    expect(await source.getRepository('Message').find()).toMatchObject([{ recipientId: npc.id, folder: 'TRADE' }]);
    await expect(service.purchase(posts.sameNetwork, buyerId, { method: 'ship', shipId: initiator.id, payShipId: initiator.id }))
      .rejects.toThrow('Dieser Handelsposten vergibt keine Lizenzen');
  });
});
