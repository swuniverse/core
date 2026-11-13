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
import { TradeAgreementPolicy } from '../../modules/trade/trade-agreement.policy';
import { TradeLicenseMenuService } from '../../modules/trade/trade-license-menu.service';
import { TradeLicensePurchaseService } from '../../modules/trade/trade-license-purchase.service';
import { TradePostPresencePolicy } from '../../modules/trade/trade-post-presence.policy';
import { connectIntegrationDatabase, createUser, factionId, resetDatabase } from './database';

const COMMODITY = 5;
const DAY_MS = 24 * 60 * 60 * 1000;
const { TRADE_AGREEMENT, FRIENDSHIP } = AllianceRelationshipType;

/** tmw-T13: partners of an active trade agreement get licenses at the owner's player post for free. */
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
    const agreements = new TradeAgreementPolicy(relationships as RelationshipResolverService);
    purchases = new TradeLicensePurchaseService(source, new TradePostPresencePolicy(), messaging, agreements);
    menus = new TradeLicenseMenuService(source, new TradePostPresencePolicy(), { getCommodity: () => undefined, getAllCommodities: () => [] } as never, agreements);
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

  it('issues the license free of charge to a partner of an active trade agreement', async () => {
    await agree();
    const shipId = await shipWithCargo(10);

    const result = await purchases.purchase(postId, buyer.id, { method: 'ship', shipId, payShipId: shipId });

    expect(result.message).toBe('Handelslizenz wurde kostenlos erteilt (Handelsabkommen)');
    expect(await cargoOf(shipId)).toBe(10);
    expect(await ownerCredit()).toBe(0);
    expect(await source.getRepository('TradeLicense').count()).toBe(1);
    expect(await source.getRepository('Message').find()).toMatchObject([
      { recipientId: owner.id, folder: 'TRADE', body: 'Buyer hat am Partnerposten über das Handelsabkommen eine Handelslizenz erhalten.' },
    ]);
  });

  it('lets a partner without any payment source take the license by agreement', async () => {
    await agree();
    const shipId = await shipWithCargo(0);

    const menu = await menus.getMenu(postId, buyer.id, shipId);
    expect(menu).toMatchObject({ freeByAgreement: true, purchase: { shipId, rejection: null } });

    await purchases.purchase(postId, buyer.id, { method: 'agreement', shipId });
    expect(await source.getRepository('TradeLicense').findOneByOrFail({ tradePostId: postId, userId: buyer.id })).toBeTruthy();
  });

  it('charges as usual and refuses the agreement method without an active trade agreement', async () => {
    await agree(FRIENDSHIP);
    const shipId = await shipWithCargo(10);

    expect(await menus.getMenu(postId, buyer.id, shipId)).toMatchObject({ freeByAgreement: false });
    await expect(purchases.purchase(postId, buyer.id, { method: 'agreement', shipId }))
      .rejects.toThrow('Kein aktives Handelsabkommen mit dem Eigentümer dieses Handelspostens');
    expect(await source.getRepository('TradeLicense').count()).toBe(0);

    await purchases.purchase(postId, buyer.id, { method: 'ship', shipId, payShipId: shipId });
    expect(await cargoOf(shipId)).toBe(0);
    expect(await ownerCredit()).toBe(10);
  });

  it('charges again once the trade agreement has ended', async () => {
    await agree();
    const relationship = await source.getRepository('AllianceRelationship').findOneByOrFail({ type: TRADE_AGREEMENT });
    await alliances.endRelationship(buyer.id, relationship.id);
    const shipId = await shipWithCargo(10);

    await purchases.purchase(postId, buyer.id, { method: 'ship', shipId, payShipId: shipId });

    expect(await cargoOf(shipId)).toBe(0);
    expect(await ownerCredit()).toBe(10);
  });

  it('fails closed to the regular price when the relationship cannot be resolved', async () => {
    await agree();
    wire({ resolve: () => Promise.reject(new Error('alliance store unavailable')) });
    const shipId = await shipWithCargo(10);

    expect(await menus.getMenu(postId, buyer.id, shipId)).toMatchObject({ freeByAgreement: false });
    await expect(purchases.purchase(postId, buyer.id, { method: 'agreement', shipId }))
      .rejects.toThrow('Kein aktives Handelsabkommen');
    await purchases.purchase(postId, buyer.id, { method: 'ship', shipId, payShipId: shipId });
    expect(await ownerCredit()).toBe(10);
  });

  it('never waives the price at an NPC post', async () => {
    const npc = await createUser(source, { isNpc: true });
    await source.getRepository('TradePost').update(postId, { ownerId: npc.id });
    wire({ resolve: async () => ({ mayTradeFavorably: true }) as never });
    const shipId = await shipWithCargo(10);

    expect(await menus.getMenu(postId, buyer.id, shipId)).toMatchObject({ freeByAgreement: false });
    await purchases.purchase(postId, buyer.id, { method: 'ship', shipId, payShipId: shipId });
    expect(await cargoOf(shipId)).toBe(0);
  });

  it('renews free of charge without an account for an agreement partner', async () => {
    await agree();
    const expiresAt = new Date(Date.now() + 5 * DAY_MS);
    await source.getRepository('TradeLicense').save({ tradePostId: postId, userId: buyer.id, startsAt: new Date(Date.now() - DAY_MS), expiresAt, warningSentAt: null });

    const result = await purchases.renew(postId, buyer.id, {});

    expect(result.message).toBe('Handelslizenz wurde kostenlos verlängert (Handelsabkommen)');
    expect(result.license.expiresAt.getTime()).toBe(expiresAt.getTime() + 30 * DAY_MS);
    expect(await ownerCredit()).toBe(0);
  });

  it('still requires an account to renew without a trade agreement', async () => {
    await source.getRepository('TradeLicense').save({ tradePostId: postId, userId: buyer.id, startsAt: new Date(Date.now() - DAY_MS), expiresAt: new Date(Date.now() + DAY_MS), warningSentAt: null });

    await expect(purchases.renew(postId, buyer.id, {})).rejects.toThrow('Warenkonto muss eine gültige ID haben');
  });

  it('has dropped the unused faction trade modifier', async () => {
    const columns: Array<{ column_name: string }> = await source.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'faction_modifiers'`,
    );
    expect(columns.map((column) => column.column_name)).not.toContain('tradeModifier');
    expect(columns.map((column) => column.column_name)).toContain('researchMultiplier');
  });
});
