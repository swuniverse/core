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
  const crewAssignmentRepo = {
    count: jest.fn(async () => 0),
    find: jest.fn(async () => []),
  };
  const shipRepo = { save: jest.fn(async (value) => value) };
  const gameData = { getAllFabricationItems: jest.fn(() => []) };
  const service = new SpacecraftCrewService(
    crewAssignmentRepo as any,
    shipRepo as any,
    gameData as any,
  );
  return { service, crewAssignmentRepo, shipRepo, gameData };
}

describe('SpacecraftCrewService', () => {
  it('checks assigned crew count against required ship class crew', async () => {
    const { service, crewAssignmentRepo } = createService();
    crewAssignmentRepo.count.mockResolvedValue(1);
    await expect(
      service.hasEnoughCrew({ id: 10, crewRequired: 2 } as any),
    ).resolves.toBe(false);
    crewAssignmentRepo.count.mockResolvedValue(2);
    await expect(
      service.hasEnoughCrew({ id: 10, crewRequired: 2 } as any),
    ).resolves.toBe(true);
  });

  it('returns the authoritative assigned crew roster', async () => {
    const { service, crewAssignmentRepo } = createService();
    crewAssignmentRepo.find.mockResolvedValue([
      {
        crewId: 4,
        slot: 'COMMAND',
        crew: { name: 'Leia', type: 'CAPTAIN' },
      },
    ] as never);
    await expect(service.getAssignedCrew(10)).resolves.toEqual([
      { id: 4, name: 'Leia', position: 'COMMAND', rank: 'CAPTAIN' },
    ]);
  });

  it('syncs the legacy ship crew cache from assignments', async () => {
    const { service, crewAssignmentRepo, shipRepo } = createService();
    crewAssignmentRepo.count.mockResolvedValue(4);
    const ship = { id: 10, shipClassId: 1, crew: 0 } as any;
    await service.syncCrewCache(ship);
    expect(ship.crew).toBe(4);
    expect(shipRepo.save).toHaveBeenCalledWith(ship);
  });

  it('uses STU module crew instead of module capacity values', () => {
    const { service } = createService();
    expect(
      service.calculateRequiredCrew(0, [
        { moduleType: 'Sensorphalanx', level: 1 } as any,
      ]),
    ).toBe(0);
  });

  it('uses persisted buildplan crew at runtime regardless of module crew', async () => {
    const { service, gameData } = createService();
    gameData.getAllFabricationItems.mockReturnValue([
      {
        moduleType: 'Standard-Deflektorschild',
        moduleLevel: 1,
        shipyardModuleStats: { crew: 1 },
      },
    ]);
    await expect(
      service.getRequiredCrew({
        id: 10,
        crewRequired: 0,
        modules: [{ moduleType: 'Standard-Deflektorschild', level: 1 }],
      } as any),
    ).resolves.toBe(0);
  });
});
