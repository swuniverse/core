import { DataSource } from 'typeorm';
import type { User } from '../../modules/auth/user.entity';
import { UNLIMITED_LICENSE_EXPIRY } from '../../modules/trade/player-trade-post.service';
import { TradePostManagementService } from '../../modules/trade/trade-post-management.service';
import { TradeStorageService } from '../../modules/trade/trade-storage.service';
import { connectIntegrationDatabase, createUser, resetDatabase } from './database';

const AURODIUM = 50;
const DURASTAHL = 10101;
const DAY_MS = 24 * 60 * 60 * 1000;
const gameData = {
  getCommodity: (id: number) => ({ id, name: id === AURODIUM ? 'Aurodium' : 'Durastahl', isTradeable: true }),
  getAllCommodities: () => [
    { id: DURASTAHL, name: 'Durastahl', isTradeable: true },
    { id: AURODIUM, name: 'Aurodium', isTradeable: true },
    { id: 1, name: 'Nahrung', isTradeable: false },
  ],
};

/** tmw-T12b: the owner manages a player trade post from the station view. */
describe('trade post management (PostgreSQL)', () => {
  let source: DataSource;
  beforeAll(async () => { source = await connectIntegrationDatabase(); });
  beforeEach(async () => resetDatabase(source));
  afterAll(async () => source?.destroy());

  let owner: User;
  let trader: User;
  let service: TradePostManagementService;
  let stationId: number;
  let postId: number;

  beforeEach(async () => {
    owner = await createUser(source, { username: 'Lando' });
    trader = await createUser(source, { username: 'Han' });
    service = new TradePostManagementService(source, new TradeStorageService(source), gameData as never);
    const layer = await source.getRepository('Layer').save({ name: 'Rand', width: 2, height: 1 });
    const fieldType = await source.getRepository('GalaxyFieldType').findOneByOrFail({});
    const field = await source.getRepository('GalaxyField').save({ layerId: layer.id, cx: 1, cy: 1, fieldTypeId: fieldType.id });
    const locationId = (await source.getRepository('SpaceLocation').findOneByOrFail({ galaxyFieldId: field.id })).id;
    const shipClass = await source.getRepository('ShipClassDef').save({
      key: 'REBEL_OUTPOST', name: 'Außenposten', category: 'STATION', role: 'OUTPOST',
    });
    stationId = (await source.getRepository('Spacecraft').save({
      name: 'Außenposten', userId: owner.id, shipClassId: shipClass.id, locationId, kind: 'STATION', stationRole: 'OUTPOST',
      runtimeSystems: {},
    }) as unknown as { id: number }).id;
    postId = (await source.getRepository('TradePost').save({
      name: 'Handelsposten', description: '', networkId: owner.id, level: 1, transferCapacity: 0, storageLimit: 10_000,
      ownerId: owner.id, locationId, stationId,
    }) as unknown as { id: number }).id;
    const now = Date.now();
    await source.getRepository('TradeLicense').save([
      { tradePostId: postId, userId: owner.id, startsAt: new Date(now), expiresAt: UNLIMITED_LICENSE_EXPIRY },
      { tradePostId: postId, userId: trader.id, startsAt: new Date(now), expiresAt: new Date(now + DAY_MS) },
    ]);
  });

  it('lets only the owner rename the post, cleaned and within the length limits', async () => {
    await expect(
      service.update(postId, owner.id, { name: '  <b>Bespin</b>\u0007 Hafen ', description: '<i>Wolken</i>stadt' }),
    ).resolves.toMatchObject({ name: 'Bespin  Hafen', description: 'Wolkenstadt' });
    expect(await source.getRepository('TradePost').findOneByOrFail({ id: postId })).toMatchObject({
      name: 'Bespin  Hafen', description: 'Wolkenstadt',
    });

    await expect(service.update(postId, trader.id, { name: 'Fremdposten' })).rejects.toThrow('Handelsposten nicht gefunden');
    await expect(service.update(postId, owner.id, { name: 'ab' })).rejects.toThrow('Der Name muss 3 bis 40 Zeichen lang sein');
    await expect(service.update(postId, owner.id, { name: '<b></b>xy' })).rejects.toThrow('Der Name muss 3 bis 40 Zeichen lang sein');
    await expect(service.update(postId, owner.id, { name: 'x'.repeat(41) })).rejects.toThrow('Der Name muss 3 bis 40 Zeichen lang sein');
    await expect(service.update(postId, owner.id, { description: 'x'.repeat(1001) })).rejects.toThrow(
      'Die Beschreibung darf höchstens 1000 Zeichen lang sein',
    );
    await expect(service.update(postId, owner.id, {})).rejects.toThrow('Name oder Beschreibung angeben');
    await expect(service.update(postId, owner.id, { name: 42 as never })).rejects.toThrow('Der Name muss 3 bis 40 Zeichen lang sein');

    // Only the description: the name stays; 40 characters are allowed.
    await service.update(postId, owner.id, { description: '' });
    await service.update(postId, owner.id, { name: 'x'.repeat(40) });
    expect(await source.getRepository('TradePost').findOneByOrFail({ id: postId })).toMatchObject({
      name: 'x'.repeat(40), description: '',
    });
  });

  it('shows the owner the trade post of the station with storage, condition and licensees', async () => {
    await source.getRepository('TradeAccountStorage').save({ tradePostId: postId, userId: owner.id, commodityId: DURASTAHL, amount: 120 });
    await source.getRepository('TradeLicenseCondition').save({ tradePostId: postId, commodityId: AURODIUM, amount: 5, durationDays: 7 });
    // Like STU, every license of the post counts, the owner's included; expired ones do not.
    const third = await createUser(source);
    await source.getRepository('TradeLicense').save({
      tradePostId: postId, userId: third.id, startsAt: new Date(Date.now() - 2 * DAY_MS), expiresAt: new Date(Date.now() - DAY_MS),
    });

    expect(await service.getForStation(stationId, owner.id)).toEqual({
      tradePostId: postId,
      name: 'Handelsposten',
      description: '',
      networkId: owner.id,
      networkName: 'Handelsnetz von Lando',
      storage: { used: 120, capacity: 10_000 },
      condition: { commodityId: AURODIUM, commodityName: 'Aurodium', amount: 5, durationDays: 7 },
      licenseeCount: 2,
      tradeableCommodities: [
        { id: AURODIUM, name: 'Aurodium' },
        { id: DURASTAHL, name: 'Durastahl' },
      ],
    });
  });

  it('returns no post for other stations and hides foreign stations', async () => {
    await source.getRepository('TradePost').update(postId, { stationId: null });
    await expect(service.getForStation(stationId, owner.id)).resolves.toBeNull();
    await expect(service.getForStation(stationId, trader.id)).rejects.toThrow('Station nicht gefunden');
  });
});
