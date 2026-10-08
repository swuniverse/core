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
    ['ships on another layer', { location: galaxyLocation(1000, 4, 4, 5) }],
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
    'never shows a partner from another alliance as alliance contact (capability %s)',
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

      expect(
        result.contacts.map((contact) => [
          contact.spacecraftId,
          contact.reason,
        ]),
      ).toEqual(
        enabled
          ? [
              [10, 'OWN'],
              [20, 'SHARED_LIVE_POSITION'],
            ]
          : [[10, 'OWN']],
      );
      expect(result.allianceContactsActive).toBe(enabled);
    },
  );

  describe('alliance ships', () => {
    /** Viewer 1 presides "Viewers" (#ff8800) with member 2; 3 is unaffiliated. */
    function allianceWorld({ color = '#ff8800' as string | null } = {}) {
      const store = new InMemoryAllianceStore();
      store.addPlayer(1, 'Viewer');
      store.addPlayer(2, 'Mate');
      store.addPlayer(3, 'Loner');
      const alliance = store.seedAlliance({ name: 'Viewers', color }, [
        [1, AllianceRole.PRESIDENT],
        [2, AllianceRole.NONE],
      ]);
      return { store, alliance };
    }

    const shipOf = (id: number, userId: number, username: string) =>
      ownShip({
        id,
        name: `${username} Ship`,
        userId,
        user: { id: userId, username },
        location: galaxyLocation(id, STARMAP_LAYER_ID, id, id + 1),
      });

    const fleet = () => [
      ownShip(),
      shipOf(20, 2, 'Mate'),
      shipOf(30, 3, 'Loner'),
    ];

    const serviceFor = (
      store: InMemoryAllianceStore,
      ships: Spacecraft[] = fleet(),
      { enabled = true } = {},
    ) =>
      new StarmapVisibilityService(
        shipRepository(ships),
        new RelationshipResolverService(
          store,
          new NoPersonalContactStatusPort(),
        ),
        ...contactCollaborators({ enabled }),
      );

    const contactIds = async (service: StarmapVisibilityService, viewer = 1) =>
      (await service.listContacts(viewer, STARMAP_LAYER_ID)).contacts.map(
        (contact) => [contact.spacecraftId, contact.reason],
      );

    it('shows ships of all current alliance members with base data, stance and alliance', async () => {
      const { store, alliance } = allianceWorld();

      const result = await serviceFor(store).listContacts(1, STARMAP_LAYER_ID);

      expect(result.allianceContactsActive).toBe(true);
      expect(result.contacts).toEqual([
        expect.objectContaining({ spacecraftId: 10, reason: 'OWN' }),
        {
          spacecraftId: 20,
          spacecraftName: 'Mate Ship',
          shipClassId: 100,
          ownerId: 2,
          ownerName: 'Mate',
          location: {
            scope: 'GALAXY',
            locationId: 20,
            layerId: STARMAP_LAYER_ID,
            x: 20,
            y: 21,
          },
          galaxyCell: { layerId: STARMAP_LAYER_ID, x: 20, y: 21 },
          reason: 'ALLIANCE',
          stance: 'FRIEND',
          alliance: { id: alliance.id, name: 'Viewers', color: '#ff8800' },
        },
      ]);
    });

    it('keeps own ships as OWN without stance or alliance and lists each ship once', async () => {
      const { store } = allianceWorld();

      const result = await serviceFor(store).listContacts(1, STARMAP_LAYER_ID);

      const own = result.contacts.filter((contact) => contact.ownerId === 1);
      expect(own).toHaveLength(1);
      expect(own[0].reason).toBe('OWN');
      expect(own[0]).not.toHaveProperty('stance');
      expect(own[0]).not.toHaveProperty('alliance');
    });

    it('passes on an unset alliance color as null', async () => {
      const { store } = allianceWorld({ color: null });

      const result = await serviceFor(store).listContacts(1, STARMAP_LAYER_ID);

      expect(result.contacts[1].alliance?.color).toBeNull();
    });

    it('shows a player without alliance only their own ships', async () => {
      const { store } = allianceWorld();

      await expect(contactIds(serviceFor(store), 3)).resolves.toEqual([
        [30, 'OWN'],
      ]);
    });

    it('shows only own ships while the capability is disabled', async () => {
      const { store } = allianceWorld();
      const service = serviceFor(store, fleet(), { enabled: false });

      const result = await service.listContacts(1, STARMAP_LAYER_ID);

      expect(result.allianceContactsActive).toBe(false);
      expect(result.contacts.map((contact) => contact.spacecraftId)).toEqual([
        10,
      ]);
    });

    it('applies joining, leaving and kicking with the next request', async () => {
      const { store, alliance } = allianceWorld();
      const service = serviceFor(store);

      await store.insertMembership({
        allianceId: alliance.id,
        userId: 3,
        role: AllianceRole.NONE,
      });
      await expect(contactIds(service)).resolves.toEqual([
        [10, 'OWN'],
        [20, 'ALLIANCE'],
        [30, 'ALLIANCE'],
      ]);
      await expect(contactIds(service, 3)).resolves.toEqual([
        [10, 'ALLIANCE'],
        [20, 'ALLIANCE'],
        [30, 'OWN'],
      ]);

      await store.deleteMembership(alliance.id, 2);
      await expect(contactIds(service)).resolves.toEqual([
        [10, 'OWN'],
        [30, 'ALLIANCE'],
      ]);
      await expect(contactIds(service, 2)).resolves.toEqual([[20, 'OWN']]);
    });

    it('leaves no alliance view behind after dissolution', async () => {
      const { store, alliance } = allianceWorld();
      const service = serviceFor(store);

      await store.deleteAlliance(alliance.id);

      await expect(contactIds(service)).resolves.toEqual([[10, 'OWN']]);
      await expect(contactIds(service, 2)).resolves.toEqual([[20, 'OWN']]);
    });

    it('never shows a member of the other faction as alliance contact', async () => {
      const { store, alliance } = allianceWorld();
      store.addPlayer(4, 'Imperial', EMPIRE.id);
      await store.insertMembership({
        allianceId: alliance.id,
        userId: 4,
        role: AllianceRole.NONE,
      });

      await expect(
        contactIds(serviceFor(store, [...fleet(), shipOf(40, 4, 'Imperial')])),
      ).resolves.toEqual([
        [10, 'OWN'],
        [20, 'ALLIANCE'],
      ]);
    });

    it.each([
      ['membership lookup', 'findMembership'],
      ['player lookup', 'findPlayer'],
    ] as const)(
      'shows only own ships when the %s fails',
      async (_label, method) => {
        const { store } = allianceWorld();
        jest
          .spyOn(store, method)
          .mockRejectedValue(new Error('database unavailable'));

        await expect(contactIds(serviceFor(store))).resolves.toEqual([
          [10, 'OWN'],
        ]);
      },
    );

    describe('partner ships', () => {
      /**
       * Viewer 1 presides "Viewers" with mate 2; player 5 presides "Partners"
       * with member 6. The alliances are not related yet.
       */
      function partnerWorld() {
        const { store, alliance } = allianceWorld();
        store.addPlayer(5, 'Partner');
        store.addPlayer(6, 'Partner Mate');
        const partner = store.seedAlliance({ name: 'Partners' }, [
          [5, AllianceRole.PRESIDENT],
          [6, AllianceRole.NONE],
        ]);
        return { store, alliance, partner };
      }

      const partnerFleet = () => [
        ...fleet(),
        shipOf(50, 5, 'Partner'),
        shipOf(60, 6, 'Partner Mate'),
      ];

      const relate = (
        store: InMemoryAllianceStore,
        first: { id: number },
        second: { id: number },
        overrides: {
          type?: AllianceRelationshipType;
          treatAsFriend?: boolean;
          shareLivePositions?: boolean;
        } = {},
      ) =>
        store.seedActiveAllianceRelationship({
          firstAllianceId: first.id,
          secondAllianceId: second.id,
          type: AllianceRelationshipType.ALLIANCE,
          treatAsFriend: false,
          shareLivePositions: true,
          ...overrides,
        });

      const partnerContactIds = (store: InMemoryAllianceStore, viewer = 1) =>
        contactIds(serviceFor(store, partnerFleet()), viewer);

      it('shows ships of all partner members with base data and a neutral stance', async () => {
        const { store, alliance, partner } = partnerWorld();
        relate(store, alliance, partner);

        const result = await serviceFor(store, partnerFleet()).listContacts(
          1,
          STARMAP_LAYER_ID,
        );

        expect(result.contacts.map((c) => [c.spacecraftId, c.reason])).toEqual([
          [10, 'OWN'],
          [20, 'ALLIANCE'],
          [50, 'SHARED_LIVE_POSITION'],
          [60, 'SHARED_LIVE_POSITION'],
        ]);
        expect(result.contacts[2]).toEqual({
          spacecraftId: 50,
          spacecraftName: 'Partner Ship',
          shipClassId: 100,
          ownerId: 5,
          ownerName: 'Partner',
          location: {
            scope: 'GALAXY',
            locationId: 50,
            layerId: STARMAP_LAYER_ID,
            x: 50,
            y: 51,
          },
          galaxyCell: { layerId: STARMAP_LAYER_ID, x: 50, y: 51 },
          reason: 'SHARED_LIVE_POSITION',
          stance: 'NEUTRAL',
        });
      });

      it('carries a friendly stance when the partners also treat each other as friends', async () => {
        const { store, alliance, partner } = partnerWorld();
        relate(store, alliance, partner, { treatAsFriend: true });

        const result = await serviceFor(store, partnerFleet()).listContacts(
          1,
          STARMAP_LAYER_ID,
        );

        const partnerContact = result.contacts.find((c) => c.ownerId === 5);
        expect(partnerContact).toMatchObject({
          reason: 'SHARED_LIVE_POSITION',
          stance: 'FRIEND',
        });
        expect(partnerContact).not.toHaveProperty('management');
        expect(partnerContact).not.toHaveProperty('alliance');
      });

      it('shows the viewer to the partner side as well', async () => {
        const { store, alliance, partner } = partnerWorld();
        relate(store, alliance, partner);

        await expect(partnerContactIds(store, 6)).resolves.toEqual([
          [10, 'SHARED_LIVE_POSITION'],
          [20, 'SHARED_LIVE_POSITION'],
          [50, 'ALLIANCE'],
          [60, 'OWN'],
        ]);
      });

      it('resolves all candidates in a single batched lookup', async () => {
        const { store, alliance, partner } = partnerWorld();
        relate(store, alliance, partner);
        const relationships = new RelationshipResolverService(
          store,
          new NoPersonalContactStatusPort(),
        );
        const resolveMany = jest.spyOn(relationships, 'resolveMany');
        const service = new StarmapVisibilityService(
          shipRepository(partnerFleet()),
          relationships,
          ...contactCollaborators({ enabled: true }),
        );

        await service.listContacts(1, STARMAP_LAYER_ID);

        expect(resolveMany).toHaveBeenCalledTimes(1);
        expect([...resolveMany.mock.calls[0][1]].sort()).toEqual([2, 5, 6]);
      });

      const withoutPartners = [
        [10, 'OWN'],
        [20, 'ALLIANCE'],
      ];

      it('shows no partner ships without a relationship', async () => {
        const { store } = partnerWorld();

        await expect(partnerContactIds(store)).resolves.toEqual(
          withoutPartners,
        );
      });

      it('shows no partner ships for a pending proposal', async () => {
        const { store, alliance, partner } = partnerWorld();
        await store.insertRelationshipProposal({
          senderAllianceId: alliance.id,
          recipientAllianceId: partner.id,
          type: AllianceRelationshipType.ALLIANCE,
          contract: '',
          treatAsFriend: false,
          shareLivePositions: true,
        });

        await expect(partnerContactIds(store)).resolves.toEqual(
          withoutPartners,
        );
      });

      it('stops showing partner ships once the relationship ends', async () => {
        const { store, alliance, partner } = partnerWorld();
        const relationship = relate(store, alliance, partner);

        await store.endNonWarRelationship(relationship.id);

        await expect(partnerContactIds(store)).resolves.toEqual(
          withoutPartners,
        );
      });

      it('stops showing partner ships once live position sharing is revoked', async () => {
        const { store, alliance, partner } = partnerWorld();
        const relationship = relate(store, alliance, partner);
        const change = await store.insertRelationshipChangeProposal({
          relationshipId: relationship.id,
          senderAllianceId: alliance.id,
          recipientAllianceId: partner.id,
          contract: '',
          treatAsFriend: true,
          shareLivePositions: false,
        });

        await expect(partnerContactIds(store)).resolves.toHaveLength(4);
        await store.acceptRelationshipChangeProposal(change.id);

        await expect(partnerContactIds(store)).resolves.toEqual(
          withoutPartners,
        );
      });

      it('shows no ships of an alliance at war', async () => {
        const { store, alliance, partner } = partnerWorld();
        relate(store, alliance, partner);

        await store.replaceRelationshipsWithWar(alliance.id, partner.id);

        await expect(partnerContactIds(store)).resolves.toEqual(
          withoutPartners,
        );
      });

      it('shows no ships of a friend without live position sharing', async () => {
        const { store, alliance, partner } = partnerWorld();
        relate(store, alliance, partner, {
          type: AllianceRelationshipType.FRIENDSHIP,
          treatAsFriend: true,
          shareLivePositions: false,
        });

        await expect(partnerContactIds(store)).resolves.toEqual(
          withoutPartners,
        );
      });

      it('never shows partner members of the other faction', async () => {
        const { store, alliance, partner } = partnerWorld();
        relate(store, alliance, partner);
        store.addPlayer(7, 'Imperial', EMPIRE.id);
        await store.insertMembership({
          allianceId: partner.id,
          userId: 7,
          role: AllianceRole.NONE,
        });

        await expect(
          contactIds(
            serviceFor(store, [...partnerFleet(), shipOf(70, 7, 'Imperial')]),
          ),
        ).resolves.toEqual([
          [10, 'OWN'],
          [20, 'ALLIANCE'],
          [50, 'SHARED_LIVE_POSITION'],
          [60, 'SHARED_LIVE_POSITION'],
        ]);
      });

      it('shows no partner ships while the capability is disabled', async () => {
        const { store, alliance, partner } = partnerWorld();
        relate(store, alliance, partner);

        await expect(
          contactIds(serviceFor(store, partnerFleet(), { enabled: false })),
        ).resolves.toEqual([[10, 'OWN']]);
      });

      it('keeps the highest reason when an owner qualifies several times', async () => {
        const { store, alliance, partner } = partnerWorld();
        relate(store, alliance, partner);
        const relationships = new RelationshipResolverService(
          store,
          new NoPersonalContactStatusPort(),
        );
        // The viewer and a mate also show up as partner candidates.
        jest
          .spyOn(relationships, 'livePositionPartnerCandidates')
          .mockResolvedValue([1, 2, 5, 6]);
        jest
          .spyOn(relationships, 'resolveMany')
          .mockImplementation(async (_viewer, ids) => {
            const all =
              await RelationshipResolverService.prototype.resolveMany.call(
                relationships,
                1,
                ids,
              );
            for (const stance of all.values())
              stance.mayShareLivePosition = true;
            return all;
          });
        const service = new StarmapVisibilityService(
          shipRepository(partnerFleet()),
          relationships,
          ...contactCollaborators({ enabled: true }),
        );

        await expect(contactIds(service)).resolves.toEqual([
          [10, 'OWN'],
          [20, 'ALLIANCE'],
          [50, 'SHARED_LIVE_POSITION'],
          [60, 'SHARED_LIVE_POSITION'],
        ]);
      });
    });
  });
});
