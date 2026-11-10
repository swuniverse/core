import type { Repository } from 'typeorm';
import { Layer } from './entities/layer.entity';
import { Wormhole } from './entities/wormhole.entity';
import { WormholeService } from './wormhole.service';

describe('WormholeService passage options', () => {
  it('projects active local exits as public options with their target layers', async () => {
    const wormholes = [
      {
        id: 21,
        entryLayerId: 1,
        entryCx: 5,
        entryCy: 7,
        exitLayerId: 2,
        exitCx: 3,
        exitCy: 4,
        isBidirectional: false,
        isRandomExit: false,
        name: 'Nordtor',
        isActive: true,
      },
      {
        id: 22,
        entryLayerId: 1,
        entryCx: 5,
        entryCy: 7,
        exitLayerId: 3,
        exitCx: 9,
        exitCy: 2,
        isBidirectional: true,
        isRandomExit: true,
        name: 'Südtor',
        isActive: true,
      },
    ];
    const wormholeRepo = {
      find: jest.fn().mockResolvedValue(wormholes),
    } as unknown as Repository<Wormhole>;
    const layerRepo = {
      find: jest.fn().mockResolvedValue([
        { id: 2, name: 'Kernraum' },
        { id: 3, name: 'Outer Rim' },
      ]),
    } as unknown as Repository<Layer>;
    const service = new WormholeService(wormholeRepo, layerRepo);

    await expect(service.findPassageOptionsAt(1, 5, 7)).resolves.toEqual([
      { id: 21, name: 'Nordtor', targetLayer: { id: 2, name: 'Kernraum' } },
      { id: 22, name: 'Südtor', targetLayer: { id: 3, name: 'Outer Rim' } },
    ]);
    expect(wormholeRepo.find).toHaveBeenCalledWith({
      where: [
        { entryLayerId: 1, entryCx: 5, entryCy: 7, isActive: true },
        {
          exitLayerId: 1,
          exitCx: 5,
          exitCy: 7,
          isBidirectional: true,
          isActive: true,
        },
      ],
    });
    expect(layerRepo.find).toHaveBeenCalledTimes(1);
  });

  it('targets the origin layer for a bidirectional reverse passage', async () => {
    const reversePassage = {
      id: 32,
      entryLayerId: 4,
      entryCx: 8,
      entryCy: 6,
      exitLayerId: 9,
      exitCx: 2,
      exitCy: 3,
      isBidirectional: true,
      isRandomExit: false,
      name: 'Rückkehrtor',
      isActive: true,
    };
    const wormholeRepo = {
      find: jest.fn().mockResolvedValue([reversePassage]),
    } as unknown as Repository<Wormhole>;
    const layerRepo = {
      find: jest.fn().mockResolvedValue([{ id: 4, name: 'Ursprung' }]),
    } as unknown as Repository<Layer>;
    const service = new WormholeService(wormholeRepo, layerRepo);

    await expect(service.findPassageOptionsAt(9, 2, 3)).resolves.toEqual([
      {
        id: 32,
        name: 'Rückkehrtor',
        targetLayer: { id: 4, name: 'Ursprung' },
      },
    ]);
    expect(wormholeRepo.find).toHaveBeenCalledWith({
      where: [
        { entryLayerId: 9, entryCx: 2, entryCy: 3, isActive: true },
        {
          exitLayerId: 9,
          exitCx: 2,
          exitCy: 3,
          isBidirectional: true,
          isActive: true,
        },
      ],
    });
  });

  it('returns no options for a field without active local or reverse passages', async () => {
    const wormholeRepo = {
      find: jest.fn().mockResolvedValue([]),
    } as unknown as Repository<Wormhole>;
    const layerRepo = {
      find: jest.fn(),
    } as unknown as Repository<Layer>;
    const service = new WormholeService(wormholeRepo, layerRepo);

    await expect(service.findPassageOptionsAt(6, 2, 1)).resolves.toEqual([]);
    expect(layerRepo.find).not.toHaveBeenCalled();
  });
});
