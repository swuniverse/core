jest.mock('../spacecraft/entities/spacecraft.entity', () => ({
  Spacecraft: class Spacecraft {},
  SpacecraftStatus: {
    IDLE: 'IDLE',
    DESTROYED: 'DESTROYED',
  },
}));
jest.mock('../starmap/starmap-query.service', () => ({
  StarmapQueryService: class StarmapQueryService {},
}));
jest.mock('./colony-ownership.service', () => ({
  ColonyOwnershipService: class ColonyOwnershipService {},
}));

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SpacecraftStatus } from '../spacecraft/entities/spacecraft.entity';
import { ColonyEnvironmentScanService } from './colony-environment-scan.service';

describe('ColonyEnvironmentScanService', () => {
  const ownedColony = {
    id: 7,
    starSystemId: 5,
    posX: 2,
    posY: 2,
    systemFieldId: 10,
    systemField: { starSystemId: 5, sx: 2, sy: 2 },
  };
  const grid = {
    system: {
      id: 5,
      name: 'Yavin',
      cx: 8,
      cy: 9,
      maxX: 3,
      maxY: 4,
      systemTypeId: 1050,
    },
    fields: [
      {
        id: 10,
        sx: 2,
        sy: 2,
        fieldTypeId: 1,
        fieldType: { name: 'Space' },
        celestialObject: {
          id: 20,
          name: 'Yavin IV',
          objectType: 1,
          classId: 4,
        },
      },
      {
        id: 11,
        sx: 3,
        sy: 4,
        fieldTypeId: 2,
        fieldType: { name: 'Nebula' },
        celestialObject: null,
      },
      {
        id: 12,
        sx: 8,
        sy: 8,
        fieldTypeId: 3,
        fieldType: { name: 'Outside' },
        celestialObject: null,
      },
    ],
    colonyShields: [
      { colonyId: 7, systemId: 5, posX: 2, posY: 2, shielded: true },
      { colonyId: 8, systemId: 5, posX: 8, posY: 8, shielded: true },
    ],
  };

  function setup() {
    const ownership = {
      findOwnedColony: jest.fn<Promise<any>, [number, number]>(async () =>
        Promise.resolve(ownedColony),
      ),
    };
    const starmap = {
      getSystemGrid: jest.fn(async () => grid),
    };
    const shipRepo = {
      find: jest.fn(async () => [
        shipAt(1, 2, 2),
        shipAt(2, 2, 2),
        shipAt(3, 3, 4),
        shipAt(4, 3, 4, SpacecraftStatus.DESTROYED),
        shipAt(5, 8, 8),
      ]),
    };
    const service = new ColonyEnvironmentScanService(
      ownership as never,
      starmap as never,
      shipRepo as never,
    );

    return { ownership, starmap, shipRepo, service };
  }

  it('validates ownership before querying scan data', async () => {
    const { ownership, starmap, shipRepo, service } = setup();
    ownership.findOwnedColony.mockRejectedValue(new NotFoundException());

    await expect(service.getScan(7, 99)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(starmap.getSystemGrid).not.toHaveBeenCalled();
    expect(shipRepo.find).not.toHaveBeenCalled();
  });

  it('rejects an owned colony without a system location before scan queries', async () => {
    const { ownership, starmap, shipRepo, service } = setup();
    ownership.findOwnedColony.mockResolvedValue({
      ...ownedColony,
      starSystemId: null,
      systemFieldId: null,
      systemField: null,
    });

    await expect(service.getScan(7, 99)).rejects.toThrow(
      new BadRequestException('Colony has no system location'),
    );
    expect(starmap.getSystemGrid).not.toHaveBeenCalled();
    expect(shipRepo.find).not.toHaveBeenCalled();
  });

  it('clips a 5x5 scan to system bounds and aggregates live signatures', async () => {
    const { ownership, starmap, shipRepo, service } = setup();

    const result = await service.getScan(7, 99);

    expect(ownership.findOwnedColony).toHaveBeenCalledWith(7, 99);
    expect(starmap.getSystemGrid).toHaveBeenCalledWith(5);
    expect(shipRepo.find).toHaveBeenCalledWith({
      where: {
        status: expect.anything(),
        location: { systemField: { starSystemId: 5 } },
      },
      relations: ['location', 'location.systemField'],
    });
    expect(result).toEqual({
      bounds: { minX: 1, maxX: 3, minY: 1, maxY: 4 },
      fields: [
        {
          x: 2,
          y: 2,
          fieldTypeId: 1,
          fieldTypeName: 'Space',
          celestialObject: {
            id: 20,
            name: 'Yavin IV',
            objectType: 1,
            classId: 4,
          },
        },
        {
          x: 3,
          y: 4,
          fieldTypeId: 2,
          fieldTypeName: 'Nebula',
          celestialObject: null,
        },
      ],
      signatures: [
        { x: 2, y: 2, visibleCount: 2 },
        { x: 3, y: 4, visibleCount: 1 },
      ],
      fadedSignatures: { uncloaked: 0, cloaked: 0 },
      colonyShields: [{ colonyId: 7, x: 2, y: 2, shielded: true }],
      anomalies: [],
    });
    expect(result.signatures).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: expect.anything() }),
        expect.objectContaining({ name: expect.anything() }),
        expect.objectContaining({ owner: expect.anything() }),
        expect.objectContaining({ shipClassId: expect.anything() }),
      ]),
    );
  });
});

function shipAt(
  id: number,
  x: number,
  y: number,
  status = SpacecraftStatus.IDLE,
) {
  return {
    id,
    name: `Ship ${id}`,
    userId: id + 100,
    shipClassId: id + 200,
    status,
    location: {
      kind: 'SYSTEM_FIELD',
      systemField: { starSystemId: 5, sx: x, sy: y },
    },
  };
}
