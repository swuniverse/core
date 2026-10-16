jest.mock('./entities/colony-scan.entity', () => ({
  ColonyScan: class ColonyScan {},
}));

import { ColonyScanProjectionService } from './colony-scan-projection.service';

describe('ColonyScanProjectionService', () => {
  function createService({ scans = [] as unknown[], sharers = [1] }: { scans?: unknown[]; sharers?: number[] } = {}) {
    const scanRepo = { find: jest.fn().mockResolvedValue(scans) };
    const relationshipResolver = {
      historicalScanSharerIds: jest.fn().mockResolvedValue(sharers),
    };
    return {
      service: new ColonyScanProjectionService(
        scanRepo as never,
        relationshipResolver as never,
      ),
      scanRepo,
      relationshipResolver,
    };
  }

  it('projects only the newest accessible scan for each colony with server-derived provenance and deletion rights', async () => {
    const newest = {
      id: 2,
      colonyId: 10,
      userId: 2,
      user: { id: 2, username: 'allianz-scout' },
      colonyName: 'Snapshot neu',
      colonyOwnerId: 12,
      colonyOwnerUsername: 'damals',
      surfaceWidth: 2,
      surfaceHeight: 1,
      deposits: [],
      surfaceFields: [],
      createdAt: new Date('2026-10-16T12:00:00.000Z'),
      colony: {
        id: 10,
        name: 'Jetzt neu',
        user: { id: 13, username: 'jetzt' },
        isAbandoned: false,
        posX: 4,
        posY: 5,
        celestialObjectId: 99,
      },
    };
    const old = { ...newest, id: 1, createdAt: new Date('2026-10-15T12:00:00.000Z') };
    const { service, scanRepo, relationshipResolver } = createService({
      scans: [newest, old],
      sharers: [1, 2],
    });

    await expect(service.newestAccessibleForSystem(1, 7)).resolves.toEqual([
      expect.objectContaining({
        id: 2,
        colonyId: 10,
        scanner: { id: 2, username: 'allianz-scout' },
        provenance: 'ALLIANCE',
        canDelete: false,
        snapshot: expect.objectContaining({ colonyName: 'Snapshot neu' }),
        current: expect.objectContaining({
          colony: expect.objectContaining({ name: 'Jetzt neu', posX: 4, posY: 5 }),
        }),
      }),
    ]);
    expect(relationshipResolver.historicalScanSharerIds).toHaveBeenCalledWith(1);
    expect(scanRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({ relations: ['user', 'colony', 'colony.user'] }),
    );
  });

  it('keeps the complete authorized history for archive consumers', async () => {
    const newest = {
      id: 2,
      colonyId: 10,
      userId: 1,
      user: { id: 1, username: 'own-scout' },
      colonyName: 'Snapshot neu',
      colonyOwnerId: 12,
      colonyOwnerUsername: 'damals',
      starSystemId: 7,
      celestialObjectId: 99,
      colonyClassId: 3,
      surfaceWidth: 2,
      surfaceHeight: 1,
      deposits: [],
      surfaceFields: [],
      createdAt: new Date('2026-10-16T12:00:00.000Z'),
      colony: null,
    };
    const old = {
      ...newest,
      id: 1,
      colonyName: 'Snapshot alt',
      createdAt: new Date('2026-10-15T12:00:00.000Z'),
    };
    const { service } = createService({ scans: [newest, old] });

    await expect(service.allAccessible(1)).resolves.toEqual([
      expect.objectContaining({
        id: 2,
        provenance: 'OWN',
        canDelete: true,
        snapshot: expect.objectContaining({
          colonyName: 'Snapshot neu',
          system: { id: 7, celestialObjectId: 99 },
        }),
      }),
      expect.objectContaining({
        id: 1,
        snapshot: expect.objectContaining({ colonyName: 'Snapshot alt' }),
      }),
    ]);
  });

  it('withdraws foreign scans immediately when current alliance membership no longer authorizes them', async () => {
    const { service, scanRepo } = createService({ sharers: [1] });

    await expect(service.newestAccessibleForSystem(1, 7)).resolves.toEqual([]);
    expect(scanRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ starSystemId: 7 }) }),
    );
  });
});
