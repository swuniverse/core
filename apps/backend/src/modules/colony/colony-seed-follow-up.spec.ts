import path from 'node:path';
import { GameDataService } from '../game-data/game-data.service';
import { ColonySeedService } from './colony-seed.service';

process.env.GAME_DATA_PATH = path.resolve(
  process.cwd(),
  process.cwd().endsWith('apps/backend') ? '../../game-data/data' : 'game-data/data',
);

describe('colony class start fields and follow-up start values', () => {
  let gameData: GameDataService;
  beforeAll(() => {
    gameData = new GameDataService();
    gameData.onModuleInit();
  });

  it('loads colonizeableFields per class; asteroids have none', () => {
    expect(gameData.getColonizeableFields(201)).toEqual([101]);
    expect(gameData.getColonizeableFields(221)).toEqual([946]);
    expect(gameData.getColonizeableFields(207)).toEqual([]);
    expect(gameData.getColonizeableFields(701)).toBeUndefined();
    expect(gameData.getColonyClass(205)?.colonizeableFieldsSource).toBe('swu-derived');
  });

  it('starts a follow-up colony with building EPS, housing and the name "Kolonie"', async () => {
    const building = gameData.getBuilding(81010100)!;
    const colonyRepo = {
      create: jest.fn((v) => ({ id: 5, ...v })),
      save: jest.fn(async (v) => v),
    };
    const fieldRepo = {
      create: jest.fn((v) => v),
      save: jest.fn(async (v) => v),
      find: jest.fn(async () => []),
    };
    const sink = { create: jest.fn((v) => v), save: jest.fn(async (v) => v) };
    const storageRepo = { create: jest.fn((v) => v), save: jest.fn(async (v) => v) };
    const objectRepo = {
      findOne: jest.fn(async () => ({
        id: 7, classId: 401, systemId: 1, posX: 1, posY: 1, objectType: 1, starSystem: { bonusFields: 2 },
      })),
    };
    const service = new ColonySeedService(
      colonyRepo as never, fieldRepo as never, storageRepo as never, sink as never, sink as never,
      sink as never, objectRepo as never, { findOneBy: jest.fn(async () => null) } as never, gameData,
    );

    await service.createFollowUpColony({ userId: 1, username: 'Luke', celestialObjectId: 7, buildingId: 81010100 });

    const colony = colonyRepo.create.mock.calls[0][0];
    expect(colony.name).toBe('Kolonie');
    expect(colony.energy).toBe(building.bonuses.energy);
    expect(colony.population).toBe(building.bevPro);
    expect(storageRepo.save.mock.calls[0][0]).toEqual([
      expect.objectContaining({ commodityId: 2, amount: 150 }),
    ]);
  });
});
