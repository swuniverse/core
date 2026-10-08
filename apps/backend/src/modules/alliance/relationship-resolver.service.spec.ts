import { AllianceRelationshipType, AllianceRole } from '@swuniverse/shared';
import {
  NoPersonalContactStatusPort,
  RelationshipResolverService,
  type PersonalContactStatusPort,
} from './relationship-resolver.service';
import type { AllianceStore } from './alliance.store';
import {
  InMemoryAllianceStore,
  EMPIRE,
} from './testing/in-memory-alliance.store';

const resolverFor = (
  store: AllianceStore,
  personalContactStatus: PersonalContactStatusPort = new NoPersonalContactStatusPort(),
) => new RelationshipResolverService(store, personalContactStatus);

const NO_CANDIDATES = {
  viewerMembership: null,
  alliance: null,
  mateIds: [],
  viewerRole: null,
  partnerIds: [],
};

describe('RelationshipResolverService', () => {
  it('resolves the priority matrix and exposes only derived capabilities', async () => {
    const store = new InMemoryAllianceStore();
    store.addPlayer(1, 'Rebel One');
    store.addPlayer(2, 'Rebel Two');
    store.addPlayer(3, 'Imperial', EMPIRE.id);
    store.addPlayer(4, 'Rebel Four');
    store.addPlayer(5, 'Rebel Five');
    store.addPlayer(6, 'Rebel Six');

    const first = store.seedAlliance({ name: 'First' }, [
      [1, AllianceRole.PRESIDENT],
      [2, AllianceRole.NONE],
    ]);
    const second = store.seedAlliance({ name: 'Second' }, [
      [4, AllianceRole.PRESIDENT],
    ]);
    const third = store.seedAlliance({ name: 'Third' }, [
      [5, AllianceRole.PRESIDENT],
    ]);

    store.seedActiveAllianceRelationship({
      firstAllianceId: first.id,
      secondAllianceId: second.id,
      type: AllianceRelationshipType.WAR,
    });
    store.seedActiveAllianceRelationship({
      firstAllianceId: first.id,
      secondAllianceId: third.id,
      type: AllianceRelationshipType.ALLIANCE,
      treatAsFriend: true,
      shareLivePositions: true,
    });

    const resolver = resolverFor(store);

    await expect(resolver.resolve(1, 3)).resolves.toMatchObject({
      status: 'ENEMY',
      isEnemy: true,
      isFriend: false,
      mayReactAutomatically: true,
      mayTransferSafely: false,
      mayProvisionProtectedShip: false,
      mayShareLivePosition: false,
      mayShareHistoricalScans: false,
    });
    await expect(resolver.resolve(1, 2)).resolves.toMatchObject({
      status: 'FRIEND',
      isFriend: true,
      isEnemy: false,
      mayReactAutomatically: false,
      mayTransferSafely: true,
      mayProvisionProtectedShip: true,
      mayShareHistoricalScans: true,
    });
    await expect(resolver.resolve(1, 4)).resolves.toMatchObject({
      status: 'ENEMY',
      isEnemy: true,
      mayReactAutomatically: true,
      mayShareHistoricalScans: false,
    });
    await expect(resolver.resolve(1, 5)).resolves.toMatchObject({
      status: 'FRIEND',
      isFriend: true,
      mayShareLivePosition: true,
      mayShareHistoricalScans: false,
    });
    await expect(resolver.resolve(1, 6)).resolves.toMatchObject({
      status: 'NEUTRAL',
      isFriend: false,
      isEnemy: false,
      mayReactAutomatically: false,
      mayTransferSafely: false,
      mayProvisionProtectedShip: false,
      mayShareLivePosition: false,
      mayShareHistoricalScans: false,
    });
  });

  it('shares live positions independently from friendship', async () => {
    const store = new InMemoryAllianceStore();
    store.addPlayer(1, 'Rebel One');
    store.addPlayer(2, 'Rebel Two');
    const first = store.seedAlliance({ name: 'First' }, [
      [1, AllianceRole.PRESIDENT],
    ]);
    const second = store.seedAlliance({ name: 'Second' }, [
      [2, AllianceRole.PRESIDENT],
    ]);
    store.seedActiveAllianceRelationship({
      firstAllianceId: first.id,
      secondAllianceId: second.id,
      type: AllianceRelationshipType.ALLIANCE,
      treatAsFriend: false,
      shareLivePositions: true,
    });

    await expect(resolverFor(store).resolve(1, 2)).resolves.toMatchObject({
      status: 'NEUTRAL',
      isFriend: false,
      mayShareLivePosition: true,
    });
  });

  it('preserves personal friendship beside a neutral alliance contract', async () => {
    const store = new InMemoryAllianceStore();
    store.addPlayer(1, 'Rebel One');
    store.addPlayer(2, 'Rebel Two');
    const first = store.seedAlliance({ name: 'First' }, [
      [1, AllianceRole.PRESIDENT],
    ]);
    const second = store.seedAlliance({ name: 'Second' }, [
      [2, AllianceRole.PRESIDENT],
    ]);
    store.seedActiveAllianceRelationship({
      firstAllianceId: first.id,
      secondAllianceId: second.id,
      type: AllianceRelationshipType.ALLIANCE,
      treatAsFriend: false,
      shareLivePositions: true,
    });

    const personalContactStatus: PersonalContactStatusPort = {
      isFriend: jest.fn().mockResolvedValue(true),
    };

    await expect(
      resolverFor(store, personalContactStatus).resolve(1, 2),
    ).resolves.toMatchObject({
      status: 'FRIEND',
      isFriend: true,
      mayShareLivePosition: true,
    });
  });

  it('does not grant friendship or visibility when a party is missing', async () => {
    const store = new InMemoryAllianceStore();
    store.addPlayer(1, 'Rebel One');

    await expect(resolverFor(store).resolve(1, 999)).resolves.toEqual({
      status: 'NEUTRAL',
      isFriend: false,
      isEnemy: false,
      mayReactAutomatically: false,
      mayTransferSafely: false,
      mayProvisionProtectedShip: false,
      mayShareLivePosition: false,
      mayShareHistoricalScans: false,
      mayShareAllianceMap: false,
    });
  });

  describe('priority conflicts', () => {
    const friendlyContact: PersonalContactStatusPort = {
      isFriend: async () => true,
    };

    function twoAlliances() {
      const store = new InMemoryAllianceStore();
      store.addPlayer(1, 'Rebel One');
      store.addPlayer(2, 'Rebel Two');
      const first = store.seedAlliance({ name: 'First' }, [
        [1, AllianceRole.PRESIDENT],
      ]);
      const second = store.seedAlliance({ name: 'Second' }, [
        [2, AllianceRole.PRESIDENT],
      ]);
      return { store, first, second };
    }

    it('keeps players of different factions enemies despite a personal friendship', async () => {
      const store = new InMemoryAllianceStore();
      store.addPlayer(1, 'Rebel');
      store.addPlayer(2, 'Imperial', EMPIRE.id);

      await expect(
        resolverFor(store, friendlyContact).resolve(1, 2),
      ).resolves.toMatchObject({ status: 'ENEMY', mayTransferSafely: false });
    });

    it('keeps cross-faction alliance members enemies regardless of any alliance state', async () => {
      const store = new InMemoryAllianceStore();
      store.addPlayer(1, 'Rebel');
      store.addPlayer(2, 'Imperial', EMPIRE.id);
      store.seedAlliance({ name: 'Rebels' }, [[1, AllianceRole.PRESIDENT]]);
      store.seedAlliance({ name: 'Imperials', factionId: EMPIRE.id }, [
        [2, AllianceRole.PRESIDENT],
      ]);

      await expect(
        resolverFor(store, friendlyContact).resolve(1, 2),
      ).resolves.toMatchObject({
        status: 'ENEMY',
        isFriend: false,
        mayShareLivePosition: false,
      });
    });

    it('lets a war between the alliances override a personal friendship', async () => {
      const { store, first, second } = twoAlliances();
      store.seedActiveAllianceRelationship({
        firstAllianceId: first.id,
        secondAllianceId: second.id,
        type: AllianceRelationshipType.WAR,
      });

      await expect(
        resolverFor(store, friendlyContact).resolve(1, 2),
      ).resolves.toMatchObject({
        status: 'ENEMY',
        mayReactAutomatically: true,
      });
    });

    it('keeps members of the same alliance friends while their alliance is at war with a third', async () => {
      const store = new InMemoryAllianceStore();
      store.addPlayer(1, 'Rebel One');
      store.addPlayer(2, 'Rebel Two');
      store.addPlayer(3, 'Rebel Three');
      const own = store.seedAlliance({ name: 'Own' }, [
        [1, AllianceRole.PRESIDENT],
        [2, AllianceRole.NONE],
      ]);
      const enemy = store.seedAlliance({ name: 'Enemy' }, [
        [3, AllianceRole.PRESIDENT],
      ]);
      store.seedActiveAllianceRelationship({
        firstAllianceId: own.id,
        secondAllianceId: enemy.id,
        type: AllianceRelationshipType.WAR,
      });
      const resolver = resolverFor(store);

      await expect(resolver.resolve(1, 2)).resolves.toMatchObject({
        status: 'FRIEND',
      });
      await expect(resolver.resolve(2, 3)).resolves.toMatchObject({
        status: 'ENEMY',
      });
    });

    it('lets alliance membership decide before a personal contact is consulted', async () => {
      const store = new InMemoryAllianceStore();
      store.addPlayer(1, 'Rebel One');
      store.addPlayer(2, 'Rebel Two');
      store.seedAlliance({ name: 'Own' }, [
        [1, AllianceRole.PRESIDENT],
        [2, AllianceRole.NONE],
      ]);
      const isFriend = jest.fn().mockResolvedValue(false);

      await expect(
        resolverFor(store, { isFriend }).resolve(1, 2),
      ).resolves.toMatchObject({ status: 'FRIEND' });
      expect(isFriend).not.toHaveBeenCalled();
    });

    it('resolves the same answer regardless of argument order', async () => {
      const { store, first, second } = twoAlliances();
      store.seedActiveAllianceRelationship({
        firstAllianceId: second.id,
        secondAllianceId: first.id,
        type: AllianceRelationshipType.ALLIANCE,
        treatAsFriend: true,
        shareLivePositions: true,
      });
      const resolver = resolverFor(store);

      await expect(resolver.resolve(1, 2)).resolves.toEqual(
        await resolver.resolve(2, 1),
      );
    });
  });

  describe('only active relationships take effect', () => {
    function twoAlliancesWithMembers() {
      const store = new InMemoryAllianceStore();
      store.addPlayer(1, 'Rebel One');
      store.addPlayer(2, 'Rebel Two');
      const first = store.seedAlliance({ name: 'First' }, [
        [1, AllianceRole.PRESIDENT],
      ]);
      const second = store.seedAlliance({ name: 'Second' }, [
        [2, AllianceRole.PRESIDENT],
      ]);
      return { store, first, second, resolver: resolverFor(store) };
    }

    it('ignores a pending relationship proposal', async () => {
      const { store, first, second, resolver } = twoAlliancesWithMembers();
      await store.insertRelationshipProposal({
        senderAllianceId: first.id,
        recipientAllianceId: second.id,
        type: AllianceRelationshipType.ALLIANCE,
        contract: '',
        treatAsFriend: true,
        shareLivePositions: true,
      });

      await expect(resolver.resolve(1, 2)).resolves.toMatchObject({
        status: 'NEUTRAL',
        mayShareLivePosition: false,
      });
    });

    it('applies a pending change only after it is accepted', async () => {
      const { store, first, second, resolver } = twoAlliancesWithMembers();
      const relationship = store.seedActiveAllianceRelationship({
        firstAllianceId: first.id,
        secondAllianceId: second.id,
        type: AllianceRelationshipType.FRIENDSHIP,
        treatAsFriend: false,
        shareLivePositions: false,
      });
      const change = await store.insertRelationshipChangeProposal({
        relationshipId: relationship.id,
        senderAllianceId: first.id,
        recipientAllianceId: second.id,
        contract: '',
        treatAsFriend: true,
        shareLivePositions: true,
      });

      await expect(resolver.resolve(1, 2)).resolves.toMatchObject({
        status: 'NEUTRAL',
        mayShareLivePosition: false,
      });

      await store.acceptRelationshipChangeProposal(change.id);

      await expect(resolver.resolve(1, 2)).resolves.toMatchObject({
        status: 'FRIEND',
        mayShareLivePosition: true,
      });
    });

    it('withdraws friendship and live positions once the relationship ends', async () => {
      const { store, first, second, resolver } = twoAlliancesWithMembers();
      const relationship = store.seedActiveAllianceRelationship({
        firstAllianceId: first.id,
        secondAllianceId: second.id,
        type: AllianceRelationshipType.ALLIANCE,
        treatAsFriend: true,
        shareLivePositions: true,
      });
      await expect(resolver.resolve(1, 2)).resolves.toMatchObject({
        status: 'FRIEND',
        mayShareLivePosition: true,
      });

      await store.endNonWarRelationship(relationship.id);

      await expect(resolver.resolve(1, 2)).resolves.toMatchObject({
        status: 'NEUTRAL',
        mayShareLivePosition: false,
      });
    });

    it('re-resolves dynamically when a member leaves the alliance', async () => {
      const store = new InMemoryAllianceStore();
      store.addPlayer(1, 'Rebel One');
      store.addPlayer(2, 'Rebel Two');
      const own = store.seedAlliance({ name: 'Own' }, [
        [1, AllianceRole.PRESIDENT],
        [2, AllianceRole.NONE],
      ]);
      const resolver = resolverFor(store);
      await expect(resolver.resolve(1, 2)).resolves.toMatchObject({
        status: 'FRIEND',
        mayShareHistoricalScans: true,
      });

      await store.deleteMembership(own.id, 2);

      await expect(resolver.resolve(1, 2)).resolves.toMatchObject({
        status: 'NEUTRAL',
        mayShareHistoricalScans: false,
      });
    });
  });

  describe('players without an alliance', () => {
    it('treats two unaffiliated players of the same faction as neutral', async () => {
      const store = new InMemoryAllianceStore();
      store.addPlayer(1, 'Settler One');
      store.addPlayer(2, 'Settler Two');

      await expect(resolverFor(store).resolve(1, 2)).resolves.toMatchObject({
        status: 'NEUTRAL',
        mayTransferSafely: false,
      });
    });

    it('treats an unaffiliated player and an alliance member as neutral, never applying alliance releases', async () => {
      const store = new InMemoryAllianceStore();
      store.addPlayer(1, 'Member');
      store.addPlayer(2, 'Settler');
      store.seedAlliance({ name: 'Own' }, [[1, AllianceRole.PRESIDENT]]);

      await expect(resolverFor(store).resolve(1, 2)).resolves.toMatchObject({
        status: 'NEUTRAL',
        mayShareLivePosition: false,
        mayShareHistoricalScans: false,
      });
    });

    it('lets a personal contact make unaffiliated players friends', async () => {
      const store = new InMemoryAllianceStore();
      store.addPlayer(1, 'Settler One');
      store.addPlayer(2, 'Settler Two');

      await expect(
        resolverFor(store, { isFriend: async () => true }).resolve(1, 2),
      ).resolves.toMatchObject({ status: 'FRIEND', mayTransferSafely: true });
    });

    it('treats unaffiliated players of different factions as enemies', async () => {
      const store = new InMemoryAllianceStore();
      store.addPlayer(1, 'Rebel Settler');
      store.addPlayer(2, 'Imperial Settler', EMPIRE.id);

      await expect(resolverFor(store).resolve(1, 2)).resolves.toMatchObject({
        status: 'ENEMY',
      });
    });
  });

  describe('fails closed', () => {
    const closed = {
      status: 'NEUTRAL',
      isFriend: false,
      isEnemy: false,
      mayReactAutomatically: false,
      mayTransferSafely: false,
      mayProvisionProtectedShip: false,
      mayShareLivePosition: false,
      mayShareHistoricalScans: false,
      mayShareAllianceMap: false,
    };

    it('grants nothing when the store fails', async () => {
      const store = new InMemoryAllianceStore();
      store.addPlayer(1, 'Rebel One');
      store.addPlayer(2, 'Rebel Two');
      store.seedAlliance({ name: 'Own' }, [
        [1, AllianceRole.PRESIDENT],
        [2, AllianceRole.NONE],
      ]);
      jest
        .spyOn(store, 'findMembership')
        .mockRejectedValue(new Error('database unavailable'));

      await expect(resolverFor(store).resolve(1, 2)).resolves.toEqual(closed);
    });

    it('grants nothing when the personal contact lookup fails', async () => {
      const store = new InMemoryAllianceStore();
      store.addPlayer(1, 'Rebel One');
      store.addPlayer(2, 'Rebel Two');

      await expect(
        resolverFor(store, {
          isFriend: () => Promise.reject(new Error('contacts unavailable')),
        }).resolve(1, 2),
      ).resolves.toEqual(closed);
    });

    it('grants nothing when a player has no faction', async () => {
      const store = new InMemoryAllianceStore();
      store.addPlayer(1, 'Rebel One');
      store.addPlayer(2, 'Unassigned', null);

      await expect(
        resolverFor(store, { isFriend: async () => true }).resolve(1, 2),
      ).resolves.toEqual(closed);
    });
  });

  describe('resolveMany', () => {
    it('resolves each distinct player with the same answers as resolve', async () => {
      const store = new InMemoryAllianceStore();
      store.addPlayer(1, 'Rebel One');
      store.addPlayer(2, 'Rebel Two');
      store.addPlayer(3, 'Imperial', EMPIRE.id);
      store.addPlayer(4, 'Partner');
      store.addPlayer(5, 'Enemy Rebel');
      const own = store.seedAlliance({ name: 'Own' }, [
        [1, AllianceRole.PRESIDENT],
        [2, AllianceRole.NONE],
      ]);
      const partner = store.seedAlliance({ name: 'Partner' }, [
        [4, AllianceRole.PRESIDENT],
      ]);
      const enemy = store.seedAlliance({ name: 'Enemy' }, [
        [5, AllianceRole.PRESIDENT],
      ]);
      store.seedActiveAllianceRelationship({
        firstAllianceId: own.id,
        secondAllianceId: partner.id,
        type: AllianceRelationshipType.ALLIANCE,
        treatAsFriend: true,
        shareLivePositions: true,
      });
      store.seedActiveAllianceRelationship({
        firstAllianceId: own.id,
        secondAllianceId: enemy.id,
        type: AllianceRelationshipType.WAR,
      });
      const resolver = resolverFor(store);

      const stances = await resolver.resolveMany(1, [2, 3, 2, 4, 5, 99, 3]);

      expect([...stances.keys()]).toEqual([2, 3, 4, 5, 99]);
      for (const id of [2, 3, 4, 5, 99]) {
        expect(stances.get(id)).toEqual(await resolver.resolve(1, id));
      }
      expect(stances.get(2)).toMatchObject({ mayShareAllianceMap: true });
      expect(stances.get(3)?.status).toBe('ENEMY');
      expect(stances.get(4)).toMatchObject({
        status: 'FRIEND',
        mayShareLivePosition: true,
      });
      expect(stances.get(5)?.status).toBe('ENEMY');
      expect(stances.get(99)?.status).toBe('NEUTRAL');
    });

    it('needs no more store lookups for more players', async () => {
      const lookupsFor = async (players: number) => {
        const store = new InMemoryAllianceStore();
        const ids = Array.from({ length: players }, (_, index) => index + 2);
        store.addPlayer(1, 'Viewer');
        for (const id of ids) store.addPlayer(id, `Player ${id}`);
        store.seedAlliance({ name: 'Own' }, [
          [1, AllianceRole.PRESIDENT],
          ...ids.map((id) => [id, AllianceRole.NONE] as [number, AllianceRole]),
        ]);
        // Counts only the resolver's own store calls: the proxy hands the
        // unwrapped store to each method, so internal delegation is invisible.
        let lookups = 0;
        const counted = new Proxy(store, {
          get(target, property) {
            const value = Reflect.get(target, property, target);
            if (typeof value !== 'function') return value;
            return (...args: unknown[]) => {
              lookups += 1;
              return value.apply(target, args);
            };
          },
        });
        await resolverFor(counted).resolveMany(1, ids);
        return lookups;
      };

      expect(await lookupsFor(50)).toBe(await lookupsFor(2));
    });

    it('resolves to closed Neutral for everyone when the store fails', async () => {
      const store = new InMemoryAllianceStore();
      store.addPlayer(1, 'Rebel One');
      store.addPlayer(2, 'Rebel Two');
      store.seedAlliance({ name: 'Own' }, [
        [1, AllianceRole.PRESIDENT],
        [2, AllianceRole.NONE],
      ]);
      jest
        .spyOn(store, 'findMemberships')
        .mockRejectedValue(new Error('database unavailable'));

      const stances = await resolverFor(store).resolveMany(1, [2]);

      expect(stances.get(2)).toMatchObject({
        status: 'NEUTRAL',
        mayShareAllianceMap: false,
        mayShareLivePosition: false,
      });
    });
  });

  describe('alliance map', () => {
    it('grants the alliance map only between current members of the same alliance', async () => {
      const store = new InMemoryAllianceStore();
      for (const id of [1, 2, 3, 4]) store.addPlayer(id, `Rebel ${id}`);
      const own = store.seedAlliance({ name: 'Own' }, [
        [1, AllianceRole.PRESIDENT],
        [2, AllianceRole.NONE],
      ]);
      const other = store.seedAlliance({ name: 'Other' }, [
        [3, AllianceRole.PRESIDENT],
      ]);
      store.seedActiveAllianceRelationship({
        firstAllianceId: own.id,
        secondAllianceId: other.id,
        type: AllianceRelationshipType.ALLIANCE,
        treatAsFriend: true,
        shareLivePositions: true,
      });
      const resolver = resolverFor(store);

      await expect(resolver.resolve(1, 2)).resolves.toMatchObject({
        mayShareAllianceMap: true,
      });
      await expect(resolver.resolve(1, 3)).resolves.toMatchObject({
        status: 'FRIEND',
        mayShareAllianceMap: false,
      });
      await expect(resolver.resolve(1, 4)).resolves.toMatchObject({
        mayShareAllianceMap: false,
      });

      await store.deleteMembership(own.id, 2);
      await expect(resolver.resolve(1, 2)).resolves.toMatchObject({
        mayShareAllianceMap: false,
      });
    });

    it('names the viewer’s alliance, its current mates and the viewer’s office as map candidates', async () => {
      const store = new InMemoryAllianceStore();
      for (const id of [1, 2, 3, 4]) store.addPlayer(id, `Rebel ${id}`);
      const own = store.seedAlliance({ name: 'Own', color: '#ff8800' }, [
        [1, AllianceRole.PRESIDENT],
        [2, AllianceRole.NONE],
      ]);
      store.seedAlliance({ name: 'Other' }, [[3, AllianceRole.PRESIDENT]]);
      const resolver = resolverFor(store);

      await expect(resolver.starmapCandidates(1)).resolves.toEqual({
        viewerMembership: expect.objectContaining({
          allianceId: own.id,
          userId: 1,
        }),
        alliance: { id: own.id, name: 'Own', color: '#ff8800' },
        mateIds: [2],
        viewerRole: AllianceRole.PRESIDENT,
        partnerIds: [],
      });
      await expect(resolver.starmapCandidates(2)).resolves.toMatchObject({
        viewerRole: AllianceRole.NONE,
      });
      await expect(resolver.starmapCandidates(4)).resolves.toEqual(
        NO_CANDIDATES,
      );

      await store.deleteAlliance(own.id);
      await expect(resolver.starmapCandidates(1)).resolves.toEqual(
        NO_CANDIDATES,
      );
    });

    it.each(['findMembership', 'listMemberships'] as const)(
      'names no candidates when %s fails',
      async (method) => {
        const store = new InMemoryAllianceStore();
        store.addPlayer(1, 'Rebel One');
        store.seedAlliance({ name: 'Own' }, [[1, AllianceRole.PRESIDENT]]);
        jest
          .spyOn(store, method)
          .mockRejectedValue(new Error('database unavailable'));

        await expect(
          resolverFor(store).starmapCandidates(1),
        ).resolves.toMatchObject({
          alliance: null,
          mateIds: [],
          viewerRole: null,
          partnerIds: [],
        });
      },
    );

    it('reads the viewer’s membership once for all candidates', async () => {
      const store = new InMemoryAllianceStore();
      for (const id of [1, 2]) store.addPlayer(id, `Rebel ${id}`);
      store.seedAlliance({ name: 'Own' }, [
        [1, AllianceRole.PRESIDENT],
        [2, AllianceRole.NONE],
      ]);
      const findMembership = jest.spyOn(store, 'findMembership');

      await resolverFor(store).starmapCandidates(1);

      expect(findMembership).toHaveBeenCalledTimes(1);
    });
  });

  describe('resolveMany with a known viewer membership', () => {
    it('uses the given membership instead of reading it again', async () => {
      const store = new InMemoryAllianceStore();
      for (const id of [1, 2]) store.addPlayer(id, `Rebel ${id}`);
      const own = store.seedAlliance({ name: 'Own' }, [
        [1, AllianceRole.PRESIDENT],
        [2, AllianceRole.NONE],
      ]);
      const resolver = resolverFor(store);
      const { viewerMembership } = await resolver.starmapCandidates(1);
      await store.deleteMembership(own.id, 1);

      await expect(
        resolver.resolveMany(1, [2], { viewerMembership }),
      ).resolves.toEqual(
        new Map([[2, expect.objectContaining({ mayShareAllianceMap: true })]]),
      );
      await expect(
        resolver.resolveMany(1, [2], { viewerMembership: null }),
      ).resolves.toEqual(
        new Map([[2, expect.objectContaining({ mayShareAllianceMap: false })]]),
      );
    });
  });

  describe('live position partners', () => {
    it('names current members of alliances in an active relationship as candidates', async () => {
      const store = new InMemoryAllianceStore();
      for (const id of [1, 2, 3, 4, 5, 6]) store.addPlayer(id, `Rebel ${id}`);
      const own = store.seedAlliance({ name: 'Own' }, [
        [1, AllianceRole.PRESIDENT],
        [2, AllianceRole.NONE],
      ]);
      const partner = store.seedAlliance({ name: 'Partner' }, [
        [3, AllianceRole.PRESIDENT],
        [4, AllianceRole.NONE],
      ]);
      const pending = store.seedAlliance({ name: 'Pending' }, [
        [5, AllianceRole.PRESIDENT],
      ]);
      store.seedActiveAllianceRelationship({
        firstAllianceId: own.id,
        secondAllianceId: partner.id,
        type: AllianceRelationshipType.ALLIANCE,
        shareLivePositions: true,
      });
      await store.insertRelationshipProposal({
        senderAllianceId: own.id,
        recipientAllianceId: pending.id,
        type: AllianceRelationshipType.ALLIANCE,
        contract: '',
        treatAsFriend: false,
        shareLivePositions: true,
      });
      const resolver = resolverFor(store);

      await expect(resolver.starmapCandidates(1)).resolves.toMatchObject({
        partnerIds: [3, 4],
      });
      await expect(resolver.starmapCandidates(6)).resolves.toMatchObject({
        partnerIds: [],
      });
    });

    it('names no partner candidates but keeps the alliance when relationships fail', async () => {
      const store = new InMemoryAllianceStore();
      store.addPlayer(1, 'Rebel One');
      store.addPlayer(2, 'Rebel Two');
      store.seedAlliance({ name: 'Own' }, [
        [1, AllianceRole.PRESIDENT],
        [2, AllianceRole.NONE],
      ]);
      jest
        .spyOn(store, 'listActiveRelationships')
        .mockRejectedValue(new Error('database unavailable'));

      await expect(
        resolverFor(store).starmapCandidates(1),
      ).resolves.toMatchObject({ mateIds: [2], partnerIds: [] });
    });
  });

  describe('historicalScanSharerIds', () => {
    it('returns the viewer and current alliance mates only', async () => {
      const store = new InMemoryAllianceStore();
      for (const id of [1, 2, 3, 4]) store.addPlayer(id, `Rebel ${id}`);
      const own = store.seedAlliance({ name: 'Own' }, [
        [1, AllianceRole.PRESIDENT],
        [2, AllianceRole.NONE],
      ]);
      const other = store.seedAlliance({ name: 'Other' }, [
        [3, AllianceRole.PRESIDENT],
      ]);
      store.seedActiveAllianceRelationship({
        firstAllianceId: own.id,
        secondAllianceId: other.id,
        type: AllianceRelationshipType.ALLIANCE,
        treatAsFriend: true,
      });

      await expect(
        resolverFor(store).historicalScanSharerIds(1),
      ).resolves.toEqual([1, 2]);
      await expect(
        resolverFor(store).historicalScanSharerIds(4),
      ).resolves.toEqual([4]);
    });
  });
});
