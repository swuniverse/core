jest.mock('./entities/faction.entity', () => ({
  FactionEntity: class FactionEntity {},
}));
jest.mock('./entities/faction-modifier.entity', () => ({
  FactionModifier: class FactionModifier {},
}));
jest.mock('../auth/user.entity', () => ({ User: class User {} }));

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { FactionService } from './faction.service';
import { UpdateFactionPlayerLimitDto } from './dto/update-faction-player-limit.dto';

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

describe('UpdateFactionPlayerLimitDto', () => {
  it.each([
    [0, true],
    [25, true],
    [-1, false],
    [1.5, false],
  ])('playerLimit %p valid: %p', async (playerLimit, valid) => {
    const errors = await validate(
      plainToInstance(UpdateFactionPlayerLimitDto, { playerLimit }),
    );
    expect(errors.length === 0).toBe(valid);
  });
});
