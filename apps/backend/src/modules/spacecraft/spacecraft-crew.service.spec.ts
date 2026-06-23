jest.mock('../colony/entities/crew-assignment.entity', () => ({
  CrewAssignment: class CrewAssignment {},
}));
jest.mock('./entities/spacecraft.entity', () => ({
  Spacecraft: class Spacecraft {},
}));
jest.mock('./ship-class.service', () => ({
  ShipClassService: class ShipClassService {},
}));

import { SpacecraftCrewService } from './spacecraft-crew.service';

function createService() {
  const crewAssignmentRepo = { count: jest.fn(async () => 0) };
  const shipRepo = { save: jest.fn(async (value) => value) };
  const shipClassService = { findById: jest.fn(async () => ({ crewMin: 2 })) };
  const service = new SpacecraftCrewService(
    crewAssignmentRepo as any,
    shipRepo as any,
    shipClassService as any,
  );
  return { service, crewAssignmentRepo, shipRepo, shipClassService };
}

describe('SpacecraftCrewService', () => {
  it('checks assigned crew count against required ship class crew', async () => {
    const { service, crewAssignmentRepo } = createService();
    crewAssignmentRepo.count.mockResolvedValue(1);
    await expect(
      service.hasEnoughCrew({ id: 10, shipClassId: 1 } as any),
    ).resolves.toBe(false);
    crewAssignmentRepo.count.mockResolvedValue(2);
    await expect(
      service.hasEnoughCrew({ id: 10, shipClassId: 1 } as any),
    ).resolves.toBe(true);
  });

  it('syncs the legacy ship crew cache from assignments', async () => {
    const { service, crewAssignmentRepo, shipRepo } = createService();
    crewAssignmentRepo.count.mockResolvedValue(4);
    const ship = { id: 10, shipClassId: 1, crew: 0 } as any;
    await service.syncCrewCache(ship);
    expect(ship.crew).toBe(4);
    expect(shipRepo.save).toHaveBeenCalledWith(ship);
  });
});
