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
    findOne: jest.fn(),
    save: jest.fn(async (value) => value),
    delete: jest.fn<Promise<any>, any[]>(async () => ({})),
  };
  const crewRepo = {
    save: jest.fn(async (value) => value),
    delete: jest.fn<Promise<any>, any[]>(async () => ({})),
  };
  const shipRepo = {
    findOne: jest.fn(),
    save: jest.fn(async (value) => value),
  };
  const crewSkillRepo = { find: jest.fn(async () => []) };
  const shipClassRepo = { findOneBy: jest.fn() };
  const gameData: {
    getAllFabricationItems: jest.Mock;
    getShipClassDefByKey?: jest.Mock;
    getShipyardRumpCrew?: jest.Mock;
  } = {
    getAllFabricationItems: jest.fn(() => []),
  };
  const service = new SpacecraftCrewService(
    crewAssignmentRepo as any,
    crewRepo as any,
    shipRepo as any,
    crewSkillRepo as any,
    shipClassRepo as any,
    gameData as any,
  );
  return {
    service,
    crewAssignmentRepo,
    crewRepo,
    shipRepo,
    crewSkillRepo,
    shipClassRepo,
    gameData,
  };
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

  it('returns crew positions with hull targets and unassigned crew', async () => {
    const { service, crewAssignmentRepo, shipRepo, shipClassRepo, gameData } =
      createService();
    shipRepo.findOne.mockResolvedValue({
      id: 10,
      userId: 7,
      shipClassId: 3,
      status: 'IDLE',
    });
    shipClassRepo.findOneBy.mockResolvedValue({
      id: 3,
      key: 'REBEL_CRUISER',
    });
    gameData.getShipClassDefByKey = jest.fn(() => ({ stuRumpId: 2101 }));
    gameData.getShipyardRumpCrew = jest.fn(() => ({
      positions: {
        CAPTAIN: 1,
        COMMAND: 1,
        SECURITY: 2,
        SCIENCE: 1,
        TECHNICAL: 1,
        NAVIGATION: 1,
      },
    }));
    crewAssignmentRepo.find.mockResolvedValue([
      {
        crewId: 4,
        slot: 'CAPTAIN',
        crew: {
          name: 'Leia',
          type: 'CAPTAIN',
          gender: 'FEMALE',
          originColony: { id: 8, name: 'Alderaan' },
        },
      },
      {
        crewId: 5,
        slot: null,
        crew: {
          name: 'Han',
          type: 'CREWMAN',
          gender: 'MALE',
          originColony: null,
        },
      },
    ] as never);

    const result = await service.getCrewManagement(10, 7);

    expect(result.positions.find((position) => position.slot === 'CAPTAIN')).toEqual(
      expect.objectContaining({ target: 1, crew: [expect.objectContaining({ id: 4 })] }),
    );
    expect(result.positions.find((position) => position.slot === 'SECURITY')).toEqual(
      expect.objectContaining({ target: 2, crew: [] }),
    );
    expect(result.unassignedCrew).toEqual([
      expect.objectContaining({ id: 5, name: 'Han', position: null }),
    ]);
  });

  it('rejects another owner and position assignments beyond the hull target', async () => {
    const { service, crewAssignmentRepo, shipRepo, shipClassRepo, gameData } =
      createService();
    shipRepo.findOne.mockResolvedValueOnce(null).mockResolvedValue({
      id: 10,
      userId: 7,
      shipClassId: 3,
      status: 'IDLE',
    });
    await expect(service.assignSlot(10, 4, 99, 'CAPTAIN' as any)).rejects.toThrow(
      'Spacecraft not found',
    );

    shipClassRepo.findOneBy.mockResolvedValue({ id: 3, key: 'REBEL_CRUISER' });
    gameData.getShipClassDefByKey = jest.fn(() => ({ stuRumpId: 2101 }));
    gameData.getShipyardRumpCrew = jest.fn(() => ({
      positions: { CAPTAIN: 1 },
    }));
    crewAssignmentRepo.findOne.mockResolvedValue({
      crewId: 4,
      userId: 7,
      spacecraftId: 10,
      slot: null,
    });
    crewAssignmentRepo.count.mockResolvedValue(1);

    await expect(service.assignSlot(10, 4, 7, 'CAPTAIN' as any)).rejects.toThrow(
      'Crew position is full',
    );
  });

  it('blocks slot and name changes while the ship is in flight', async () => {
    const { service, shipRepo } = createService();
    shipRepo.findOne.mockResolvedValue({
      id: 10,
      userId: 7,
      shipClassId: 3,
      status: 'IN_FLIGHT',
    });

    await expect(service.assignSlot(10, 4, 7, null)).rejects.toThrow(
      'Crew cannot be changed during flight',
    );
    await expect(service.renameCrewMember(10, 4, 7, 'Luke')).rejects.toThrow(
      'Crew cannot be changed during flight',
    );
  });

  it('renames the complete crew and individual crew members with trimmed names', async () => {
    const { service, crewAssignmentRepo, crewRepo, shipRepo } = createService();
    shipRepo.findOne.mockResolvedValue({
      id: 10,
      userId: 7,
      shipClassId: 3,
      status: 'IDLE',
    });
    const crew = { id: 4, name: 'Crew 4' };
    crewAssignmentRepo.findOne.mockResolvedValue({
      crewId: 4,
      userId: 7,
      spacecraftId: 10,
      crew,
    });
    crewAssignmentRepo.find.mockResolvedValue([
      { crewId: 4, userId: 7, spacecraftId: 10, crew },
      { crewId: 5, userId: 7, spacecraftId: 10, crew: { id: 5, name: 'Crew 5' } },
    ] as never);

    await service.renameCrewMember(10, 4, 7, '  Luke Skywalker  ');
    expect(crewRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Luke Skywalker' }),
    );

    await service.renameCrew(10, 7, '  Rogue  ');
    expect(crewRepo.save).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Rogue 1' }),
        expect.objectContaining({ name: 'Rogue 2' }),
      ]),
    );
  });

  it('returns expertise, automatic rank and promotion eligibility for crew management', async () => {
    const { service, crewAssignmentRepo, crewSkillRepo, shipRepo, shipClassRepo } = createService();
    shipRepo.findOne.mockResolvedValue({
      id: 10,
      userId: 7,
      shipClassId: 3,
      status: 'IDLE',
    });
    shipClassRepo.findOneBy.mockResolvedValue({ id: 3, key: 'REBEL_CRUISER' });
    crewSkillRepo.find.mockResolvedValue([
      { crewId: 4, position: 'COMMAND', expertise: 10_000 },
    ] as never);
    crewAssignmentRepo.find.mockResolvedValue([
      {
        crewId: 4,
        slot: 'COMMAND',
        crew: {
          name: 'Leia',
          type: 'CAPTAIN',
          gender: 'FEMALE',
          rank: 'LIEUTENANT_COMMANDER',
        },
      },
    ] as never);

    const result = await service.getCrewManagement(10, 7);

    expect(result.positions[1].crew[0]).toEqual(
      expect.objectContaining({
        rank: 'LIEUTENANT_COMMANDER',
        rankLabel: 'Oberleutnant',
        expertise: [{ position: 'COMMAND', amount: 10_000 }],
        promotion: { rank: 'COMMANDER', label: 'Commander' },
      }),
    );
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
