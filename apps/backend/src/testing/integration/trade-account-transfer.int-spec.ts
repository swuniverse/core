import { DataSource } from 'typeorm';
import { TradeAccountTransferService } from '../../modules/trade/trade-account-transfer.service';
import { TradePostPresencePolicy } from '../../modules/trade/trade-post-presence.policy';
import { TradeStorageService } from '../../modules/trade/trade-storage.service';
import { connectIntegrationDatabase, createUser, resetDatabase } from './database';

const AURODIUM = 5;
const DURASTAHL = 6;
const BEAM_ONLY = 8;
const PRISONERS = 9;
const COMMODITIES: Record<number, { name: string; isTradeable: boolean; isBeamable: boolean }> = {
  [AURODIUM]: { name: 'Aurodium', isTradeable: true, isBeamable: true },
  [DURASTAHL]: { name: 'Durastahl', isTradeable: true, isBeamable: true },
  [BEAM_ONLY]: { name: 'Kartenmaterial', isTradeable: false, isBeamable: true },
  [PRISONERS]: { name: 'Gefangene', isTradeable: false, isBeamable: false },
};
const DAY_MS = 24 * 60 * 60 * 1000;

describe('trade account transfer at a post (PostgreSQL)', () => {
  let source: DataSource;
  beforeAll(async () => { source = await connectIntegrationDatabase(); });
  beforeEach(async () => resetDatabase(source));
  afterAll(async () => source?.destroy());

  let userId: number;
  let postId: number;
  let locations: number[];
  let shipClassId: number;
  let service: TradeAccountTransferService;

  beforeEach(async () => {
    userId = (await createUser(source)).id;
    const owner = await createUser(source);
    const gameData = { getCommodity: (id: number) => COMMODITIES[id] };
    service = new TradeAccountTransferService(source, new TradePostPresencePolicy(), new TradeStorageService(source), gameData as never);
    const layer = await source.getRepository('Layer').save({ name: 'Handel', width: 2, height: 1 });
    const fieldType = await source.getRepository('GalaxyFieldType').findOneByOrFail({});
    locations = [];
    for (const cx of [1, 2]) {
      const field = await source.getRepository('GalaxyField').save({ layerId: layer.id, cx, cy: 1, fieldTypeId: fieldType.id });
      locations.push((await source.getRepository('SpaceLocation').findOneByOrFail({ galaxyFieldId: field.id })).id);
    }
    postId = (await source.getRepository('TradePost').save({ name: 'Mos Eisley', networkId: 1, ownerId: owner.id, locationId: locations[0], storageLimit: 100 })).id;
    await source.getRepository('TradeLicense').save({ tradePostId: postId, userId, startsAt: new Date(Date.now() - DAY_MS), expiresAt: new Date(Date.now() + DAY_MS) });
    shipClassId = (await source.getRepository('ShipClassDef').save({ key: 'TRADER', name: 'Händler', category: 'SHIP', role: 'FREIGHTER' })).id;
  });

  async function ship(cargo: Record<number, number>, values: Record<string, unknown> = {}) {
    const saved = await source.getRepository('Spacecraft').save({
      name: 'Barke', userId, shipClassId, locationId: locations[0], energy: 10, cargoMax: 50, runtimeSystems: {}, ...values,
    });
    for (const [commodityId, amount] of Object.entries(cargo)) {
      await source.getRepository('CargoItem').save({ spacecraftId: saved.id, commodityId: Number(commodityId), amount });
    }
    return saved;
  }

  function account(commodityId: number, amount: number) {
    return source.getRepository('TradeAccountStorage').save({ tradePostId: postId, userId, commodityId, amount });
  }

  const cargoOf = async (spacecraftId: number, commodityId: number) =>
    (await source.getRepository('CargoItem').findOneBy({ spacecraftId, commodityId }))?.amount ?? 0;
  const accountOf = async (commodityId: number) =>
    (await source.getRepository('TradeAccountStorage').findOneBy({ tradePostId: postId, userId, commodityId }))?.amount ?? 0;

  it('moves cargo into the account without energy cost', async () => {
    const barke = await ship({ [AURODIUM]: 30, [DURASTAHL]: 20 });

    const result = await service.transfer(barke.id, userId, postId, 'TO_ACCOUNT', [
      { commodityId: AURODIUM, amount: 20 },
      { commodityId: DURASTAHL, amount: 5 },
    ]);

    expect(result).toEqual({
      direction: 'TO_ACCOUNT',
      transferred: [
        { commodityId: AURODIUM, commodityName: 'Aurodium', amount: 20 },
        { commodityId: DURASTAHL, commodityName: 'Durastahl', amount: 5 },
      ],
      messages: [],
    });
    expect(await cargoOf(barke.id, AURODIUM)).toBe(10);
    expect(await cargoOf(barke.id, DURASTAHL)).toBe(15);
    expect(await accountOf(AURODIUM)).toBe(20);
    expect(await accountOf(DURASTAHL)).toBe(5);
    expect(await source.getRepository('Spacecraft').findOneByOrFail({ id: barke.id })).toMatchObject({ energy: 10, cargoUsed: 25 });
  });

  it('truncates to free account space and skips untradeable or missing goods with a note', async () => {
    await source.getRepository('TradePost').update(postId, { storageLimit: 30 });
    await account(DURASTAHL, 20);
    const barke = await ship({ [AURODIUM]: 30, [PRISONERS]: 5 });

    const result = await service.transfer(barke.id, userId, postId, 'TO_ACCOUNT', [
      { commodityId: PRISONERS, amount: 5 },
      { commodityId: DURASTAHL, amount: 5 },
      { commodityId: AURODIUM, amount: 25 },
    ]);

    expect(result.transferred).toEqual([{ commodityId: AURODIUM, commodityName: 'Aurodium', amount: 10 }]);
    expect(result.messages).toEqual([
      'Gefangene ist nicht handelbar',
      'Durastahl ist nicht im Frachtraum',
      'Aurodium: gekürzt auf 10, Warenkonto ist voll',
    ]);
    expect(await cargoOf(barke.id, PRISONERS)).toBe(5);
    expect(await accountOf(AURODIUM)).toBe(10);
  });

  it('needs no ship energy, like STU', async () => {
    const barke = await ship({ [AURODIUM]: 30 }, { energy: 0 });

    const result = await service.transfer(barke.id, userId, postId, 'TO_ACCOUNT', [{ commodityId: AURODIUM, amount: 30 }]);

    expect(result.transferred).toEqual([{ commodityId: AURODIUM, commodityName: 'Aurodium', amount: 30 }]);
    expect(result.messages).toEqual([]);
    expect(await source.getRepository('Spacecraft').findOneByOrFail({ id: barke.id })).toMatchObject({ energy: 0 });
  });

  it('moves account goods onto the ship truncated to free cargo space and beamable goods only', async () => {
    await account(AURODIUM, 40);
    await account(PRISONERS, 3);
    await account(BEAM_ONLY, 2);
    const barke = await ship({ [DURASTAHL]: 43 });

    const result = await service.transfer(barke.id, userId, postId, 'FROM_ACCOUNT', [
      { commodityId: PRISONERS, amount: 3 },
      { commodityId: BEAM_ONLY, amount: 2 },
      { commodityId: AURODIUM, amount: 40 },
    ]);

    expect(result.transferred).toEqual([
      { commodityId: BEAM_ONLY, commodityName: 'Kartenmaterial', amount: 2 },
      { commodityId: AURODIUM, commodityName: 'Aurodium', amount: 5 },
    ]);
    expect(result.messages).toEqual(['Gefangene ist nicht beambar', 'Aurodium: gekürzt auf 5, Frachtraum ist voll']);
    expect(await accountOf(AURODIUM)).toBe(35);
    expect(await accountOf(BEAM_ONLY)).toBe(0);
    expect(await cargoOf(barke.id, AURODIUM)).toBe(5);
    expect(await source.getRepository('Spacecraft').findOneByOrFail({ id: barke.id })).toMatchObject({ energy: 10, cargoUsed: 50 });
  });

  it('rejects transfers without presence, license, space or goods and changes nothing', async () => {
    const present = await ship({ [AURODIUM]: 10 });
    const flying = await ship({ [AURODIUM]: 10 }, { status: 'IN_FLIGHT' });
    const cloaked = await ship({ [AURODIUM]: 10 }, { runtimeSystems: { CLOAK: { active: true } } });
    const away = await ship({ [AURODIUM]: 10 }, { locationId: locations[1] });
    const empty = await ship({});
    const full = await ship({ [DURASTAHL]: 50 });
    const other = await createUser(source);
    const line = [{ commodityId: AURODIUM, amount: 5 }];

    await expect(service.transfer(flying.id, userId, postId, 'TO_ACCOUNT', line)).rejects.toThrow('Das Schiff befindet sich im Flug');
    await expect(service.transfer(cloaked.id, userId, postId, 'TO_ACCOUNT', line)).rejects.toThrow('Die Tarnung ist aktiv');
    await expect(service.transfer(away.id, userId, postId, 'TO_ACCOUNT', line)).rejects.toThrow('Das Schiff befindet sich nicht am Handelsposten');
    await expect(service.transfer(present.id, other.id, postId, 'TO_ACCOUNT', line)).rejects.toThrow('Schiff nicht gefunden');
    await expect(service.transfer(empty.id, userId, postId, 'TO_ACCOUNT', line)).rejects.toThrow('Keine Waren zum Transferieren vorhanden');
    await expect(service.transfer(full.id, userId, postId, 'FROM_ACCOUNT', line)).rejects.toThrow('Der Frachtraum ist voll');
    await expect(service.transfer(present.id, userId, postId, 'TO_ACCOUNT', [])).rejects.toThrow('Es wurden keine Waren zum Transferieren ausgewählt');
    await expect(service.transfer(present.id, userId, postId, 'TO_ACCOUNT', [{ commodityId: AURODIUM, amount: 0 }]))
      .rejects.toThrow('Ware und Menge müssen positive Ganzzahlen sein');

    await source.getRepository('TradePost').update(postId, { storageLimit: 0 });
    await expect(service.transfer(present.id, userId, postId, 'TO_ACCOUNT', line)).rejects.toThrow('Dein Warenkonto an diesem Posten ist voll');

    await source.getRepository('TradeLicense').update({ tradePostId: postId, userId }, { expiresAt: new Date(Date.now() - 1) });
    await expect(service.transfer(present.id, userId, postId, 'TO_ACCOUNT', line))
      .rejects.toThrow('Du benötigst eine gültige Lizenz für diesen Handelsposten');

    expect(await cargoOf(present.id, AURODIUM)).toBe(10);
    expect(await source.getRepository('TradeAccountStorage').count()).toBe(0);
    expect(await source.getRepository('Spacecraft').findOneByOrFail({ id: present.id })).toMatchObject({ energy: 10 });
  });

  it('never overbooks the account when two ships transfer concurrently', async () => {
    await source.getRepository('TradePost').update(postId, { storageLimit: 10 });
    const first = await ship({ [AURODIUM]: 10 });
    const second = await ship({ [AURODIUM]: 10 });

    const results = await Promise.allSettled([
      service.transfer(first.id, userId, postId, 'TO_ACCOUNT', [{ commodityId: AURODIUM, amount: 10 }]),
      service.transfer(second.id, userId, postId, 'TO_ACCOUNT', [{ commodityId: AURODIUM, amount: 10 }]),
    ]);

    expect(results.map((result) => result.status).sort()).toEqual(['fulfilled', 'rejected']);
    expect(await accountOf(AURODIUM)).toBe(10);
    expect((await cargoOf(first.id, AURODIUM)) + (await cargoOf(second.id, AURODIUM))).toBe(10);
  });

  it('describes the trade menu with cargo, account and space', async () => {
    await account(AURODIUM, 7);
    const barke = await ship({ [DURASTAHL]: 12, [PRISONERS]: 1 });

    expect(await service.getMenu(barke.id, userId, postId)).toEqual({
      tradePostId: postId,
      tradePostName: 'Mos Eisley',
      reason: null,
      hasLicense: true,
      cargo: [
        { commodityId: DURASTAHL, commodityName: 'Durastahl', amount: 12, transferable: true },
        { commodityId: PRISONERS, commodityName: 'Gefangene', amount: 1, transferable: false },
      ],
      cargoUsed: 13,
      cargoMax: 50,
      account: [{ commodityId: AURODIUM, commodityName: 'Aurodium', amount: 7, transferable: true }],
      accountUsed: 7,
      accountCapacity: 100,
    });
  });
});
