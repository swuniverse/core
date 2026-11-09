jest.mock('../spacecraft/entities/spacecraft-wreck.entity', () => ({
  SpacecraftWreck: class SpacecraftWreck {},
}));

import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SpacecraftWreck } from '../spacecraft/entities/spacecraft-wreck.entity';
import {
  WRECK_DECAY_RANDOM_TOKEN,
  WreckDecayService,
} from './wreck-decay.service';

describe('WreckDecayService', () => {
  it('can be initialized by Nest with the default damage function', async () => {
    await expect(
      Test.createTestingModule({
        providers: [
          WreckDecayService,
          { provide: getRepositoryToken(SpacecraftWreck), useValue: {} },
          { provide: WRECK_DECAY_RANDOM_TOKEN, useValue: () => 5 },
        ],
      }).compile(),
    ).resolves.toBeDefined();
  });

  const wreckRepo = {
    find: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  it('reduces every wreck by deterministic 5-15 hull damage', async () => {
    const wrecks = [{ id: 1, hull: 20 }, { id: 2, hull: 30 }];
    wreckRepo.find.mockResolvedValue(wrecks);
    const randomDamage = jest.fn().mockReturnValueOnce(5).mockReturnValueOnce(15);
    const service = new WreckDecayService(wreckRepo as never, randomDamage);

    await service.processTick();

    expect(wrecks).toEqual([{ id: 1, hull: 15 }, { id: 2, hull: 15 }]);
    expect(wreckRepo.save).toHaveBeenCalledWith(wrecks);
    expect(wreckRepo.remove).not.toHaveBeenCalled();
  });

  it('deletes depleted wrecks together with their stored contents', async () => {
    const wreck = {
      id: 1,
      hull: 10,
      cargo: [{ commodityId: 1, amount: 4 }],
      modules: [{ commodityId: 2, amount: 1 }],
      torpedoes: [{ torpedoTypeId: 3, commodityId: 4, amount: 2 }],
    };
    wreckRepo.find.mockResolvedValue([wreck]);
    const service = new WreckDecayService(wreckRepo as never, () => 10);

    await service.processTick();

    expect(wreckRepo.remove).toHaveBeenCalledWith([wreck]);
    expect(wreckRepo.save).not.toHaveBeenCalled();
  });
});
