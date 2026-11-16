jest.mock('./entities/colony.entity', () => ({ Colony: class Colony {} }));
jest.mock('./entities/colony-field.entity', () => ({
  ColonyField: class ColonyField {},
}));
jest.mock('./entities/colony-stats.entity', () => ({
  ColonyStats: class ColonyStats {},
}));
jest.mock('../auth/user.entity', () => ({ User: class User {} }));
jest.mock('./entities/colony-sandbox.entity', () => ({
  ColonySandbox: class ColonySandbox {},
}));

import { ColonySandboxService } from './colony-sandbox.service';

function setup(limit?: number) {
  const fields = [
    {
      id: 1,
      fieldIndex: 0,
      fieldType: 101,
      layer: 'ORBIT',
      buildingId: 7,
      isActive: false,
      isBuilding: false,
      terrainTileId: 'orbit',
      integrity: 80,
      maxIntegrity: 100,
    },
    {
      id: 2,
      fieldIndex: 20,
      fieldType: 102,
      layer: 'SURFACE',
      buildingId: null,
      isActive: true,
      isBuilding: false,
      bonusMarker: 'PHRIK',
      terrainTileId: 'rock',
    },
    {
      id: 3,
      fieldIndex: 30,
      fieldType: 103,
      layer: 'UNDERGROUND',
      buildingId: 8,
      isActive: true,
      isBuilding: true,
      buildProgress: 2,
      buildFinishesAt: new Date('2026-12-01T00:00:00Z'),
    },
  ];
  const colony = {
    id: 4,
    userId: 1,
    name: 'Naboo',
    colonyClassId: 2,
    surfaceWidth: 6,
    surfaceMask: 'mask',
    solarOutputTJ: 30,
    energy: 20,
    storageUsed: 5,
  };
  const saved: object[] = [];
  const repository = {
    create: jest.fn((data) => data),
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
    save: jest.fn(async (value) => value),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
  };
  const manager = {
    findOne: jest.fn(async (entity: { name: string }): Promise<unknown> =>
      entity.name === 'User'
        ? { id: 1 }
        : entity.name === 'Colony'
          ? colony
          : { workers: 4, maxStorage: 100 },
    ),
    find: jest.fn(async () => fields),
    count: jest.fn(async () => 0),
    getRepository: jest.fn(() => repository),
    save: jest.fn(async (_entity, data) => {
      saved.push(structuredClone(data));
      return { id: 10, createdAt: new Date('2026-11-16T00:00:00Z'), ...data };
    }),
  };
  const dataSource = { transaction: jest.fn(async (work) => work(manager)) };
  const config = { get: jest.fn(() => limit) };
  const unlocks = { hasTechByName: jest.fn().mockResolvedValue(true) };
  const service = new ColonySandboxService(
    repository as never,
    dataSource as never,
    config as never,
    unlocks as never,
  );
  return {
    service,
    repository,
    manager,
    dataSource,
    unlocks,
    fields,
    colony,
    saved,
  };
}

describe('ColonySandboxService', () => {
  it('copies every field and layout into a separate owner-bound snapshot without mutating the colony', async () => {
    const { service, fields, colony, saved } = setup();
    const before = structuredClone({ fields, colony });
    const result = await service.create(1, 4, '  Entwurf  ');
    expect(result.name).toBe('Entwurf');
    expect(result.sourceColonyId).toBe(4);
    expect(result.snapshot.surfaceWidth).toBe(6);
    expect(result.snapshot.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldIndex: 0,
          buildingId: 7,
          isActive: false,
          fieldType: 101,
        }),
        expect.objectContaining({
          fieldIndex: 20,
          bonusMarker: 'PHRIK',
          terrainTileId: 'rock',
        }),
        expect.objectContaining({
          fieldIndex: 30,
          isBuilding: true,
          buildFinishesAt: '2026-12-01T00:00:00.000Z',
        }),
      ]),
    );
    expect({ fields, colony }).toEqual(before);
    fields[0].buildingId = 99;
    expect(
      (saved[0] as { snapshot: { fields: typeof fields } }).snapshot.fields[0]
        .buildingId,
    ).toBe(7);
  });

  it('serializes quota checks on the player and rejects the fourth sandbox before saving', async () => {
    const { service, manager } = setup();
    manager.count.mockResolvedValue(3);
    await expect(service.create(1, 4, 'Entwurf')).rejects.toThrow(/3/);
    expect(manager.findOne).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        where: { id: 1 },
        lock: { mode: 'pessimistic_write' },
      }),
    );
    expect(manager.count).toHaveBeenCalledWith(expect.anything(), {
      where: { userId: 1 },
    });
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('uses the configured per-player limit', async () => {
    const { service, manager } = setup(5);
    manager.count.mockResolvedValue(3);
    await expect(service.create(1, 4, 'Entwurf')).resolves.toMatchObject({
      id: 10,
    });
  });

  it('rejects missing or foreign source colonies', async () => {
    const { service, manager } = setup();
    manager.findOne.mockImplementation(async (entity: { name: string }) =>
      entity.name === 'User' ? { id: 1 } : null,
    );
    await expect(service.create(1, 4, 'Entwurf')).rejects.toThrow(/Kolonie/);
    expect(manager.save).not.toHaveBeenCalled();
  });

  it.each(['', '   ', 'x'.repeat(101)])(
    'rejects invalid sandbox name %s',
    async (name) => {
      const { service, manager } = setup();
      await expect(service.create(1, 4, name)).rejects.toThrow(/Name/);
      expect(manager.save).not.toHaveBeenCalled();
    },
  );

  it('lists only the current player’s sandboxes and excludes snapshots from the list response', async () => {
    const { service, repository } = setup();
    repository.find.mockResolvedValue([
      {
        id: 10,
        userId: 1,
        name: 'Plan',
        sourceColonyId: 4,
        snapshot: { sourceColonyName: 'Naboo', fields: [] },
        createdAt: new Date(),
      },
    ]);
    const result = await service.list(1);
    expect(repository.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 1 } }),
    );
    expect(result.limit).toBe(3);
    expect(result.sandboxes[0]).not.toHaveProperty('snapshot');
  });

  it('authorizes detail, rename and deletion against the sandbox owner', async () => {
    const { service, repository } = setup();
    repository.findOne.mockResolvedValue(null);
    await expect(service.get(2, 10)).rejects.toThrow(/Sandbox/);
    await expect(service.rename(2, 10, 'Other')).rejects.toThrow(/Sandbox/);
    expect(repository.save).not.toHaveBeenCalled();
    repository.delete.mockResolvedValue({ affected: 0 });
    await expect(service.remove(2, 10)).rejects.toThrow(/Sandbox/);
    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: 10, userId: 2 },
    });
    expect(repository.delete).toHaveBeenCalledWith({ id: 10, userId: 2 });
  });

  it('masks unknown underground terrain while preserving the internal snapshot', async () => {
    const { service, unlocks, repository, fields } = setup();
    unlocks.hasTechByName.mockResolvedValue(false);
    repository.findOne.mockResolvedValue({
      id: 10,
      userId: 1,
      name: 'Plan',
      sourceColonyId: 4,
      createdAt: new Date(),
      snapshot: { sourceColonyName: 'Naboo', fields },
    });
    const result = await service.get(1, 10);
    expect(result.snapshot.fields[2]).toMatchObject({
      locked: true,
      fieldType: 0,
      terrainTileId: null,
      buildingId: null,
    });
    expect(fields[2].buildingId).toBe(8);
  });
});
