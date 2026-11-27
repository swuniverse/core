import { DataSource } from 'typeorm';
import { AllianceRelationshipType, Faction } from '@swuniverse/shared';
import type { User } from '../../modules/auth/user.entity';
import { AllianceService } from '../../modules/alliance/alliance.service';
import {
  NoPersonalContactStatusPort,
  RelationshipResolverService,
} from '../../modules/alliance/relationship-resolver.service';
import { TypeOrmAllianceStore } from '../../modules/alliance/typeorm-alliance.store';
import { MessagingService } from '../../modules/messaging/messaging.service';
import { TradeLicenseMenuService } from '../../modules/trade/trade-license-menu.service';
import { TradeLicensePurchaseService } from '../../modules/trade/trade-license-purchase.service';
import { TradePostPresencePolicy } from '../../modules/trade/trade-post-presence.policy';
import { connectIntegrationDatabase, createUser, factionId, resetDatabase } from './database';

const COMMODITY = 5;
const DAY_MS = 24 * 60 * 60 * 1000;
const { TRADE_AGREEMENT } = AllianceRelationshipType;

/** tmw-AUD-09: a trade agreement has no trade effect (STU); it only carries the relationship permissions. */
describe('trade agreement licenses (PostgreSQL)', () => {
  let source: DataSource;
  beforeAll(async () => { source = await connectIntegrationDatabase(); });
  beforeEach(async () => resetDatabase(source));
  afterAll(async () => source?.destroy());

  let store: TypeOrmAllianceStore;
  let alliances: AllianceService;
  let buyer: User;
  let owner: User;
  let postId: number;
  let locationId: number;
  let shipClassId: number;
  let resolver: RelationshipResolverService;
  let purchases: TradeLicensePurchaseService;
  let menus: TradeLicenseMenuService;

  beforeEach(async () => {
    const rebels = await factionId(source, Faction.REBEL_ALLIANCE);
    const rebel = (username: string) => createUser(source, { username, faction: Faction.REBEL_ALLIANCE, factionId: rebels });
    buyer = await rebel('Buyer');
    owner = await rebel('Owner');
    store = new TypeOrmAllianceStore(source);
    alliances = new AllianceService(store, { sendSystem: jest.fn().mockResolvedValue(undefined) } as never);
    resolver = new RelationshipResolverService(store, new NoPersonalContactStatusPort());
    wire(resolver);

    const layer = await source.getRepository('Layer').save({ name: 'Handel', width: 1, height: 1 });
    const fieldType = await source.getRepository('GalaxyFieldType').findOneByOrFail({});
    const field = await source.getRepository('GalaxyField').save({ layerId: layer.id, cx: 1, cy: 1, fieldTypeId: fieldType.id });
    locationId = (await source.getRepository('SpaceLocation').findOneByOrFail({ galaxyFieldId: field.id })).id;
    postId = (await source.getRepository('TradePost').save({ name: 'Partnerposten', networkId: 1, ownerId: owner.id, locationId })).id;
    await source.getRepository('TradeLicenseCondition').save({ tradePostId: postId, commodityId: COMMODITY, amount: 10, durationDays: 30 });
    shipClassId = (await source.getRepository('ShipClassDef').save({ key: 'TRADER', name: 'Händler', category: 'SHIP', role: 'FREIGHTER' })).id;
  });

  function wire(relationships: Pick<RelationshipResolverService, 'resolve'>) {
    const messaging = new MessagingService(
      source.getRepository('Message') as never,
      source.getRepository('User') as never,
      {} as never,
      { emitToUser: () => undefined } as never,
      {} as never,
    );
    purchases = new TradeLicensePurchaseService(source, new TradePostPresencePolicy(), messaging);
    menus = new TradeLicenseMenuService(source, new TradePostPresencePolicy(), { getCommodity: () => undefined, getAllCommodities: () => [] } as never);
  }

  async function agree(type = TRADE_AGREEMENT) {
    const { id } = await alliances.proposeSettlerRelationship(buyer.id, {
      recipientPlayerId: owner.id,
      type,
      permissions: { treatAsFriend: false, shareLivePositions: false },
    });
    await alliances.acceptRelationshipProposal(owner.id, id);
  }

  async function shipWithCargo(amount: number) {
    const ship = await source.getRepository('Spacecraft').save({ name: 'Frachter', userId: buyer.id, shipClassId, locationId, runtimeSystems: {} });
    if (amount > 0) await source.getRepository('CargoItem').save({ spacecraftId: ship.id, commodityId: COMMODITY, amount });
    return ship.id as number;
  }

  const cargoOf = async (spacecraftId: number) =>
    (await source.getRepository('CargoItem').findOneBy({ spacecraftId, commodityId: COMMODITY }))?.amount ?? 0;
  const ownerCredit = async () =>
    (await source.getRepository('TradeAccountStorage').findOneBy({ tradePostId: postId, userId: owner.id }))?.amount ?? 0;

  it('charges a partner of an active trade agreement the regular price (STU: no trade effect)', async () => {
    await agree();
    const shipId = await shipWithCargo(10);

    const menu = await menus.getMenu(postId, buyer.id, shipId);
    expect(menu).not.toHaveProperty('freeByAgreement');
    const result = await purchases.purchase(postId, buyer.id, { method: 'ship', shipId, payShipId: shipId });

    expect(result.message).toBe('Handelslizenz wurde erteilt');
    expect(await cargoOf(shipId)).toBe(0);
    expect(await ownerCredit()).toBe(10);
    expect(await source.getRepository('Message').find()).toMatchObject([
      { recipientId: owner.id, folder: 'TRADE', body: 'Buyer hat am Partnerposten eine Handelslizenz gekauft.' },
    ]);
  });

  it('offers no payment-free way: a partner without a payment source is rejected, and method agreement is refused', async () => {
    await agree();
    const shipId = await shipWithCargo(0);

    expect(await menus.getMenu(postId, buyer.id, shipId)).toMatchObject({
      purchase: { rejection: 'Keine Zahlquelle mit ausreichendem Bestand' },
    });
    await expect(purchases.purchase(postId, buyer.id, { method: 'agreement', shipId } as never)).rejects.toThrow('Unbekannte Zahlart');
    expect(await source.getRepository('TradeLicense').count()).toBe(0);
  });

  it('renews at the regular price for an agreement partner and keeps a free-acquired license valid until expiry', async () => {
    await agree();
    const expiresAt = new Date(Date.now() + 5 * DAY_MS);
    await source.getRepository('TradeLicense').save({ tradePostId: postId, userId: buyer.id, startsAt: new Date(Date.now() - DAY_MS), expiresAt, warningSentAt: null });
    expect((await menus.getMenu(postId, buyer.id, null)).license).toBeTruthy();

    await expect(purchases.renew(postId, buyer.id, {})).rejects.toThrow('Warenkonto muss eine gültige ID haben');

    const accountPostId = postId;
    await source.getRepository('TradeAccountStorage').save({ tradePostId: accountPostId, userId: buyer.id, commodityId: COMMODITY, amount: 10 });
    const result = await purchases.renew(postId, buyer.id, { accountPostId });

    expect(result.message).toBe('Handelslizenz wurde verlängert');
    expect(result.license.expiresAt.getTime()).toBe(expiresAt.getTime() + 30 * DAY_MS);
    expect(await ownerCredit()).toBe(10);
  });

  it('keeps the friend permission of a trade agreement', async () => {
    const { id } = await alliances.proposeSettlerRelationship(buyer.id, {
      recipientPlayerId: owner.id,
      type: TRADE_AGREEMENT,
      permissions: { treatAsFriend: true, shareLivePositions: false },
    });
    await alliances.acceptRelationshipProposal(owner.id, id);

    const stance = await resolver.resolve(buyer.id, owner.id);
    expect(stance.isFriend).toBe(true);
    expect(stance).not.toHaveProperty('mayTradeFavorably');
  });

  it('has dropped the unused faction trade modifier', async () => {
    const columns: Array<{ column_name: string }> = await source.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'faction_modifiers'`,
    );
    expect(columns.map((column) => column.column_name)).not.toContain('tradeModifier');
    expect(columns.map((column) => column.column_name)).toContain('researchMultiplier');
  });
});
