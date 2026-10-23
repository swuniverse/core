import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type {
  TutorialDefinitions,
  TutorialView,
  TutorialViewDto,
} from '@swuniverse/shared';
import { Repository } from 'typeorm';
import { UserTutorialProgress } from './entities/user-tutorial-progress.entity';
import {
  TUTORIAL_DEFINITIONS,
  validateTutorialDefinitions,
} from './tutorial-definitions';

@Injectable()
export class TutorialService {
  private readonly definitions: TutorialDefinitions;

  constructor(
    @InjectRepository(UserTutorialProgress)
    private readonly progressRepo: Repository<UserTutorialProgress>,
    definitions: TutorialDefinitions = TUTORIAL_DEFINITIONS,
  ) {
    this.definitions = validateTutorialDefinitions(definitions);
  }

  async getView(userId: number, view: TutorialView): Promise<TutorialViewDto | null> {
    const steps = this.definitions.views[view];
    if (!steps?.length) return null;

    const progress = await this.progressRepo.findOneBy({ userId, view });
    if (!progress || progress.completed) return null;

    return {
      version: this.definitions.version,
      view,
      steps,
      currentStepId: progress.currentStepId ?? steps[0].id,
    };
  }

  async setStep(userId: number, view: TutorialView, stepId: string) {
    const steps = this.requireView(view);
    if (!steps.some((step) => step.id === stepId)) {
      throw new BadRequestException('Unknown tutorial step');
    }
    const progress = await this.requireEnabled(userId, view);
    progress.currentStepId = stepId;
    progress.completed = false;
    await this.progressRepo.save(progress);
    return { currentStepId: stepId };
  }

  async finish(userId: number, view: TutorialView) {
    this.requireView(view);
    const progress = await this.requireEnabled(userId, view);
    progress.currentStepId = null;
    progress.completed = true;
    await this.progressRepo.save(progress);
    return { completed: true };
  }

  async reset(userId: number) {
    await this.writeInitialProgress(userId);
    return { enabled: true };
  }

  async disable(userId: number) {
    await this.progressRepo.delete({ userId });
    return { enabled: false };
  }

  async activateForNewPlayer(userId: number): Promise<void> {
    await this.writeInitialProgress(userId);
  }

  private requireView(view: TutorialView) {
    const steps = this.definitions.views[view];
    if (!steps?.length) throw new NotFoundException('Tutorial view not found');
    return steps;
  }

  private async requireEnabled(userId: number, view: TutorialView) {
    const progress = await this.progressRepo.findOneBy({ userId, view });
    if (!progress) throw new BadRequestException('Tutorials are disabled');
    return progress;
  }

  private async writeInitialProgress(userId: number): Promise<void> {
    const rows = Object.entries(this.definitions.views).flatMap(([view, steps]) =>
      steps?.length
        ? [{
            userId,
            view: view as TutorialView,
            currentStepId: steps[0].id,
            completed: false,
          }]
        : [],
    );
    await this.progressRepo.upsert(rows, ['userId', 'view']);
  }
}
