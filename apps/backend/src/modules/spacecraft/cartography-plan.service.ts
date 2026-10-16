import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { SystemField } from '../starmap/entities/system-field.entity';
import { SystemExploration } from '../starmap/entities/system-exploration.entity';
import {
  CartographyPlan,
  CartographyPlanStatus,
} from './entities/cartography-plan.entity';

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: string }).code === '23505'
  );
}

@Injectable()
export class CartographyPlanService {
  constructor(
    @InjectRepository(CartographyPlan)
    private readonly planRepo: Repository<CartographyPlan>,
  ) {}

  async createPlan(
    userId: number,
    starSystemId: number,
    remainingFieldIds: number[],
  ): Promise<CartographyPlan> {
    const existing = await this.planRepo.findOne({
      where: { userId, starSystemId },
    });
    if (existing) return existing;

    const plan = this.planRepo.create({
      userId,
      starSystemId,
      status:
        remainingFieldIds.length === 0
          ? CartographyPlanStatus.MEASURED
          : CartographyPlanStatus.PLANNED,
      remainingFieldIds,
      finalizationStartedAt: null,
      finalizationTick: null,
      finalizingSpacecraftId: null,
      completedAt: null,
    });

    try {
      return await this.planRepo.save(plan);
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const concurrent = await this.planRepo.findOne({
        where: { userId, starSystemId },
      });
      if (concurrent) return concurrent;
      throw error;
    }
  }

  async getPlan(
    userId: number,
    starSystemId: number,
  ): Promise<CartographyPlan | null> {
    return this.planRepo.findOne({ where: { userId, starSystemId } });
  }

  async claimArrivedField(
    userId: number,
    starSystemId: number,
    fieldId: number,
  ): Promise<{ claimed: boolean; completed: boolean }> {
    return this.planRepo.manager.transaction(async (manager) => {
      const repo = manager.getRepository(CartographyPlan);
      const plan = await repo.findOne({
        where: { userId, starSystemId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!plan || plan.status !== CartographyPlanStatus.PLANNED) {
        return { claimed: false, completed: false };
      }
      const alreadyExplored = await manager.getRepository(SystemExploration).findOne({
        where: { userId, starSystemId },
      });
      if (alreadyExplored) {
        plan.remainingFieldIds = [];
        plan.status = CartographyPlanStatus.MEASURED;
        await repo.save(plan);
        return { claimed: false, completed: false };
      }

      const validFields = new Set(
        (
          await manager
            .getRepository(SystemField)
            .find({ where: { starSystemId, id: In(plan.remainingFieldIds) } })
        ).map((field) => field.id),
      );
      const remainingFieldIds = plan.remainingFieldIds.filter((id) =>
        validFields.has(id),
      );
      const arrivalIsRemaining = remainingFieldIds.includes(fieldId);
      if (arrivalIsRemaining) {
        plan.remainingFieldIds = remainingFieldIds.filter((id) => id !== fieldId);
      } else if (remainingFieldIds.length !== plan.remainingFieldIds.length) {
        plan.remainingFieldIds = remainingFieldIds;
      } else {
        return { claimed: false, completed: false };
      }

      const completed = plan.remainingFieldIds.length === 0;
      if (completed) plan.status = CartographyPlanStatus.MEASURED;
      await repo.save(plan);
      return {
        claimed: arrivalIsRemaining,
        completed: arrivalIsRemaining && completed,
      };
    });
  }

  async transitionToMeasured(
    userId: number,
    starSystemId: number,
  ): Promise<CartographyPlan> {
    const plan = await this.requirePlan(userId, starSystemId);
    if (plan.status === CartographyPlanStatus.DONE) return plan;
    if (plan.status === CartographyPlanStatus.FINISHING) {
      throw new BadRequestException(
        'Die Kartographie wird bereits finalisiert',
      );
    }
    plan.status = CartographyPlanStatus.MEASURED;
    plan.remainingFieldIds = [];
    return this.planRepo.save(plan);
  }

  async resetFinishingForSpacecraft(spacecraftId: number): Promise<void> {
    const plan = await this.planRepo.findOne({
      where: {
        finalizingSpacecraftId: spacecraftId,
        status: CartographyPlanStatus.FINISHING,
      },
    });
    if (!plan) return;
    plan.status = CartographyPlanStatus.MEASURED;
    plan.finalizingSpacecraftId = null;
    plan.finalizationStartedAt = null;
    plan.finalizationTick = null;
    await this.planRepo.save(plan);
  }

  async progressFinalization(spacecraftId: number): Promise<{
    completed: boolean;
    userId: number | null;
    starSystemId: number | null;
  }> {
    return this.planRepo.manager.transaction(async (manager) => {
      const repo = manager.getRepository(CartographyPlan);
      const plan = await repo.findOne({
        where: {
          finalizingSpacecraftId: spacecraftId,
          status: CartographyPlanStatus.FINISHING,
        },
        lock: { mode: 'pessimistic_write' },
      });
      if (!plan) {
        return { completed: false, userId: null, starSystemId: null };
      }

      const explorationRepo = manager.getRepository(SystemExploration);
      const alreadyExplored = await explorationRepo.findOne({
        where: { userId: plan.userId, starSystemId: plan.starSystemId },
      });
      if (alreadyExplored) {
        plan.status = CartographyPlanStatus.DONE;
        plan.finalizingSpacecraftId = null;
        plan.completedAt = new Date();
        await repo.save(plan);
        return { completed: false, userId: null, starSystemId: null };
      }

      plan.finalizationTick = (plan.finalizationTick ?? 0) + 1;
      if (plan.finalizationTick < 3) {
        await repo.save(plan);
        return { completed: false, userId: null, starSystemId: null };
      }

      const discovery = explorationRepo.create({
        userId: plan.userId,
        starSystemId: plan.starSystemId,
        discoverySource: 'CARTOGRAPHY',
      });
      try {
        await explorationRepo.save(discovery);
      } catch (error) {
        if (!isUniqueViolation(error)) throw error;
        plan.status = CartographyPlanStatus.DONE;
        plan.finalizingSpacecraftId = null;
        plan.completedAt = new Date();
        await repo.save(plan);
        return { completed: false, userId: null, starSystemId: null };
      }

      const completedUserId = plan.userId;
      const completedStarSystemId = plan.starSystemId;
      plan.status = CartographyPlanStatus.DONE;
      plan.finalizingSpacecraftId = null;
      plan.completedAt = new Date();
      await repo.save(plan);
      return {
        completed: true,
        userId: completedUserId,
        starSystemId: completedStarSystemId,
      };
    });
  }

  async startFinalization(
    userId: number,
    starSystemId: number,
    spacecraftId: number,
    startedAt = new Date(),
  ): Promise<CartographyPlan> {
    const plan = await this.requirePlan(userId, starSystemId);
    if (plan.status === CartographyPlanStatus.FINISHING) {
      throw new BadRequestException(
        'Die Kartographie wird bereits finalisiert',
      );
    }
    if (plan.status !== CartographyPlanStatus.MEASURED) {
      throw new BadRequestException(
        'Die Kartographie kann noch nicht finalisiert werden',
      );
    }

    plan.status = CartographyPlanStatus.FINISHING;
    plan.finalizingSpacecraftId = spacecraftId;
    plan.finalizationStartedAt = startedAt;
    plan.finalizationTick = 0;
    try {
      return await this.planRepo.save(plan);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BadRequestException(
          'Die Kartographie wird bereits finalisiert',
        );
      }
      throw error;
    }
  }

  private async requirePlan(
    userId: number,
    starSystemId: number,
  ): Promise<CartographyPlan> {
    const plan = await this.planRepo.findOne({
      where: { userId, starSystemId },
    });
    if (!plan) throw new NotFoundException('Kein Kartographieplan vorhanden');
    return plan;
  }
}
