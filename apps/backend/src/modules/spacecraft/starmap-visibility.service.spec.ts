jest.mock('./entities/spacecraft.entity', () => ({
  Spacecraft: class Spacecraft {},
  SpacecraftStatus: { DESTROYED: 'DESTROYED' },
}));

import { AllianceRelationshipType, AllianceRole } from '@swuniverse/shared';
import { NotFoundException } from '@nestjs/common';
import {
  NoPersonalContactStatusPort,
  RelationshipResolverService,
} from '../alliance/relationship-resolver.service';
import {
  EMPIRE,
  InMemoryAllianceStore,
} from '../alliance/testing/in-memory-alliance.store';
import type { Repository } from 'typeorm';
import { Spacecraft } from './entities/spacecraft.entity';
import { StarmapVisibilityService } from './starmap-visibility.service';
import { AllianceInfrastructureCapabilityService } from '../alliance/alliance-infrastructure-capability.service';
import type { Layer } from '../starmap/entities/layer.entity';

const shipRepository = (ships: Spacecraft[]) =>
  ({
    find: jest.fn().mockResolvedValue(ships),
  }) as unknown as Repository<Spacecraft>;

const layerRepository = (layers: Array<Pick<Layer, 'id'>>) =>
  ({
    findOneBy: jest.fn(({ id }: { id: number }) =>
      Promise.resolve(layers.find((layer) => layer.id === id) ?? null),
    ),
  }) as unknown as Repository<Layer>;

const STARMAP_LAYER_ID = 3;

/** Layer repository and rollout capability used for starmap contacts. */
const contactCollaborators = ({ enabled = false } = {}) =>
  [
    layerRepository([{ id: STARMAP_LAYER_ID }]),
    new AllianceInfrastructureCapabilityService({
      get: () => (enabled ? 'true' : undefined),
    } as never),
  ] as const;

const galaxyLocation = (id: number, layerId: number, x: number, y: number) => ({
  id,
  kind: 'GALAXY_FIELD' as const,
  galaxyField: { layerId, cx: x, cy: y },
  systemField: null,
});

/** Viewer 1 and player 2 belong to alliances that share live positions. */
function viewerInSharingAlliance() {
  const store = new InMemoryAllianceStore();
  store.addPlayer(1, 'Viewer');
  store.addPlayer(2, 'Sharer');
  const viewerAlliance = store.seedAlliance({ name: 'Viewers' }, [
    [1, AllianceRole.PRESIDENT],
  ]);
  const sharingAlliance = store.seedAlliance({ name: 'Sharers' }, [
    [2, AllianceRole.PRESIDENT],
  ]);
  store.seedActiveAllianceRelationship({
    firstAllianceId: viewerAlliance.id,
    secondAllianceId: sharingAlliance.id,
    type: AllianceRelationshipType.ALLIANCE,
    shareLivePositions: true,
  });
  return store;
}

describe('StarmapVisibilityService', () => {
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
    const service = new StarmapVisibilityService(
      shipRepository(ships),
      new RelationshipResolverService(
        allianceStore,
        new NoPersonalContactStatusPort(),
      ),
      ...contactCollaborators(),
    );

    await expect(service.listSharedLivePositions(1)).resolves.toEqual([
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
    const service = new StarmapVisibilityService(
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
      ...contactCollaborators(),
    );

    await expect(service.listSharedLivePositions(1)).resolves.toEqual([
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
    const service = new StarmapVisibilityService(
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
      ...contactCollaborators(),
    );

    await expect(service.listSharedLivePositions(1)).resolves.toEqual([]);
  });

  it('does not return the viewer’s own positions', async () => {
    const service = new StarmapVisibilityService(
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
      new RelationshipResolverService(
        viewerInSharingAlliance(),
        new NoPersonalContactStatusPort(),
      ),
      ...contactCollaborators(),
    );

    await expect(service.listSharedLivePositions(1)).resolves.toEqual([]);
  });

  it('fails closed when relationship resolution fails', async () => {
    const store = viewerInSharingAlliance();
    jest
      .spyOn(store, 'findMembership')
      .mockRejectedValue(new Error('database unavailable'));
    const relationships = new RelationshipResolverService(
      store,
      new NoPersonalContactStatusPort(),
    );
    const service = new StarmapVisibilityService(
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
      ...contactCollaborators(),
    );

    await expect(service.listSharedLivePositions(1)).resolves.toEqual([]);
  });
});

describe('StarmapVisibilityService.listContacts', () => {
  const ownShip = (overrides: Record<string, unknown> = {}) =>
    ({
      id: 10,
      name: 'Viewer Ship',
      shipClassId: 100,
      userId: 1,
      user: { id: 1, username: 'Viewer' },
      status: 'IDLE',
      alertState: 'YELLOW',
      hull: 80,
      hullMax: 120,
      crew: 9,
      crewMax: 12,
      locationId: 1000,
      location: galaxyLocation(1000, 3, 4, 5),
      ...overrides,
    }) as unknown as Spacecraft;

  function contactsService(
    ships: Spacecraft[],
    { enabled = false }: { enabled?: boolean } = {},
  ) {
    return new StarmapVisibilityService(
      shipRepository(ships),
      new RelationshipResolverService(
        viewerInSharingAlliance(),
        new NoPersonalContactStatusPort(),
      ),
      ...contactCollaborators({ enabled }),
    );
  }

  it('shows the viewer’s own ships on the layer with management details', async () => {
    await expect(
      contactsService([ownShip()]).listContacts(1, STARMAP_LAYER_ID),
    ).resolves.toEqual({
      layerId: 3,
      allianceContactsActive: false,
      contacts: [
        {
          spacecraftId: 10,
          spacecraftName: 'Viewer Ship',
          shipClassId: 100,
          ownerId: 1,
          ownerName: 'Viewer',
          location: {
            scope: 'GALAXY',
            locationId: 1000,
            layerId: 3,
            x: 4,
            y: 5,
          },
          galaxyCell: { layerId: 3, x: 4, y: 5 },
          reason: 'OWN',
          management: {
            status: 'IDLE',
            alertState: 'YELLOW',
            hull: 80,
            hullMax: 120,
            crew: 9,
            crewMax: 12,
          },
        },
      ],
    });
  });

  it.each([
    ['destroyed ships', { status: 'DESTROYED' }],
    [
      'ships without a resolvable position',
      { location: { id: 1000, kind: 'GALAXY_FIELD', galaxyField: null } },
    ],
    [
      'ships on another layer',
      { location: galaxyLocation(1000, 4, 4, 5) },
    ],
  ])('omits %s', async (_label, overrides) => {
    await expect(
      contactsService([ownShip(overrides)]).listContacts(1, STARMAP_LAYER_ID),
    ).resolves.toMatchObject({ contacts: [] });
  });

  it('rejects an unknown layer as not found', async () => {
    await expect(
      contactsService([ownShip()]).listContacts(1, 99),
    ).rejects.toThrow(NotFoundException);
  });

  it('places ships inside a system at the system’s galaxy cell', async () => {
    const result = await contactsService([
      ownShip({
        location: {
          id: 1000,
          kind: 'SYSTEM_FIELD',
          galaxyField: null,
          systemField: {
            starSystemId: 7,
            sx: 12,
            sy: 13,
            starSystem: { layerId: 3, cx: 40, cy: 41 },
          },
        },
      }),
    ]).listContacts(1, STARMAP_LAYER_ID);

    expect(result.contacts).toEqual([
      expect.objectContaining({
        location: {
          scope: 'SYSTEM',
          locationId: 1000,
          systemId: 7,
          x: 12,
          y: 13,
        },
        galaxyCell: { layerId: 3, x: 40, y: 41 },
      }),
    ]);
  });

  it('omits system ships whose system lies on another layer', async () => {
    const result = await contactsService([
      ownShip({
        location: {
          id: 1000,
          kind: 'SYSTEM_FIELD',
          galaxyField: null,
          systemField: {
            starSystemId: 7,
            sx: 12,
            sy: 13,
            starSystem: { layerId: 4, cx: 40, cy: 41 },
          },
        },
      }),
    ]).listContacts(1, STARMAP_LAYER_ID);

    expect(result.contacts).toEqual([]);
  });

  it.each([false, true])(
    'shows only own ships while alliance contacts are not built (capability %s)',
    async (enabled) => {
      const result = await contactsService(
        [
          ownShip(),
          ownShip({
            id: 20,
            name: 'Shared Ship',
            userId: 2,
            user: { id: 2, username: 'Sharer' },
          }),
        ],
        { enabled },
      ).listContacts(1, STARMAP_LAYER_ID);

      expect(result.contacts.map((contact) => contact.spacecraftId)).toEqual([
        10,
      ]);
      expect(result.allianceContactsActive).toBe(enabled);
    },
  );
});
