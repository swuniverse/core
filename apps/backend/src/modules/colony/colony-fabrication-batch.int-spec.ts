import 'reflect-metadata';
import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ColonyFabricationService } from './colony-fabrication.service';
import { ColonyStorageService } from './colony-storage.service';
import { ColonyOwnershipService } from './colony-ownership.service';
import { Colony } from './entities/colony.entity';
import { ColonyField } from './entities/colony-field.entity';
import { ColonyStorage } from './entities/colony-storage.entity';
import { ColonyChangeable } from './entities/colony-changeable.entity';
import { ColonyStats } from './entities/colony-stats.entity';
import {
  ColonyFabricationQueue,
  ColonyFabricationQueueType,
} from './entities/colony-fabrication-queue.entity';
import { User } from '../auth/user.entity';
import {
  connectIntegrationDatabase,
  createUser,
  resetDatabase,
} from '../../testing/integration/database';

const FN = 10;
const item = (itemKey: string, energyCost: number, costs: any[]) => ({
  itemKey,
  displayName: itemKey,
  queueType: ColonyFabricationQueueType.MODULE,
  buildingFunctionIds: [FN],
  energyCost,
  costs,
  outputCommodityId: 900,
  outputAmount: 1,
});
const ITEMS: Record<string, ReturnType<typeof item>> = {
  a: item('a', 5, [{ commodityId: 2, amount: 10 }]),
  b: item('b', 5, [{ commodityId: 2, amount: 10 }]),
};

describe('Colony fabrication batch (PostgreSQL)', () => {
  let source: DataSource;
  let service: ColonyFabricationService;
  let storageService: ColonyStorageService;
  let ownerId: number;
  let colonyId: number;

  beforeAll(async () => {
    source = await connectIntegrationDatabase();
    storageService = new ColonyStorageService(
      source.getRepository(ColonyStorage),
    );
    service = new ColonyFabricationService(
      source.getRepository(ColonyFabricationQueue),
      source.getRepository(User),
      {
        getFabricationItem: (k: string) => ITEMS[k],
        getBuildingFunctions: () => [FN],
      } as never,
      {} as never,
      storageService,
      new ColonyOwnershipService(source.getRepository(Colony)),
      { hasTech: async () => true } as never,
      source.getRepository(Colony),
    );
  }, 180_000);

  afterAll(async () => {
    await source?.destroy();
  });

  beforeEach(async () => {
    await resetDatabase(source);
    ownerId = (await createUser(source)).id;
    colonyId = (
      await source.getRepository(Colony).save({
        userId: ownerId,
        name: 'Naboo',
        colonyClassId: 1,
        storageUsed: 25,
        surfaceWidth: 6,
      })
    ).id;
    const base = {
      colonyId,
      workers: 0,
      workless: 0,
      maxPopulation: 0,
      maxEnergy: 100,
      maxStorage: 1000,
      maxShields: 0,
    };
    await source.getRepository(ColonyStats).save(base as never);
    await source
      .getRepository(ColonyChangeable)
      .save({ ...base, energy: 100, shields: 0 } as never);
    await source.getRepository(ColonyField).save({
      colonyId,
      fieldIndex: 0,
      fieldType: 101,
      layer: 'SURFACE',
      buildingId: 7,
      isActive: true,
    });
    await source
      .getRepository(ColonyStorage)
      .save({ colonyId, commodityId: 2, amount: 25 });
  });

  const stock = async () =>
    (
      await source
        .getRepository(ColonyStorage)
        .findOneByOrFail({ colonyId, commodityId: 2 })
    ).amount;
  const energy = async () =>
    (await source.getRepository(ColonyChangeable).findOneByOrFail({ colonyId }))
      .energy;

  it('truncates sequentially across modules sharing a commodity', async () => {
    const result = await service.queueFabricationBatch(colonyId, ownerId, FN, [
      { itemKey: 'a', amount: 2 },
      { itemKey: 'b', amount: 2 },
      { itemKey: 'nope', amount: 1 },
    ]);
    expect(result.items.map((i) => i.accepted)).toEqual([2, 0, 0]);
    expect(result.items[2].message).toContain('Unknown fabrication item');
    expect(await stock()).toBe(5);
    expect(await energy()).toBe(90);
    const jobs = await source.getRepository(ColonyFabricationQueue).find();
    expect(jobs.map((j) => [j.itemKey, j.amount])).toEqual([['a', 2]]);
  });

  it('truncates to the available EPS', async () => {
    await source
      .getRepository(ColonyChangeable)
      .update({ colonyId }, { energy: 7 });
    const result = await service.queueFabricationBatch(colonyId, ownerId, FN, [
      { itemKey: 'a', amount: 2 },
    ]);
    expect(result.items[0]).toMatchObject({ requested: 2, accepted: 1 });
    expect(await energy()).toBe(2);
    expect(await stock()).toBe(15);
  });

  it('rolls everything back on an unexpected error', async () => {
    const spy = jest
      .spyOn(service, 'queueFabrication')
      .mockImplementationOnce(
        // first call runs the real implementation, second blows up
        ColonyFabricationService.prototype.queueFabrication.bind(service),
      )
      .mockRejectedValueOnce(new Error('boom'));
    await expect(
      service.queueFabricationBatch(colonyId, ownerId, FN, [
        { itemKey: 'a', amount: 1 },
        { itemKey: 'b', amount: 1 },
      ]),
    ).rejects.toThrow('boom');
    spy.mockRestore();
    expect(await stock()).toBe(25);
    expect(await energy()).toBe(100);
    expect(await source.getRepository(ColonyFabricationQueue).count()).toBe(0);
  });

  it('rejects the whole request when the building is not active', async () => {
    await source
      .getRepository(ColonyField)
      .update({ colonyId }, { isActive: false });
    await expect(
      service.queueFabricationBatch(colonyId, ownerId, FN, [
        { itemKey: 'a', amount: 1 },
      ]),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(await stock()).toBe(25);
  });
});
