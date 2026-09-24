jest.mock('../prestige/prestige.service', () => ({
  PrestigeService: class PrestigeService {},
}));
jest.mock('./entities/ship-class-discovery.entity', () => ({
  ShipClassDiscovery: class ShipClassDiscovery {},
}));
jest.mock('./entities/ship-class-def.entity', () => ({
  ShipClassDef: class ShipClassDef {},
}));

import { ShipClassDiscoveryService } from './ship-class-discovery.service';
import { STU_PRESTIGE } from '../prestige/prestige.constants';

function createService(raw: Array<{ id: number }>) {
  const query = {
    insert: jest.fn().mockReturnThis(),
    into: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    orIgnore: jest.fn().mockReturnThis(),
    returning: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ raw }),
  };
  const manager = {
    findOneByOrFail: jest.fn().mockResolvedValue({ id: 4, name: 'Ikarus' }),
    createQueryBuilder: jest.fn().mockReturnValue(query),
  };
  const prestigeService = { change: jest.fn().mockResolvedValue(undefined) };
  const service = new ShipClassDiscoveryService(
    { transaction: (work: (entityManager: unknown) => unknown) => work(manager) } as never,
    {} as never,
    prestigeService as never,
  );
  return { service, manager, prestigeService };
}

describe('ShipClassDiscoveryService', () => {
  it('awards prestige only when the hull discovery insert succeeds', async () => {
    const { service, prestigeService } = createService([{ id: 1 }]);

    await expect(
      service.discover({
        userId: 1,
        shipClassId: 4,
        sourceSpacecraftId: 7,
        targetSpacecraftId: 8,
      }),
    ).resolves.toEqual({
      discovered: true,
      prestigeAwarded: STU_PRESTIGE.SCAN_SHIP_HULL,
      name: 'Ikarus',
    });
    expect(prestigeService.change).toHaveBeenCalledWith(
      1,
      STU_PRESTIGE.SCAN_SHIP_HULL,
      '5 Prestige erhalten für die Entdeckung des Schiffsrumpfs „Ikarus“',
      expect.anything(),
    );
  });

  it('does not award prestige when the unique discovery already exists', async () => {
    const { service, prestigeService } = createService([]);

    await expect(
      service.discover({
        userId: 1,
        shipClassId: 4,
        sourceSpacecraftId: 7,
        targetSpacecraftId: 8,
      }),
    ).resolves.toEqual({
      discovered: false,
      prestigeAwarded: 0,
      name: 'Ikarus',
    });
    expect(prestigeService.change).not.toHaveBeenCalled();
  });
});
