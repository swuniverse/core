jest.mock('../starmap/starmap-query.service', () => ({ StarmapQueryService: class {} }));
jest.mock('../starmap/exploration.service', () => ({ ExplorationService: class {} }));
jest.mock('./colony-ownership.service', () => ({ ColonyOwnershipService: class {} }));
jest.mock('./colony-function-manager.service', () => ({
  ColonyFunctionManagerService: class {},
}));
jest.mock('../starmap/entities/layer.entity', () => ({ Layer: class {} }));

import { BadRequestException } from '@nestjs/common';
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
  );
  return { service, starmapQuery };
}

describe('ColonyTelescopeService', () => {
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
