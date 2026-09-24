jest.mock('../prestige/prestige.service', () => ({
  PrestigeService: class PrestigeService {},
}));
jest.mock('./entities/system-type-discovery.entity', () => ({
  SystemTypeDiscovery: class SystemTypeDiscovery {},
}));
jest.mock('./starmap-system-types', () => ({
  SYSTEM_TYPE_BY_ID: { 1: { id: 1, name: 'Gelber Stern' } },
}));

import { SystemTypeDiscoveryService } from './system-type-discovery.service';
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
  const manager = { createQueryBuilder: jest.fn().mockReturnValue(query) };
  const prestigeService = { change: jest.fn().mockResolvedValue(undefined) };
  const service = new SystemTypeDiscoveryService(
    { transaction: (work: (entityManager: unknown) => unknown) => work(manager) } as never,
    {} as never,
    prestigeService as never,
  );
  return { service, prestigeService };
}

describe('SystemTypeDiscoveryService', () => {
  const input = {
    userId: 1,
    systemTypeId: 1,
    source: 'SECTOR_SCAN' as const,
    spacecraftId: 7,
    layerId: 2,
    x: 4,
    y: 5,
  };

  it('awards prestige only for the inserted system type discovery', async () => {
    const { service, prestigeService } = createService([{ id: 1 }]);

    await expect(service.discover(input)).resolves.toEqual({
      discovered: true,
      prestigeAwarded: STU_PRESTIGE.DISCOVER_SYSTEM_TYPE,
      name: 'Gelber Stern',
    });
    expect(prestigeService.change).toHaveBeenCalledWith(
      1,
      STU_PRESTIGE.DISCOVER_SYSTEM_TYPE,
      '5 Prestige erhalten für die Entdeckung des Sternensystemtyps „Gelber Stern“',
      expect.anything(),
    );
  });

  it('does not award prestige when the unique system type discovery exists', async () => {
    const { service, prestigeService } = createService([]);

    await expect(service.discover(input)).resolves.toEqual({
      discovered: false,
      prestigeAwarded: 0,
      name: 'Gelber Stern',
    });
    expect(prestigeService.change).not.toHaveBeenCalled();
  });
});
