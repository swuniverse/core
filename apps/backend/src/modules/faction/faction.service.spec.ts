jest.mock('./entities/faction.entity', () => ({
  FactionEntity: class FactionEntity {},
}));
jest.mock('./entities/faction-modifier.entity', () => ({
  FactionModifier: class FactionModifier {},
}));
jest.mock('../auth/user.entity', () => ({ User: class User {} }));

import { FactionService } from './faction.service';

describe('FactionService', () => {
  it('updates faction selectability without changing other faction data', async () => {
    const faction = {
      id: 2,
      key: 'GALACTIC_EMPIRE',
      name: 'Galaktisches Imperium',
      isSelectable: true,
    };
    const factionRepo = {
      findOneBy: jest.fn(async () => faction),
      save: jest.fn(async (value) => value),
    };
    const service = new FactionService(
      factionRepo as never,
      {} as never,
      {} as never,
    );

    await expect(service.updateSelectability(2, false)).resolves.toEqual({
      ...faction,
      isSelectable: false,
    });
    expect(factionRepo.save).toHaveBeenCalledWith({
      id: 2,
      key: 'GALACTIC_EMPIRE',
      name: 'Galaktisches Imperium',
      isSelectable: false,
    });
  });
});
