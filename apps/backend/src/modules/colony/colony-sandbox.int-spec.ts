import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { ColonySandboxService } from './colony-sandbox.service';
import { ColonySandbox } from './entities/colony-sandbox.entity';
import { Colony } from './entities/colony.entity';
import { ColonyField } from './entities/colony-field.entity';
import { User } from '../auth/user.entity';
import { AddColonySandboxes20261116100000 } from '../../database/migrations/20261116100000-add-colony-sandboxes';
import {
  connectIntegrationDatabase,
  createUser,
  resetDatabase,
} from '../../testing/integration/database';

/** Uses the migration-built schema, never TypeORM synchronize. */
describe('Colony sandboxes (PostgreSQL)', () => {
  let source: DataSource;
  let service: ColonySandboxService;
  let ownerId: number;
  let otherId: number;
  let colonyId: number;

  beforeAll(async () => {
    source = await connectIntegrationDatabase();
    service = new ColonySandboxService(
      source.getRepository(ColonySandbox),
      source,
      { hasTechByName: async () => true } as never,
      { calculateSummary: () => ({ housingBonus: 0 }) } as never,
    );
  }, 180_000);

  afterAll(async () => {
    await source?.destroy();
  });

  beforeEach(async () => {
    await resetDatabase(source);
    ownerId = (await createUser(source)).id;
    otherId = (await createUser(source)).id;
    colonyId = (
      await source.getRepository(Colony).save({
        userId: ownerId,
        name: 'Naboo',
        colonyClassId: 1,
        energy: 75,
        storageUsed: 10,
        surfaceWidth: 6,
      })
    ).id;
    await source.getRepository(ColonyField).save([
      {
        colonyId,
        fieldIndex: 0,
        fieldType: 901,
        layer: 'ORBIT',
        buildingId: 7,
        isActive: false,
      },
      {
        colonyId,
        fieldIndex: 20,
        fieldType: 101,
        layer: 'SURFACE',
        buildingId: null,
        isActive: true,
      },
      {
        colonyId,
        fieldIndex: 30,
        fieldType: 801,
        layer: 'UNDERGROUND',
        buildingId: 8,
        isActive: true,
      },
    ]);
  });

  it('persists independent copies with all layers without changing live colony counts, resources or fields', async () => {
    const original = await source
      .getRepository(Colony)
      .findOneByOrFail({ id: colonyId });
    const result = await service.create(ownerId, colonyId, 'Plan');
    expect(result.snapshot.fields).toHaveLength(3);
    expect(result.snapshot.fields[0]).toMatchObject({
      fieldType: 901,
      buildingId: 7,
      isActive: false,
    });
    expect(
      await source.getRepository(Colony).findOneByOrFail({ id: colonyId }),
    ).toEqual(original);
    expect(await source.getRepository(Colony).count()).toBe(1);
    await source
      .getRepository(ColonyField)
      .update({ colonyId, fieldIndex: 0 }, { buildingId: 99, isActive: true });
    expect(
      (await service.get(ownerId, result.id)).snapshot.fields[0],
    ).toMatchObject({ buildingId: 7, isActive: false });
  });

  it('has no per-player limit across concurrent requests and different source colonies', async () => {
    const secondId = (
      await source
        .getRepository(Colony)
        .save({ userId: ownerId, name: 'Bespin', colonyClassId: 1 })
    ).id;
    const results = await Promise.allSettled(
      Array.from({ length: 5 }, (_, index) =>
        service.create(
          ownerId,
          index % 2 ? secondId : colonyId,
          `Plan ${index}`,
        ),
      ),
    );
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(5);
    expect(
      await source.getRepository(ColonySandbox).countBy({ userId: ownerId }),
    ).toBe(5);
  });

  it('protects owner access, supports rename/delete and cascades on account deletion', async () => {
    const sandbox = await service.create(ownerId, colonyId, 'Plan');
    await expect(service.create(otherId, colonyId, 'Foreign')).rejects.toThrow(
      'Kolonie nicht gefunden',
    );
    expect((await service.list(otherId)).sandboxes).toEqual([]);
    await expect(service.get(otherId, sandbox.id)).rejects.toThrow(
      'Sandbox nicht gefunden',
    );
    await expect(
      service.rename(otherId, sandbox.id, 'Foreign'),
    ).rejects.toThrow('Sandbox nicht gefunden');
    await expect(service.remove(otherId, sandbox.id)).rejects.toThrow(
      'Sandbox nicht gefunden',
    );
    expect((await service.rename(ownerId, sandbox.id, 'Renamed')).name).toBe(
      'Renamed',
    );
    await service.remove(ownerId, sandbox.id);
    expect((await service.list(ownerId)).sandboxes).toEqual([]);
    await service.create(ownerId, colonyId, 'Another');
    // Separate source ownership: no planning copy can move to a new owner.
    await source
      .getRepository(Colony)
      .update({ id: colonyId }, { userId: otherId });
    await source.getRepository(User).delete(ownerId);
    expect(await source.getRepository(ColonySandbox).count()).toBe(0);
  });

  it('supports reversing and reapplying the sandbox schema migration', async () => {
    const migration = new AddColonySandboxes20261116100000();
    const runner = source.createQueryRunner();
    try {
      await migration.down(runner);
      expect((await runner.query("SELECT to_regclass('public.colony_sandboxes') AS table_name"))[0].table_name).toBeNull();
      await migration.up(runner);
      expect(await source.getRepository(ColonySandbox).count()).toBe(0);
    } finally {
      await runner.release();
    }
  });

  it('keeps the snapshot when the source colony is deleted', async () => {
    const sandbox = await service.create(ownerId, colonyId, 'Plan');
    await source.getRepository(Colony).delete(colonyId);
    const result = await service.get(ownerId, sandbox.id);
    expect(result.sourceColonyId).toBeNull();
    expect(result.snapshot.fields).toHaveLength(3);
  });
});
