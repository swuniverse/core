import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { EngineeringAmountDto } from './engineering-amount.dto';
import { AdminSpawnShipDto } from './admin-spawn-ship.dto';

describe('EngineeringAmountDto', () => {
  it.each([
    ['MAX', 'MAX'],
    ['3', 3],
    [3, 3],
  ])('accepts %p', async (input, expected) => {
    const dto = plainToInstance(EngineeringAmountDto, { amount: input });
    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.amount).toBe(expected);
  });

  it.each([0, -1, 'invalid'])('rejects %p', async (amount) => {
    const dto = plainToInstance(EngineeringAmountDto, { amount });
    expect(await validate(dto)).not.toHaveLength(0);
  });
});

describe('AdminSpawnShipDto', () => {
  it('accepts a bounded preset and nested module selections', async () => {
    const dto = plainToInstance(AdminSpawnShipDto, {
      userId: 1,
      shipClassId: 2,
      layerId: 3,
      posX: 4,
      posY: 5,
      preset: 'damaged',
      modules: [{ slotId: 'core', commodityId: 7 }],
    });
    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects invalid presets and module ids', async () => {
    const dto = plainToInstance(AdminSpawnShipDto, {
      userId: 1,
      shipClassId: 2,
      layerId: 3,
      posX: 4,
      posY: 5,
      preset: 'unknown',
      modules: [{ slotId: '', commodityId: 0 }],
    });
    expect(await validate(dto)).not.toHaveLength(0);
  });
});
