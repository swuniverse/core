jest.mock('../starmap/starmap-query.service', () => ({ StarmapQueryService: class {} }));
jest.mock('../starmap/exploration.service', () => ({ ExplorationService: class {} }));
jest.mock('./colony-ownership.service', () => ({ ColonyOwnershipService: class {} }));
jest.mock('./colony-function-manager.service', () => ({
  ColonyFunctionManagerService: class {},
}));
jest.mock('../starmap/entities/layer.entity', () => ({ Layer: class {} }));

import { BadRequestException } from '@nestjs/common';
import { Not } from 'typeorm';

jest.mock('../spacecraft/entities/spacecraft.entity', () => ({
  Spacecraft: class Spacecraft {},
  SpacecraftKind: { SHIP: 'SHIP' },
  SpacecraftStatus: { IDLE: 'IDLE', DESTROYED: 'DESTROYED' },
}));
jest.mock('./entities/colony.entity', () => ({ Colony: class Colony {} }));

import { ColonyTelescopeService, calculateTelescopeEnergyCost } from './colony-telescope.service';

const colony = {
  id: 1,
  fields: [{ id: 1, buildingId: 100060100, isBuilding: false, isActive: true }],
  starSystem: { id: 7, cx: 1, cy: 1, layerId: 3 },
  changeable: { energy: 123 },
} as any;

function createService(active = true) {
  const starmapQuery = {
    getExploredSectorFields: jest.fn().mockResolvedValue({ fields: [], hiddenCount: 0 }),
  };
  const colonyRepo = { save: jest.fn(async (value) => value) };
  const shipRepo = {
    find: jest.fn().mockResolvedValue([
      { status: 'IDLE', kind: 'SHIP', shipClass: { category: 'Jäger' } },
      { status: 'IDLE', kind: 'SHIP', shipClass: { category: 'Jäger' } },
      { status: 'IDLE', kind: 'SHIP', shipClass: { category: 'Kreuzer' } },
      { status: 'DESTROYED', kind: 'SHIP', shipClass: { category: 'Wrack' } },
      { status: 'IDLE', kind: 'STATION', shipClass: { category: 'STATION' } },
    ]),
  };
  const service = new ColonyTelescopeService(
    { findOwnedColony: jest.fn().mockResolvedValue(colony) } as any,
    { getPresentFunctionIds: jest.fn().mockReturnValue(active ? [31] : []) } as any,
    {
      findOneBy: jest
        .fn()
        .mockResolvedValue({ id: 3, width: 101, height: 101, sectorSize: 20 }),
    } as any,
    starmapQuery as any,
    {} as any,
    colonyRepo as any,
    shipRepo as any,
  );
  return { service, starmapQuery, colonyRepo, shipRepo };
}

describe('ColonyTelescopeService', () => {
  beforeEach(() => { colony.changeable.energy = 123; });

  it('scans current ship and station counts by hull category and deducts energy', async () => {
    const { service, colonyRepo, shipRepo } = createService();

    await expect(service.scan(1, 9, { targetX: 51, targetY: 51 })).resolves.toEqual({
      target: { x: 51, y: 51 },
      energy: { available: 13, spent: 110 },
      categories: [
        { category: 'Jäger', amount: 2 },
        { category: 'Kreuzer', amount: 1 },
        { category: 'STATION', amount: 1 },
      ],
    });

    expect(shipRepo.find).toHaveBeenCalledWith({
      where: {
        status: Not('DESTROYED'),
        rpgHidden: false,
        location: { galaxyField: { layerId: 3, cx: 51, cy: 51 } },
      },
      relations: ['shipClass'],
    });
    expect(colony.changeable.energy).toBe(13);
    expect(colonyRepo.save).toHaveBeenCalledWith(colony);
  });

  it('rejects a scan without enough energy and does not query ships', async () => {
    colony.changeable.energy = 10;
    const { service, colonyRepo, shipRepo } = createService();

    await expect(service.scan(1, 9, { targetX: 51, targetY: 51 })).rejects.toThrow(
      'Nicht genug Energie: benötigt 110, vorhanden 10',
    );

    expect(shipRepo.find).not.toHaveBeenCalled();
    expect(colonyRepo.save).not.toHaveBeenCalled();
    expect(colony.changeable.energy).toBe(10);
  });

  it.each(['IDLE', 'IN_COMBAT', 'UNDER_CONSTRUCTION', 'UNDER_SCRAPPING', 'FLYING', 'REPAIRING'])(
    'counts an uncloaked ship in status %s', async status => {
      const { service, shipRepo } = createService();
      shipRepo.find.mockResolvedValue([
        { status, kind: 'SHIP', shipClass: { category: 'FRIGATE' }, runtimeSystems: { CLOAK: { active: false } } },
      ]);
      const result = await service.scan(1, 9, { targetX: 1, targetY: 1 });
      expect(result.categories).toEqual([{ category: 'FRIGATE', amount: 1 }]);
    },
  );

  it('excludes cloaked spacecraft owned by the viewer as well as other owners', async () => {
    const { service, shipRepo } = createService();
    const visibleShip = { userId: 9, status: 'IDLE', kind: 'SHIP', shipClass: { category: 'FIGHTER' }, runtimeSystems: {} };
    const visibleStation = { userId: 3, status: 'UNDER_CONSTRUCTION', kind: 'STATION', shipClass: { category: 'STATION' }, runtimeSystems: {} };
    shipRepo.find.mockResolvedValue([
      visibleShip,
      visibleStation,
      { ...visibleShip, runtimeSystems: { CLOAK: { active: true } } },
      { ...visibleShip, userId: 3, runtimeSystems: { CLOAK: { active: true } } },
      { ...visibleStation, userId: 9, runtimeSystems: { CLOAK: { active: true } } },
      { ...visibleStation, runtimeSystems: { CLOAK: { active: true } } },
    ]);
    const result = await service.scan(1, 9, { targetX: 1, targetY: 1 });
    expect(result.categories).toEqual([
      { category: 'FIGHTER', amount: 1 },
      { category: 'STATION', amount: 1 },
    ]);
  });

  it('returns no category or count when every spacecraft is cloaked or destroyed', async () => {
    const { service, shipRepo } = createService();
    shipRepo.find.mockResolvedValue([
      { status: 'IDLE', kind: 'SHIP', shipClass: { category: 'FIGHTER' }, runtimeSystems: { CLOAK: { active: true } } },
      { status: 'DESTROYED', kind: 'STATION', shipClass: { category: 'STATION' }, runtimeSystems: {} },
    ]);
    expect((await service.scan(1, 9, { targetX: 1, targetY: 1 })).categories).toEqual([]);
  });

  it('preserves administrative RPG hiding for the owner and other viewers', async () => {
    const { service, shipRepo } = createService();
    shipRepo.find.mockResolvedValue([
      { userId: 9, status: 'IDLE', kind: 'SHIP', rpgHidden: true, shipClass: { category: 'FIGHTER' } },
      { userId: 3, status: 'IDLE', kind: 'STATION', rpgHidden: true, shipClass: { category: 'STATION' } },
    ]);
    expect((await service.scan(1, 9, { targetX: 1, targetY: 1 })).categories).toEqual([]);
  });

  it('allows scanning with exactly the required energy', async () => {
    colony.changeable.energy = 110;
    const { service, colonyRepo } = createService();
    const result = await service.scan(1, 9, { targetX: 51, targetY: 51 });
    expect(result.energy).toEqual({ available: 0, spent: 110 });
    expect(colonyRepo.save).toHaveBeenCalledWith(colony);
  });

  it('uses the STU cost formula at origin, midpoint, and opposite corner', () => {
    expect(calculateTelescopeEnergyCost(1, 1, 1, 1, 101, 101)).toBe(20);
    expect(calculateTelescopeEnergyCost(1, 1, 51, 51, 101, 101)).toBe(110);
    expect(calculateTelescopeEnergyCost(1, 1, 101, 101, 101, 101)).toBe(200);
  });

  it('keeps STU ceil-before-scaling behavior for diagonal distance', () => {
    expect(calculateTelescopeEnergyCost(1, 1, 2, 2, 101, 101)).toBe(23);
  });

  it('requires building function 31', async () => {
    const { service } = createService(false);
    await expect(service.getView(1, 2, {})).rejects.toThrow(
      new BadRequestException('Subspace telescope required'),
    );
  });

  it('delegates map visibility to the explored-sector redaction contract', async () => {
    const { service, starmapQuery } = createService();
    await service.getView(1, 2, { targetX: 51, targetY: 51 });
    expect(starmapQuery.getExploredSectorFields).toHaveBeenCalledWith(
      2,
      3,
      0,
      0,
      expect.anything(),
    );
  });
});
