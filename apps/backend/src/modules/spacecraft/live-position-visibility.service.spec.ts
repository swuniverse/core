jest.mock('./entities/spacecraft.entity', () => ({
  Spacecraft: class Spacecraft {},
  SpacecraftStatus: { DESTROYED: 'DESTROYED' },
}));

import { AllianceRelationshipType, AllianceRole } from '@swuniverse/shared';
import {
  NoPersonalContactStatusPort,
  RelationshipResolverService,
} from '../alliance/relationship-resolver.service';
import {
  EMPIRE,
  InMemoryAllianceStore,
} from '../alliance/testing/in-memory-alliance.store';
import type { Repository } from 'typeorm';
import type { ResolvedRelationship } from '../alliance/relationship-resolver.service';
import { Spacecraft } from './entities/spacecraft.entity';
import { LivePositionVisibilityService } from './live-position-visibility.service';

const shipRepository = (ships: Spacecraft[]) =>
  ({
    find: jest.fn().mockResolvedValue(ships),
  }) as unknown as Repository<Spacecraft>;

const relationshipResolver = (relationship: ResolvedRelationship) =>
  ({
    resolve: jest.fn().mockResolvedValue(relationship),
  }) as unknown as RelationshipResolverService;

const galaxyLocation = (id: number, layerId: number, x: number, y: number) => ({
  id,
  kind: 'GALAXY_FIELD' as const,
  galaxyField: { layerId, cx: x, cy: y },
  systemField: null,
});

describe('LivePositionVisibilityService', () => {
  it('shows current ship positions shared by an active alliance relationship', async () => {
    const allianceStore = new InMemoryAllianceStore();
    allianceStore.addPlayer(1, 'Viewer');
    allianceStore.addPlayer(2, 'Sharer');
    const viewerAlliance = allianceStore.seedAlliance({ name: 'Viewers' }, [
      [1, AllianceRole.PRESIDENT],
    ]);
    const sharingAlliance = allianceStore.seedAlliance({ name: 'Sharers' }, [
      [2, AllianceRole.PRESIDENT],
    ]);
    allianceStore.seedActiveAllianceRelationship({
      firstAllianceId: viewerAlliance.id,
      secondAllianceId: sharingAlliance.id,
      type: AllianceRelationshipType.ALLIANCE,
      shareLivePositions: true,
    });
    const ships = [
      {
        id: 10,
        name: 'Viewer Ship',
        shipClassId: 100,
        userId: 1,
        user: { id: 1, username: 'Viewer' },
        locationId: 1000,
        location: galaxyLocation(1000, 3, 4, 5),
      },
      {
        id: 20,
        name: 'Shared Ship',
        shipClassId: 200,
        userId: 2,
        user: { id: 2, username: 'Sharer' },
        locationId: 2000,
        location: galaxyLocation(2000, 3, 8, 9),
      },
    ] as Spacecraft[];
    const service = new LivePositionVisibilityService(
      shipRepository(ships),
      new RelationshipResolverService(
        allianceStore,
        new NoPersonalContactStatusPort(),
      ),
    );

    await expect(service.listForViewer(1)).resolves.toEqual([
      {
        spacecraftId: 20,
        spacecraftName: 'Shared Ship',
        shipClassId: 200,
        ownerId: 2,
        ownerName: 'Sharer',
        location: {
          scope: 'GALAXY',
          locationId: 2000,
          layerId: 3,
          x: 8,
          y: 9,
        },
      },
    ]);
  });

  it('shares system positions without sharing exploration or scans', async () => {
    const allianceStore = new InMemoryAllianceStore();
    allianceStore.addPlayer(1, 'Viewer');
    allianceStore.addPlayer(2, 'Sharer');
    const viewerAlliance = allianceStore.seedAlliance({ name: 'Viewers' }, [
      [1, AllianceRole.PRESIDENT],
    ]);
    const sharingAlliance = allianceStore.seedAlliance({ name: 'Sharers' }, [
      [2, AllianceRole.PRESIDENT],
    ]);
    allianceStore.seedActiveAllianceRelationship({
      firstAllianceId: viewerAlliance.id,
      secondAllianceId: sharingAlliance.id,
      type: AllianceRelationshipType.ALLIANCE,
      shareLivePositions: true,
    });
    const service = new LivePositionVisibilityService(
      shipRepository([
        {
          id: 20,
          name: 'Shared Ship',
          shipClassId: 200,
          userId: 2,
          user: { id: 2, username: 'Sharer' },
          locationId: 2000,
          location: {
            id: 2000,
            kind: 'SYSTEM_FIELD',
            galaxyField: null,
            systemField: { starSystemId: 7, sx: 12, sy: 13 },
          },
        } as Spacecraft,
      ]),
      new RelationshipResolverService(
        allianceStore,
        new NoPersonalContactStatusPort(),
      ),
    );

    await expect(service.listForViewer(1)).resolves.toEqual([
      expect.objectContaining({
        spacecraftId: 20,
        location: {
          scope: 'SYSTEM',
          locationId: 2000,
          systemId: 7,
          x: 12,
          y: 13,
        },
      }),
    ]);
  });

  it.each([
    ['missing grant', 'missing'],
    ['pending proposal', 'pending'],
    ['ended relationship', 'ended'],
    ['cross-faction parties', 'cross-faction'],
  ] as const)('does not expose positions for a %s', async (_label, state) => {
    const allianceStore = new InMemoryAllianceStore();
    allianceStore.addPlayer(1, 'Viewer');
    allianceStore.addPlayer(
      2,
      'Hidden',
      state === 'cross-faction' ? EMPIRE.id : undefined,
    );
    const viewerAlliance = allianceStore.seedAlliance({ name: 'Viewers' }, [
      [1, AllianceRole.PRESIDENT],
    ]);
    const hiddenAlliance = allianceStore.seedAlliance(
      {
        name: 'Hidden',
        ...(state === 'cross-faction' ? { factionId: EMPIRE.id } : {}),
      },
      [[2, AllianceRole.PRESIDENT]],
    );
    if (state === 'pending') {
      await allianceStore.insertRelationshipProposal({
        senderAllianceId: viewerAlliance.id,
        recipientAllianceId: hiddenAlliance.id,
        type: AllianceRelationshipType.ALLIANCE,
        contract: '',
        treatAsFriend: false,
        shareLivePositions: true,
      });
    }
    if (state === 'ended') {
      allianceStore.seedActiveAllianceRelationship({
        firstAllianceId: viewerAlliance.id,
        secondAllianceId: hiddenAlliance.id,
        type: AllianceRelationshipType.ALLIANCE,
        shareLivePositions: true,
      });
      jest
        .spyOn(allianceStore, 'listActiveRelationships')
        .mockResolvedValue([]);
    }
    const service = new LivePositionVisibilityService(
      shipRepository([
        {
          id: 20,
          name: 'Hidden Ship',
          shipClassId: 200,
          userId: 2,
          user: { id: 2, username: 'Hidden' },
          locationId: 2000,
          location: galaxyLocation(2000, 3, 8, 9),
        } as Spacecraft,
      ]),
      new RelationshipResolverService(
        allianceStore,
        new NoPersonalContactStatusPort(),
      ),
    );

    await expect(service.listForViewer(1)).resolves.toEqual([]);
  });

  it('does not return the viewer’s own positions', async () => {
    const service = new LivePositionVisibilityService(
      shipRepository([
        {
          id: 10,
          name: 'Viewer Ship',
          shipClassId: 100,
          userId: 1,
          user: { id: 1, username: 'Viewer' },
          locationId: 1000,
          location: galaxyLocation(1000, 3, 4, 5),
        } as Spacecraft,
      ]),
      relationshipResolver({
        status: 'FRIEND',
        isFriend: true,
        isEnemy: false,
        mayReactAutomatically: false,
        mayTransferSafely: true,
        mayProvisionProtectedShip: true,
        mayShareLivePosition: true,
        mayShareHistoricalScans: false,
      }),
    );

    await expect(service.listForViewer(1)).resolves.toEqual([]);
  });

  it('fails closed when relationship resolution fails', async () => {
    const relationships = {
      resolve: jest.fn().mockRejectedValue(new Error('unavailable')),
    } as unknown as RelationshipResolverService;
    const service = new LivePositionVisibilityService(
      shipRepository([
        {
          id: 20,
          name: 'Hidden Ship',
          shipClassId: 200,
          userId: 2,
          user: { id: 2, username: 'Hidden' },
          locationId: 2000,
          location: galaxyLocation(2000, 3, 8, 9),
        } as Spacecraft,
      ]),
      relationships,
    );

    await expect(service.listForViewer(1)).resolves.toEqual([]);
  });
});
