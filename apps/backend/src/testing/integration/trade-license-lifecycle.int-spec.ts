import { DataSource } from 'typeorm';
import { MessagingService } from '../../modules/messaging/messaging.service';
import { TradeLicenseMaintenanceService } from '../../modules/trade/trade-license-maintenance.service';
import { TradeLicensePurchaseService } from '../../modules/trade/trade-license-purchase.service';
import { TradeLicenseService } from '../../modules/trade/trade-license.service';
import { TradeAgreementPolicy } from '../../modules/trade/trade-agreement.policy';
import { TradePostPresencePolicy } from '../../modules/trade/trade-post-presence.policy';
import { connectIntegrationDatabase, createUser, resetDatabase } from './database';

const COMMODITY = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

describe('trade license renewal, expiry and queries (PostgreSQL)', () => {
  let source: DataSource;
  beforeAll(async () => { source = await connectIntegrationDatabase(); });
  beforeEach(async () => resetDatabase(source));
  afterAll(async () => source?.destroy());

  let buyerId: number;
  let ownerId: number;
  let posts: { licensed: number; sameNetwork: number; otherNetwork: number };
  let purchases: TradeLicensePurchaseService;
  let maintenance: TradeLicenseMaintenanceService;
  let queries: TradeLicenseService;

  beforeEach(async () => {
    buyerId = (await createUser(source)).id;
    ownerId = (await createUser(source)).id;
    const messaging = new MessagingService(
      source.getRepository('Message') as never,
      source.getRepository('User') as never,
      {} as never,
      { emitToUser: () => undefined } as never,
      {} as never,
    );
    const gameData = { getCommodity: (id: number) => (id === COMMODITY ? { name: 'Aurodium' } : undefined) };
    purchases = new TradeLicensePurchaseService(source, new TradePostPresencePolicy(), messaging, new TradeAgreementPolicy({ resolve: async () => ({ mayTradeFavorably: false }) } as never));
    maintenance = new TradeLicenseMaintenanceService(source, messaging, gameData as never);
    queries = new TradeLicenseService(
      source.getRepository('TradePost') as never,
      source.getRepository('TradeLicenseCondition') as never,
      gameData as never,
      source.getRepository('TradeLicense') as never,
    );

    const layer = await source.getRepository('Layer').save({ name: 'Handel', width: 3, height: 1 });
    const fieldType = await source.getRepository('GalaxyFieldType').findOneByOrFail({});
    const locations: number[] = [];
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
  });

  function license(userId: number, expiresAt: Date, values: Record<string, unknown> = {}) {
    return source.getRepository('TradeLicense').save({
      tradePostId: posts.licensed,
      userId,
      startsAt: new Date(expiresAt.getTime() - 30 * DAY_MS),
      expiresAt,
      warningSentAt: null,
      ...values,
    });
  }

  function account(tradePostId: number, userId: number, amount: number) {
    return source.getRepository('TradeAccountStorage').save({ tradePostId, userId, commodityId: COMMODITY, amount });
  }

  const stock = async (tradePostId: number, userId: number) =>
    (await source.getRepository('TradeAccountStorage').findOneBy({ tradePostId, userId, commodityId: COMMODITY }))?.amount ?? 0;

  describe('renewal', () => {
    it('extends an early renewal from the current expiry without losing time', async () => {
      const expiresAt = new Date(Date.now() + 10 * DAY_MS);
      const existing = await license(buyerId, expiresAt, { warningSentAt: new Date() });
      await account(posts.sameNetwork, buyerId, 15);

      const result = await purchases.renew(posts.licensed, buyerId, { accountPostId: posts.sameNetwork });

      expect(result.message).toBe('Handelslizenz wurde verlängert');
      const renewed = await source.getRepository('TradeLicense').findOneByOrFail({ id: existing.id });
      expect(renewed.expiresAt.getTime()).toBe(expiresAt.getTime() + 30 * DAY_MS);
      expect(renewed.warningSentAt).toBeNull();
      expect(await stock(posts.sameNetwork, buyerId)).toBe(5);
      expect(await stock(posts.licensed, ownerId)).toBe(10);
      expect(await source.getRepository('Message').find()).toMatchObject([
        { recipientId: ownerId, folder: 'TRADE', subject: 'Handelslizenz verlängert' },
      ]);
    });

    it('extends a late renewal from now', async () => {
      const existing = await license(buyerId, new Date(Date.now() - 2 * DAY_MS));
      await account(posts.licensed, buyerId, 10);
      const before = Date.now();

      await purchases.renew(posts.licensed, buyerId, { accountPostId: posts.licensed });

      const renewed = await source.getRepository('TradeLicense').findOneByOrFail({ id: existing.id });
      expect(renewed.expiresAt.getTime()).toBeGreaterThanOrEqual(before + 30 * DAY_MS);
      expect(renewed.expiresAt.getTime()).toBeLessThan(Date.now() + 30 * DAY_MS + 1000);
    });

    it('charges a changed price only on the next renewal and keeps the stored expiry until then', async () => {
      const expiresAt = new Date(Date.now() + 20 * DAY_MS);
      const existing = await license(buyerId, expiresAt);
      await account(posts.sameNetwork, buyerId, 25);

      await source.getRepository('TradeLicenseCondition').update({ tradePostId: posts.licensed }, { amount: 20, durationDays: 10 });
      expect((await source.getRepository('TradeLicense').findOneByOrFail({ id: existing.id })).expiresAt.getTime()).toBe(expiresAt.getTime());

      await purchases.renew(posts.licensed, buyerId, { accountPostId: posts.sameNetwork });

      expect((await source.getRepository('TradeLicense').findOneByOrFail({ id: existing.id })).expiresAt.getTime())
        .toBe(expiresAt.getTime() + 10 * DAY_MS);
      expect(await stock(posts.sameNetwork, buyerId)).toBe(5);
      expect(await stock(posts.licensed, ownerId)).toBe(20);
    });

    it('rejects renewals without a license, from foreign or remote accounts and without enough stock', async () => {
      await account(posts.sameNetwork, buyerId, 50);
      await expect(purchases.renew(posts.licensed, buyerId, { accountPostId: posts.sameNetwork }))
        .rejects.toThrow('Du besitzt keine Lizenz für diesen Handelsposten');

      const expiresAt = new Date(Date.now() + 5 * DAY_MS);
      const existing = await license(buyerId, expiresAt);
      await account(posts.otherNetwork, buyerId, 50);
      await account(posts.licensed, ownerId, 0);
      await source.getRepository('TradeAccountStorage').update({ tradePostId: posts.sameNetwork, userId: buyerId }, { amount: 9 });
      const foreign = await createUser(source);
      await account(posts.sameNetwork, foreign.id, 50);

      await expect(purchases.renew(posts.licensed, buyerId, { accountPostId: posts.otherNetwork }))
        .rejects.toThrow('Das Warenkonto liegt in einem anderen Handelsnetz');
      await expect(purchases.renew(posts.licensed, buyerId, { accountPostId: posts.sameNetwork }))
        .rejects.toThrow('Nicht genügend Waren auf dem Handelskonto');
      await expect(purchases.renew(posts.licensed, foreign.id, { accountPostId: posts.sameNetwork }))
        .rejects.toThrow('Du besitzt keine Lizenz für diesen Handelsposten');
      await expect(purchases.renew(posts.licensed, buyerId, { accountPostId: 0 }))
        .rejects.toThrow('Warenkonto muss eine gültige ID haben');

      expect((await source.getRepository('TradeLicense').findOneByOrFail({ id: existing.id })).expiresAt.getTime()).toBe(expiresAt.getTime());
      expect(await stock(posts.otherNetwork, buyerId)).toBe(50);
      expect(await stock(posts.sameNetwork, foreign.id)).toBe(50);
      expect(await stock(posts.licensed, ownerId)).toBe(0);
      expect(await source.getRepository('Message').count()).toBe(0);
    });
  });

  describe('daily maintenance', () => {
    it('warns once on entering the seven-day window and deletes licenses from their expiry on', async () => {
      const now = new Date('2026-11-12T03:00:00Z');
      const other = await createUser(source);
      const third = await createUser(source);
      const fourth = await createUser(source);
      const soon = await license(buyerId, new Date(now.getTime() + 3 * DAY_MS + 3600_000));
      const atBoundary = await license(other.id, now);
      // Still outside the window on the second run one day later.
      const later = await license(third.id, new Date(now.getTime() + 8 * DAY_MS + 3600_000));
      const warned = await license(fourth.id, new Date(now.getTime() + 2 * DAY_MS), { warningSentAt: new Date(now.getTime() - DAY_MS) });

      expect(await maintenance.run(now)).toBe('1 gewarnt, 1 gelöscht');

      expect(await source.getRepository('TradeLicense').findOneBy({ id: atBoundary.id })).toBeNull();
      expect(await source.getRepository('TradeLicense').findOneByOrFail({ id: soon.id })).toMatchObject({ warningSentAt: now });
      expect(await source.getRepository('TradeLicense').findOneByOrFail({ id: later.id })).toMatchObject({ warningSentAt: null });
      expect(await source.getRepository('TradeLicense').findOneByOrFail({ id: warned.id })).toBeTruthy();
      const messages = await source.getRepository('Message').find({ order: { id: 'ASC' } });
      expect(messages).toMatchObject([
        {
          recipientId: other.id,
          folder: 'SYSTEM',
          body: 'Deine Lizenz am Handelsposten Mos Eisley ist abgelaufen.\nEine neue Lizenz für 30 Tage kostet aktuell 10 Aurodium.',
        },
        {
          recipientId: buyerId,
          body: 'Deine Lizenz am Handelsposten Mos Eisley läuft in weniger als 4 Tagen ab.\nEine neue Lizenz für 30 Tage kostet aktuell 10 Aurodium.',
        },
      ]);

      // The next day: no repeated warning; the warned license is still valid.
      expect(await maintenance.run(new Date(now.getTime() + DAY_MS))).toBe('0 gewarnt, 0 gelöscht');
      expect(await source.getRepository('Message').count()).toBe(2);
    });
  });

  describe('queries', () => {
    it('lists only own licenses that are still valid', async () => {
      const valid = await license(buyerId, new Date(Date.now() + DAY_MS));
      await source.getRepository('TradeLicense').save({
        tradePostId: posts.sameNetwork, userId: buyerId, startsAt: new Date(Date.now() - DAY_MS), expiresAt: new Date(Date.now() - 1),
      });
      await license(ownerId, new Date(Date.now() + DAY_MS));

      expect(await queries.listOwn(buyerId)).toEqual([
        {
          id: valid.id,
          tradePostId: posts.licensed,
          tradePostName: 'Mos Eisley',
          networkId: 1,
          startsAt: valid.startsAt.toISOString(),
          expiresAt: valid.expiresAt.toISOString(),
        },
      ]);
    });

    it('lists issued valid licenses for the post owner only', async () => {
      const valid = await license(buyerId, new Date(Date.now() + DAY_MS));
      const expiredUser = await createUser(source);
      await license(expiredUser.id, new Date(Date.now() - 1));
      const buyer = await source.getRepository('User').findOneByOrFail({ id: buyerId });

      expect(await queries.listIssued(posts.licensed, ownerId)).toEqual([
        {
          id: valid.id,
          userId: buyerId,
          username: buyer.username,
          startsAt: valid.startsAt.toISOString(),
          expiresAt: valid.expiresAt.toISOString(),
        },
      ]);
      await expect(queries.listIssued(posts.licensed, buyerId)).rejects.toThrow('Handelsposten nicht gefunden');
    });
  });
});
