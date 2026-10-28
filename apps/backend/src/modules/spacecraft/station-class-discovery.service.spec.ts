jest.mock('../prestige/prestige.service', () => ({
  PrestigeService: class PrestigeService {},
}));
jest.mock('./entities/station-class-discovery.entity', () => ({
  StationClassDiscovery: class StationClassDiscovery {},
}));
jest.mock('./entities/ship-class-def.entity', () => ({
  ShipClassDef: class ShipClassDef {},
}));

import { StationClassDiscoveryService } from './station-class-discovery.service';
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
    findOneByOrFail: jest.fn().mockResolvedValue({ id: 4, name: 'Raumwerft' }),
    createQueryBuilder: jest.fn().mockReturnValue(query),
  };
  const prestigeService = { change: jest.fn().mockResolvedValue(undefined) };
  const service = new StationClassDiscoveryService(
    { transaction: (work: (entityManager: unknown) => unknown) => work(manager) } as never,
    {} as never,
    prestigeService as never,
  );
  return { service, prestigeService };
}

describe('StationClassDiscoveryService', () => {
  it('awards station hull prestige only for the first scan', async () => {
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
      prestigeAwarded: STU_PRESTIGE.SCAN_STATION_HULL,
      name: 'Raumwerft',
    });
    expect(prestigeService.change).toHaveBeenCalledWith(
      1,
      STU_PRESTIGE.SCAN_STATION_HULL,
      '5 Prestige erhalten für die Entdeckung des Stationsrumpfs „Raumwerft“',
      expect.anything(),
    );
  });

  it('does not award prestige when the station hull is already discovered', async () => {
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
      name: 'Raumwerft',
    });
    expect(prestigeService.change).not.toHaveBeenCalled();
  });
});
