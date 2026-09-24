jest.mock('@swuniverse/shared', () => ({
  getStuCelestialClass: jest.fn((id: number) =>
    id === 201
      ? { id, name: 'Klasse M', colonization: 'STARTER' }
      : undefined,
  ),
}));
jest.mock('../prestige/prestige.service', () => ({
  PrestigeService: class PrestigeService {},
}));
jest.mock('./entities/celestial-class-discovery.entity', () => ({
  CelestialClassDiscovery: class CelestialClassDiscovery {},
}));

import { CelestialClassDiscoveryService } from './celestial-class-discovery.service';
import { STU_PRESTIGE } from '../prestige/prestige.constants';

describe('CelestialClassDiscoveryService', () => {
  it('does not award prestige when the unique class discovery already exists', async () => {
    const query = {
      insert: jest.fn().mockReturnThis(),
      into: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      orIgnore: jest.fn().mockReturnThis(),
      returning: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ raw: [] }),
    };
    const manager = { createQueryBuilder: jest.fn().mockReturnValue(query) };
    const prestigeService = { change: jest.fn().mockResolvedValue(undefined) };
    const service = new CelestialClassDiscoveryService(
      { transaction: (work: (entityManager: unknown) => unknown) => work(manager) } as never,
      {} as never,
      prestigeService as never,
    );

    await expect(
      service.discover({ userId: 1, classId: 201, celestialObjectId: 3, spacecraftId: 7 }),
    ).resolves.toEqual({
      discovered: false,
      prestigeAwarded: 0,
      name: 'Klasse M',
    });
    expect(prestigeService.change).not.toHaveBeenCalled();
  });

  it('awards logged prestige once for a newly scanned class', async () => {
    const query = {
      insert: jest.fn().mockReturnThis(),
      into: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      orIgnore: jest.fn().mockReturnThis(),
      returning: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ raw: [{ id: 1 }] }),
    };
    const manager: { createQueryBuilder: jest.Mock } = {
      createQueryBuilder: jest.fn().mockReturnValue(query),
    };
    const prestigeService = { change: jest.fn().mockResolvedValue(undefined) };
    const service = new CelestialClassDiscoveryService(
      { transaction: (work: (entityManager: unknown) => unknown) => work(manager) } as never,
      {} as never,
      prestigeService as never,
    );

    const result = await service.discover({
      userId: 1,
      classId: 201,
      celestialObjectId: 3,
      spacecraftId: 7,
    });

    expect(result).toEqual({
      discovered: true,
      prestigeAwarded: STU_PRESTIGE.DISCOVER_PLANET_CLASS,
      name: 'Klasse M',
    });
    expect(prestigeService.change).toHaveBeenCalledWith(
      1,
      STU_PRESTIGE.DISCOVER_PLANET_CLASS,
      '5 Prestige erhalten für die Entdeckung des Planetentyps „Klasse M“',
      manager,
    );
  });
});
