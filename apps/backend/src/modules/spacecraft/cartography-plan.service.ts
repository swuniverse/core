import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
