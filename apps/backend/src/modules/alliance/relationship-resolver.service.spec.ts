import { AllianceRelationshipType, AllianceRole } from '@swuniverse/shared';
import {
  NoPersonalContactStatusPort,
  RelationshipResolverService,
  type PersonalContactStatusPort,
} from './relationship-resolver.service';
import {
  InMemoryAllianceStore,
  EMPIRE,
} from './testing/in-memory-alliance.store';

const resolverFor = (
  store: InMemoryAllianceStore,
  personalContactStatus: PersonalContactStatusPort = new NoPersonalContactStatusPort(),
) => new RelationshipResolverService(store, personalContactStatus);

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
    });
  });
});
