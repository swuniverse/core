import { DataSource } from 'typeorm';
import { TransferService } from '../../modules/spacecraft/transfer.service';
import {
  connectIntegrationDatabase,
  createUser,
  resetDatabase,
} from './database';

describe('ship cargo disposal (PostgreSQL)', () => {
  let source: DataSource;
  beforeAll(async () => {
    source = await connectIntegrationDatabase();
  });
  beforeEach(async () => resetDatabase(source));
  afterAll(async () => source?.destroy());

  async function setup() {
    const owner = await createUser(source);
    const foreign = await createUser(source);
    const shipClass = await source.getRepository('ShipClassDef').save({
      key: 'DISPOSE',
      name: 'Disposal',
      category: 'SHIP',
      role: 'SHIP',
    });
    const layer = await source
      .getRepository('Layer')
      .save({ name: 'Disposal', width: 10, height: 10 });
    const fieldType = await source
      .getRepository('GalaxyFieldType')
      .findOneByOrFail({});
    const field = await source
      .getRepository('GalaxyField')
      .save({ layerId: layer.id, cx: 1, cy: 1, fieldTypeId: fieldType.id });
    const location = await source
      .getRepository('SpaceLocation')
      .findOneByOrFail({ galaxyFieldId: field.id });
    const ship = await source.getRepository('Spacecraft').save({
      name: 'Test',
      userId: owner.id,
      shipClassId: shipClass.id,
      locationId: location.id,
      cargoUsed: 99,
      cargoMax: 100,
      runtimeSystems: {},
    });
    await source.getRepository('CargoItem').save([
      { spacecraftId: ship.id, commodityId: 7, amount: 10 },
      { spacecraftId: ship.id, commodityId: 8, amount: 5 },
    ]);
    const gameData = {
      getCommodity: jest.fn((id: number) => ({
        name: id === 7 ? 'Tibanna' : 'Duranium',
      })),
    };
    const service = new TransferService(
      source.getRepository('CargoItem') as never,
      {} as never,
      source,
      {} as never,
      {} as never,
      gameData as never,
      {} as never,
      {} as never,
    );
    return { owner, foreign, ship, service, gameData };
  }

  it('clamps stock, combines duplicate requests, deletes empty rows and recomputes cargoUsed', async () => {
    const { owner, ship, service } = await setup();
    const result = await service.disposeCargo(ship.id, owner.id, [
      { commodityId: 7, amount: 3 },
      { commodityId: 7, amount: 100 },
      { commodityId: 8, amount: 2 },
      { commodityId: 999, amount: 4 },
    ]);
    expect(result.messages).toEqual([
      '10 Tibanna entsorgt.',
      '2 Duranium entsorgt.',
    ]);
    expect(result.cargo).toEqual([
      expect.objectContaining({ commodityId: 8, amount: 3 }),
    ]);
    expect(result.cargoUsed).toBe(3);
    expect(await source.getRepository('CargoItem').count()).toBe(1);
    expect(
      (
        await source
          .getRepository('Spacecraft')
          .findOneByOrFail({ id: ship.id })
      ).cargoUsed,
    ).toBe(3);
  });

  it('denies foreign owners, hyperspace and wrecks without changing stock', async () => {
    const { owner, foreign, ship, service } = await setup();
    const items = [{ commodityId: 7, amount: 10 }];
    await expect(
      service.disposeCargo(ship.id, foreign.id, items),
    ).rejects.toThrow('Schiff nicht gefunden');
    await source
      .getRepository('Spacecraft')
      .update(ship.id, { runtimeSystems: { WARPDRIVE: { active: true } } });
    await expect(
      service.disposeCargo(ship.id, owner.id, items),
    ).rejects.toThrow('Hyperraum');
    await source
      .getRepository('Spacecraft')
      .update(ship.id, { status: 'DESTROYED', runtimeSystems: {} });
    await expect(
      service.disposeCargo(ship.id, owner.id, items),
    ).rejects.toThrow('Wracklager');
    expect(
      (
        await source
          .getRepository('CargoItem')
          .findOneByOrFail({ spacecraftId: ship.id, commodityId: 7 })
      ).amount,
    ).toBe(10);
  });

  it('serializes simultaneous disposal requests so cargo never becomes negative', async () => {
    const { owner, ship, service } = await setup();
    const results = await Promise.all([
      service.disposeCargo(ship.id, owner.id, [{ commodityId: 7, amount: 8 }]),
      service.disposeCargo(ship.id, owner.id, [{ commodityId: 7, amount: 8 }]),
    ]);
    expect(results.flatMap((r) => r.messages).sort()).toEqual([
      '2 Tibanna entsorgt.',
      '8 Tibanna entsorgt.',
    ]);
    expect(
      (
        await source
          .getRepository('Spacecraft')
          .findOneByOrFail({ id: ship.id })
      ).cargoUsed,
    ).toBe(5);
    expect(
      await source
        .getRepository('CargoItem')
        .findOneBy({ spacecraftId: ship.id, commodityId: 7 }),
    ).toBeNull();
  });

  it('rolls back all removed stock on a transaction failure', async () => {
    const { owner, ship, service, gameData } = await setup();
    gameData.getCommodity.mockImplementation(() => {
      throw new Error('lookup failed');
    });
    await expect(
      service.disposeCargo(ship.id, owner.id, [{ commodityId: 7, amount: 10 }]),
    ).rejects.toThrow('lookup failed');
    expect(
      (
        await source
          .getRepository('CargoItem')
          .findOneByOrFail({ spacecraftId: ship.id, commodityId: 7 })
      ).amount,
    ).toBe(10);
  });

  it('handles zero, empty and unavailable requests without deleting cargo', async () => {
    const { owner, ship, service } = await setup();
    for (const items of [
      [],
      [{ commodityId: 7, amount: 0 }],
      [{ commodityId: 999, amount: 10 }],
    ]) {
      expect(
        (await service.disposeCargo(ship.id, owner.id, items)).messages,
      ).toEqual(['Es wurden keine Waren entsorgt.']);
    }
    expect(await source.getRepository('CargoItem').count()).toBe(2);
    await expect(
      service.disposeCargo(ship.id, owner.id, [{ commodityId: 7, amount: -1 }]),
    ).rejects.toThrow('Ungültige');
  });
});
