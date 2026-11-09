import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserTutorialProgress } from './entities/user-tutorial-progress.entity';
import { TUTORIAL_DEFINITIONS_TOKEN } from './tutorial-definitions';
import { TutorialService } from './tutorial.service';

const definitions = {
  version: 1,
  views: {
    maindesk: [
      { id: 'welcome', title: 'Willkommen', text: 'Willkommen' },
      { id: 'navigation', title: 'Navigation', text: 'Navigation' },
    ],
  },
} as const;

const createService = () => {
  const progressRepo = {
    findOneBy: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => value),
    upsert: jest.fn(async () => undefined),
    delete: jest.fn(async () => undefined),
  };
  const service = new TutorialService(progressRepo as any, definitions);
  return { service, progressRepo };
};

describe('TutorialService', () => {
  it('can be initialized by Nest with the optional definitions omitted', async () => {
    await expect(
      Test.createTestingModule({
        providers: [
          TutorialService,
          {
            provide: getRepositoryToken(UserTutorialProgress),
            useValue: {},
          },
          { provide: TUTORIAL_DEFINITIONS_TOKEN, useValue: definitions },
        ],
      }).compile(),
    ).resolves.toBeDefined();
  });

  it('returns the current tutorial and starts an enabled view at its first step', async () => {
    const { service, progressRepo } = createService();
    progressRepo.findOneBy.mockResolvedValue({
      userId: 7,
      view: 'maindesk',
      currentStepId: null,
      completed: false,
    });

    await expect(service.getView(7, 'maindesk')).resolves.toEqual({
      version: 1,
      view: 'maindesk',
      steps: definitions.views.maindesk,
      currentStepId: 'welcome',
    });
  });

  it('returns no tutorial for completed, disabled or unknown views', async () => {
    const { service, progressRepo } = createService();
    progressRepo.findOneBy.mockResolvedValueOnce({ completed: true });
    await expect(service.getView(7, 'maindesk')).resolves.toBeNull();

    progressRepo.findOneBy.mockResolvedValueOnce(null);
    await expect(service.getView(7, 'maindesk')).resolves.toBeNull();
    await expect(service.getView(7, 'colony')).resolves.toBeNull();
  });

  it('sets only step ids defined for the requested view', async () => {
    const { service, progressRepo } = createService();
    progressRepo.findOneBy.mockResolvedValue({
      userId: 7,
      view: 'maindesk',
      completed: false,
    });

    await expect(service.setStep(7, 'maindesk', 'navigation')).resolves.toEqual({
      currentStepId: 'navigation',
    });
    expect(progressRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ currentStepId: 'navigation', completed: false }),
    );
    await expect(service.setStep(7, 'maindesk', 'missing')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(service.setStep(7, 'colony', 'welcome')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('finishes one view, resets all views and disables every tutorial', async () => {
    const { service, progressRepo } = createService();
    progressRepo.findOneBy.mockResolvedValue({
      userId: 7,
      view: 'maindesk',
      completed: false,
    });

    await service.finish(7, 'maindesk');
    expect(progressRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ completed: true, currentStepId: null }),
    );

    await service.reset(7);
    expect(progressRepo.upsert).toHaveBeenCalledWith(
      [{ userId: 7, view: 'maindesk', currentStepId: 'welcome', completed: false }],
      ['userId', 'view'],
    );

    await service.disable(7);
    expect(progressRepo.delete).toHaveBeenCalledWith({ userId: 7 });
  });

  it('activates tutorials after onboarding', async () => {
    const { service, progressRepo } = createService();

    await service.activateForNewPlayer(7);

    expect(progressRepo.upsert).toHaveBeenCalledWith(
      [{ userId: 7, view: 'maindesk', currentStepId: 'welcome', completed: false }],
      ['userId', 'view'],
    );
  });
});
