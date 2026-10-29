jest.mock('./entities/onboarding-selection.entity', () => ({
  OnboardingSelection: class OnboardingSelection {},
  OnboardingSelectionStatus: { COMPLETED: 'COMPLETED' },
}));
jest.mock('../auth/user.entity', () => ({ User: class User {} }));
jest.mock('../starmap/entities/layer.entity', () => ({
  Layer: class Layer {},
}));
jest.mock('../starmap/entities/star-system.entity', () => ({
  StarSystem: class StarSystem {},
}));
jest.mock('../starmap/entities/celestial-object.entity', () => ({
  CelestialObject: class CelestialObject {},
  CelestialObjectType: { PLANET: 1 },
}));
jest.mock('../starmap/entities/galaxy-field.entity', () => ({
  GalaxyField: class GalaxyField {},
  FactionZone: { REBEL: 'REBEL', EMPIRE: 'EMPIRE' },
}));
jest.mock('../research/entities/research.entity', () => ({
  Research: class Research {},
  ResearchStatus: { COMPLETED: 'COMPLETED' },
}));
jest.mock('../faction/faction.service', () => ({
  FactionService: class FactionService {},
}));
jest.mock('../colony/colony-seed.service', () => ({
  ColonySeedService: class ColonySeedService {},
}));
jest.mock('../messaging/messaging.service', () => ({
  MessagingService: class MessagingService {},
}));

import { BadRequestException } from '@nestjs/common';
import { Faction } from '@swuniverse/shared';
import { OnboardingService } from './onboarding.service';

describe('OnboardingService', () => {
  it('excludes already claimed planets from the available homeworlds', async () => {
    const selection = { factionId: 1, selectedSystemId: null };
    const onboardingRepo = {
      findOne: jest.fn(async () => selection),
      save: jest.fn(async (value) => value),
    };
    const starSystemRepo = {
      findOneBy: jest.fn(async () => ({ id: 12, landmarkKey: null })),
    };
    const query = {
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn(async () => [{ id: 1231, systemId: 12 }]),
    };
    const objectRepo = {
      createQueryBuilder: jest.fn(() => query),
    };
    const galaxyFieldRepo = {
      findOne: jest.fn(async () => ({ factionZone: 'REBEL' })),
      // Kein freier SWU-Starterplanet -> STU-Fallback.
      query: jest.fn(async () => []),
    };
    const service = new OnboardingService(
      onboardingRepo as never,
      {} as never,
      {} as never,
      starSystemRepo as never,
      objectRepo as never,
      galaxyFieldRepo as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    const planets = await service.listPlanets(7, 12);

    expect(planets).toEqual([{ id: 1231, systemId: 12 }]);
    expect(query.leftJoin).toHaveBeenCalledWith(
      'colonies',
      'colony',
      'colony.celestialObjectId = object.id',
    );
    expect(query.andWhere).toHaveBeenCalledWith('colony.id IS NULL');
  });

  it.each([
    [1, 1001],
    [2, 1003],
  ])(
    'completes faction %i start research %i from faction data',
    async (factionId, startResearchTechId) => {
      const researchRepo = {
        findOne: jest.fn(async () => null),
        create: jest.fn((value) => value),
        save: jest.fn(async (value) => value),
      };
      const factionService = {
        findById: jest.fn(async () => ({ id: factionId, startResearchTechId })),
      };
      const service = new OnboardingService(
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        researchRepo as never,
        factionService as never,
        {} as never,
        {} as never,
        {} as never,
      );

      await (service as never as {
        ensureBaseResearchCompleted(userId: number, factionId: number): Promise<void>;
      }).ensureBaseResearchCompleted(7, factionId);

      expect(factionService.findById).toHaveBeenCalledWith(factionId);
      expect(researchRepo.findOne).toHaveBeenCalledWith({
        where: { userId: 7, techId: startResearchTechId },
      });
      expect(researchRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 7, techId: startResearchTechId }),
      );
    },
  );

  it.each([
    [Faction.REBEL_ALLIANCE, 'Oberkommando der Rebellenallianz'],
    [Faction.GALACTIC_EMPIRE, 'Imperiales Oberkommando'],
  ])(
    'sends the %s welcome message after claiming a homeworld',
    async (factionKey, commandName) => {
      const messagingService = { sendSystem: jest.fn(async () => ({})) };
      const service = new OnboardingService(
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        messagingService as never,
      );

      await (service as never as {
        sendWelcomeMessage(userId: number, factionKey: Faction): Promise<void>;
      }).sendWelcomeMessage(7, factionKey);

      expect(messagingService.sendSystem).toHaveBeenCalledWith(
        7,
        `Willkommen – ${commandName}`,
        expect.stringMatching(/Kolonie[\s\S]*Forschung[\s\S]*HoloNet[\s\S]*Datenbank[\s\S]*Allianz/),
        'welcome:7',
      );
    },
  );

  it('keeps onboarding successful when welcome delivery fails', async () => {
    const messagingService = {
      sendSystem: jest.fn(async () => {
        throw new Error('delivery failed');
      }),
    };
    const service = new OnboardingService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      messagingService as never,
    );
    const loggerError = jest
      .spyOn((service as never as { logger: { error: () => void } }).logger, 'error')
      .mockImplementation();

    await expect(
      (service as never as {
        deliverWelcomeMessage(userId: number, factionKey: Faction): Promise<void>;
      }).deliverWelcomeMessage(7, Faction.REBEL_ALLIANCE),
    ).resolves.toBeUndefined();
    expect(loggerError).toHaveBeenCalledWith(
      'Failed to send welcome message to user 7',
      expect.any(String),
    );
  });

  it('does not allow changing a retained faction while claiming a new homeworld', async () => {
    const userRepo = {
      findOneBy: jest.fn(async () => ({ id: 7, factionId: 2 })),
      update: jest.fn(),
    };
    const factionService = { findByKey: jest.fn() };
    const service = new OnboardingService(
      {} as never,
      userRepo as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      factionService as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.selectFaction(7, Faction.REBEL_ALLIANCE),
    ).rejects.toThrow(new BadRequestException('Faction is already selected'));
    expect(factionService.findByKey).not.toHaveBeenCalled();
    expect(userRepo.update).not.toHaveBeenCalled();
  });
});
