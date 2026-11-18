jest.mock('./entities/spacecraft.entity', () => ({
  Spacecraft: class Spacecraft {},
  SpacecraftStatus: {
    IDLE: 'IDLE',
    DESTROYED: 'DESTROYED',
  },
}));

import type { Repository } from 'typeorm';
import type { User } from '../auth/user.entity';
import { RelationshipResolverService } from '../alliance/relationship-resolver.service';
import { InMemoryAllianceStore } from '../alliance/testing/in-memory-alliance.store';
import { playerParty } from '../alliance/diplomacy-party';
import { AllianceRelationshipType, AllianceRole } from '@swuniverse/shared';
import type { SpacecraftCrewService } from './spacecraft-crew.service';
import type { Spacecraft } from './entities/spacecraft.entity';
import { InteractionContextService } from './interaction-context.service';
import type { SpacecraftRuntimeStateService } from './spacecraft-runtime-state.service';

const SpacecraftStatus = {
  IDLE: 'IDLE',
} as const;

const ship = (overrides: Partial<Spacecraft>): Spacecraft =>
  ({
    id: 1,
    userId: 10,
    locationId: 20,
    status: SpacecraftStatus.IDLE,
    hull: 100,
    runtimeSystems: {},
    ...overrides,
  }) as Spacecraft;

describe('InteractionContextService', () => {
  const shipRepo = { findOne: jest.fn() } as unknown as Repository<Spacecraft>;
  const userRepo = { findOneBy: jest.fn() } as unknown as Repository<User>;
  const crewService = { hasEnoughCrew: jest.fn() } as unknown as SpacecraftCrewService;
  const runtimeState = { initialize: jest.fn() } as unknown as SpacecraftRuntimeStateService;
  const relationships = { resolve: jest.fn() } as unknown as RelationshipResolverService;
  const service = new InteractionContextService(
    shipRepo,
    userRepo,
    crewService,
    runtimeState,
    relationships,
  );

  beforeEach(() => jest.clearAllMocks());

  it('maps loaded ship state and resolved stance into a policy context', async () => {
    const source = ship({ id: 1, userId: 10 });
    const target = ship({
      id: 2,
      userId: 11,
      // STU `isWarped`: warp drive running in open space.
      location: { kind: 'GALAXY_FIELD' } as Spacecraft['location'],
      hull: 0,
    });
    (shipRepo.findOne as jest.Mock)
      .mockResolvedValueOnce(source)
      .mockResolvedValueOnce(target);
    (userRepo.findOneBy as jest.Mock).mockResolvedValue({
      vacationMode: true,
      vacationStartedAt: new Date(Date.now() - 49 * 60 * 60 * 1000),
    });
    (crewService.hasEnoughCrew as jest.Mock).mockResolvedValue(true);
    (runtimeState.initialize as jest.Mock)
      .mockReturnValueOnce({ SHIELDS: { active: true, integrity: 100, cooldown: 0 } })
      .mockReturnValueOnce({
        SHIELDS: { active: false, integrity: 100, cooldown: 0 },
        WARPDRIVE: { active: true, integrity: 100, cooldown: 0 },
      });
    (relationships.resolve as jest.Mock).mockResolvedValue({ mayTransferSafely: true });

    await expect(service.load(1, 2)).resolves.toEqual({
      samePosition: true,
      sourceHasSufficientCrew: true,
      sourceCombatCapable: true,
      sourceInHyperspace: false,
      targetInHyperspace: true,
      sourceCloaked: false,
      targetCloaked: false,
      sourceShieldsActive: true,
      targetShieldsActive: false,
      targetOnVacation: true,
      sourceDestroyed: false,
      targetDestroyed: true,
      sourceBlocked: false,
      sourceTractored: false,
      targetBlocked: false,
      stanceAllowed: true,
    });
  });

  it.each([
    ['pending vacation', 47, false],
    ['effective vacation', 49, true],
  ])('maps %s by the 48 hour delay', async (_label, hours, effective) => {
    (shipRepo.findOne as jest.Mock)
      .mockResolvedValueOnce(ship({ id: 1 }))
      .mockResolvedValueOnce(ship({ id: 2, userId: 11 }));
    (userRepo.findOneBy as jest.Mock).mockResolvedValue({
      vacationMode: true,
      vacationStartedAt: new Date(Date.now() - hours * 60 * 60 * 1000),
    });

    const context = await service.load(1, 2, ['targetOnVacation']);

    expect(context.targetOnVacation).toBe(effective);
  });

  const sharedAlliance = (store: InMemoryAllianceStore) => {
    store.seedAlliance({ name: 'Shared' }, [
      [10, AllianceRole.PRESIDENT],
      [11, AllianceRole.NONE],
    ]);
  };
  const friendlyAgreement = (store: InMemoryAllianceStore) => {
    store.seedActiveAllianceRelationship({
      firstParty: playerParty(10),
      secondParty: playerParty(11),
      type: AllianceRelationshipType.TRADE_AGREEMENT,
      treatAsFriend: true,
    });
  };

  it.each([
    ['only the source owner lists the target owner as friend', [[10, 11]], undefined, false],
    ['only the target owner lists the source owner as friend', [[11, 10]], undefined, true],
    ['both list each other as friend', [[10, 11], [11, 10]], undefined, true],
    ['both are in the same alliance', [], sharedAlliance, true],
    ['an agreement treats them as friends', [], friendlyAgreement, true],
  ] as Array<
    [string, Array<[number, number]>, ((store: InMemoryAllianceStore) => void) | undefined, boolean]
  >)(
    'decides the EPS stance from the target owner when %s',
    async (_label, contacts, seed, allowed) => {
      const store = new InMemoryAllianceStore();
      store.addPlayer(10, 'Source');
      store.addPlayer(11, 'Target');
      seed?.(store);
      const resolver = new RelationshipResolverService(store, {
        statuses: async (ownerId) =>
          new Map(
            contacts
              .filter(([owner]) => owner === ownerId)
              .map(([, contact]) => [contact, 'FRIEND' as const]),
          ),
      });
      (shipRepo.findOne as jest.Mock)
        .mockResolvedValueOnce(ship({ id: 1, userId: 10 }))
        .mockResolvedValueOnce(ship({ id: 2, userId: 11 }));

      const context = await new InteractionContextService(
        shipRepo,
        userRepo,
        crewService,
        runtimeState,
        resolver,
      ).load(1, 2, ['stanceAllowed']);

      expect(context.stanceAllowed).toBe(allowed);
    },
  );

  it('loads only data requested by the selected context fields', async () => {
    (shipRepo.findOne as jest.Mock)
      .mockResolvedValueOnce(ship({ id: 1 }))
      .mockResolvedValueOnce(ship({ id: 2 }));

    await service.load(1, 2, ['samePosition']);

    expect(shipRepo.findOne).toHaveBeenCalledTimes(2);
    expect(userRepo.findOneBy).not.toHaveBeenCalled();
    expect(crewService.hasEnoughCrew).not.toHaveBeenCalled();
    expect(runtimeState.initialize).not.toHaveBeenCalled();
    expect(relationships.resolve).not.toHaveBeenCalled();
  });

  it('is registered as a spacecraft provider', async () => {
    const metadata = Reflect.getMetadata('design:paramtypes', InteractionContextService);
    expect(metadata).toHaveLength(5);
  });
});
