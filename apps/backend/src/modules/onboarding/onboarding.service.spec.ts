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

import { BadRequestException } from '@nestjs/common';
import { Faction } from '@swuniverse/shared';
import { OnboardingService } from './onboarding.service';

describe('OnboardingService', () => {
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
    );

    await expect(
      service.selectFaction(7, Faction.REBEL_ALLIANCE),
    ).rejects.toThrow(new BadRequestException('Faction is already selected'));
    expect(factionService.findByKey).not.toHaveBeenCalled();
    expect(userRepo.update).not.toHaveBeenCalled();
  });
});
