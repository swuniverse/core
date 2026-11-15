import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { GalaxyField } from '../starmap/entities/galaxy-field.entity';
import { RegionDiscovery, RegionDiscoverySource } from '../starmap/entities/region-discovery.entity';
import { SystemField } from '../starmap/entities/system-field.entity';
import { SystemExploration } from '../starmap/entities/system-exploration.entity';
import {
  CartographyCompletionOutcome,
  CartographyPlan,
  CartographyPlanStatus,
  CartographyTargetType,
} from './entities/cartography-plan.entity';

/** Exactly one chart target: a star system or a map region. */
export type CartographyTarget =
  | { type: CartographyTargetType.SYSTEM; starSystemId: number }
  | { type: CartographyTargetType.REGION; mapRegionId: number };

export const systemTarget = (starSystemId: number): CartographyTarget => ({
  type: CartographyTargetType.SYSTEM,
  starSystemId,
});

export const regionTarget = (mapRegionId: number): CartographyTarget => ({
  type: CartographyTargetType.REGION,
  mapRegionId,
});

/** Query and column values of a target; rejects anything but one valid id. */
export function cartographyTargetColumns(target: CartographyTarget): Pick<
  CartographyPlan,
  'targetType' | 'starSystemId' | 'mapRegionId'
> {
  const id =
    target.type === CartographyTargetType.SYSTEM
      ? target.starSystemId
      : target.type === CartographyTargetType.REGION
        ? target.mapRegionId
        : undefined;
  if (!Number.isInteger(id) || (id as number) <= 0) {
    throw new BadRequestException('Ungültiges Kartographieziel');
  }
  return target.type === CartographyTargetType.SYSTEM
    ? { targetType: target.type, starSystemId: target.starSystemId, mapRegionId: null }
    : { targetType: target.type, starSystemId: null, mapRegionId: target.mapRegionId };
}

/** Lookup condition of a target; the partial unique indexes cover it. */
function cartographyTargetWhere(target: CartographyTarget) {
  const columns = cartographyTargetColumns(target);
  return columns.targetType === CartographyTargetType.SYSTEM
    ? { targetType: columns.targetType, starSystemId: columns.starSystemId as number }
    : { targetType: columns.targetType, mapRegionId: columns.mapRegionId as number };
}

/** Books the reward of a charted region inside the completing transaction. */
export type RegionChartedHandler = (
  manager: EntityManager,
  charted: { userId: number; mapRegionId: number },
) => Promise<void>;

/** The target a stored plan charts. */
export function cartographyPlanTarget(
  plan: Pick<CartographyPlan, 'targetType' | 'starSystemId' | 'mapRegionId'>,
): CartographyTarget {
  return plan.targetType === CartographyTargetType.REGION
    ? regionTarget(plan.mapRegionId as number)
    : systemTarget(plan.starSystemId as number);
}

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
    target: CartographyTarget,
    remainingFieldIds: number[],
  ): Promise<CartographyPlan> {
    const columns = cartographyTargetColumns(target);
    const where = { userId, ...cartographyTargetWhere(target) };
    const existing = await this.planRepo.findOne({ where });
    if (existing) return existing;

    const plan = this.planRepo.create({
      userId,
      ...columns,
      status:
        remainingFieldIds.length === 0
          ? CartographyPlanStatus.MEASURED
          : CartographyPlanStatus.PLANNED,
      remainingFieldIds,
      finalizationStartedAt: null,
      finalizationTick: null,
      finalizingSpacecraftId: null,
      completedAt: null,
      completionOutcome: null,
    });

    try {
      return await this.planRepo.save(plan);
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const concurrent = await this.planRepo.findOne({ where });
      if (concurrent) return concurrent;
      throw error;
    }
  }

  async getPlan(
    userId: number,
    target: CartographyTarget,
  ): Promise<CartographyPlan | null> {
    return this.planRepo.findOne({
      where: { userId, ...cartographyTargetWhere(target) },
    });
  }

  async getPlanForFinalizingSpacecraft(
    spacecraftId: number,
  ): Promise<CartographyPlan | null> {
    return this.planRepo.findOne({
      where: {
        finalizingSpacecraftId: spacecraftId,
        status: CartographyPlanStatus.FINISHING,
      },
    });
  }

  async claimArrivedField(
    userId: number,
    starSystemId: number,
    fieldId: number,
  ): Promise<{ claimed: boolean; completed: boolean }> {
    return this.claimArrived(userId, systemTarget(starSystemId), fieldId);
  }

  /** STU `AstroMappingConsequence` on the galaxy map: a region measure point. */
  async claimArrivedRegionField(
    userId: number,
    mapRegionId: number,
    fieldId: number,
  ): Promise<{ claimed: boolean; completed: boolean }> {
    return this.claimArrived(userId, regionTarget(mapRegionId), fieldId);
  }

  private async claimArrived(
    userId: number,
    target: CartographyTarget,
    fieldId: number,
  ): Promise<{ claimed: boolean; completed: boolean }> {
    return this.planRepo.manager.transaction(async (manager) => {
      const repo = manager.getRepository(CartographyPlan);
      const plan = await repo.findOne({
        where: { userId, ...cartographyTargetWhere(target) },
        lock: { mode: 'pessimistic_write' },
      });
      if (!plan || plan.status !== CartographyPlanStatus.PLANNED) {
        return { claimed: false, completed: false };
      }
      if (await this.isDiscovered(manager, userId, target)) {
        this.completeWithoutReward(plan);
        await repo.save(plan);
        return { claimed: false, completed: false };
      }

      const validFields = new Set(
        (target.type === CartographyTargetType.SYSTEM
          ? await manager
              .getRepository(SystemField)
              .find({ where: { starSystemId: target.starSystemId, id: In(plan.remainingFieldIds) } })
          : await manager
              .getRepository(GalaxyField)
              .find({ where: { regionId: target.mapRegionId, id: In(plan.remainingFieldIds) } })
        ).map((field) => field.id),
      );
      const remainingFieldIds = plan.remainingFieldIds.filter((id) =>
        validFields.has(id),
      );
      const arrivalIsRemaining = remainingFieldIds.includes(fieldId);
      const fieldsDisappeared =
        remainingFieldIds.length !== plan.remainingFieldIds.length;
      if (fieldsDisappeared) {
        plan.remainingFieldIds = arrivalIsRemaining
          ? remainingFieldIds.filter((id) => id !== fieldId)
          : remainingFieldIds;
        this.completeWithoutReward(plan);
        await repo.save(plan);
        return { claimed: false, completed: false };
      }
      if (!arrivalIsRemaining) {
        return { claimed: false, completed: false };
      }

      plan.remainingFieldIds = remainingFieldIds.filter((id) => id !== fieldId);
      const completed = plan.remainingFieldIds.length === 0;
      if (completed) {
        plan.status = CartographyPlanStatus.MEASURED;
        plan.completionOutcome = null;
      }
      await repo.save(plan);
      return {
        claimed: arrivalIsRemaining,
        completed: arrivalIsRemaining && completed,
      };
    });
  }

  private async isDiscovered(
    manager: EntityManager,
    userId: number,
    target: CartographyTarget,
  ): Promise<boolean> {
    const discovery =
      target.type === CartographyTargetType.SYSTEM
        ? await manager.getRepository(SystemExploration).findOne({ where: { userId, starSystemId: target.starSystemId } })
        : await manager.getRepository(RegionDiscovery).findOne({ where: { userId, mapRegionId: target.mapRegionId } });
    return discovery != null;
  }

  async transitionToMeasured(
    userId: number,
    target: CartographyTarget,
  ): Promise<CartographyPlan> {
    const plan = await this.requirePlan(userId, target);
    if (plan.status === CartographyPlanStatus.DONE) return plan;
    if (plan.status === CartographyPlanStatus.FINISHING) {
      throw new BadRequestException(
        'Die Kartographie wird bereits finalisiert',
      );
    }
    plan.status = CartographyPlanStatus.MEASURED;
    plan.completionOutcome = null;
    plan.remainingFieldIds = [];
    return this.planRepo.save(plan);
  }

  async resetFinishingForSpacecraft(spacecraftId: number, manager?: EntityManager): Promise<void> {
    const repository = manager?.getRepository(CartographyPlan) ?? this.planRepo;
    const plan = await repository.findOne({
      where: {
        finalizingSpacecraftId: spacecraftId,
        status: CartographyPlanStatus.FINISHING,
      },
      ...(manager ? { lock: { mode: 'pessimistic_write' as const, onLocked: 'nowait' as const } } : {}),
    });
    if (!plan) return;
    plan.status = CartographyPlanStatus.MEASURED;
    plan.completionOutcome = null;
    plan.finalizingSpacecraftId = null;
    plan.finalizationStartedAt = null;
    plan.finalizationTick = null;
    await repository.save(plan);
  }

  /**
   * One finalization tick; the third completes the plan. A region completes
   * with exactly one `RegionDiscovery`, and `onRegionCharted` books its
   * reward in the same transaction.
   */
  async progressFinalization(
    spacecraftId: number,
    onRegionCharted?: RegionChartedHandler,
  ): Promise<{
    completed: boolean;
    userId: number | null;
    starSystemId: number | null;
    mapRegionId?: number;
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
      if (plan.targetType === CartographyTargetType.REGION && plan.mapRegionId != null) {
        return this.progressRegionFinalization(manager, plan, plan.mapRegionId, onRegionCharted);
      }
      if (plan.starSystemId == null) {
        return { completed: false, userId: null, starSystemId: null };
      }

      const explorationRepo = manager.getRepository(SystemExploration);
      const alreadyExplored = await explorationRepo.findOne({
        where: { userId: plan.userId, starSystemId: plan.starSystemId },
      });
      if (alreadyExplored) {
        this.completeWithoutReward(plan);
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
        this.completeWithoutReward(plan);
        await repo.save(plan);
        return { completed: false, userId: null, starSystemId: null };
      }

      const completedUserId = plan.userId;
      const completedStarSystemId = plan.starSystemId;
      plan.status = CartographyPlanStatus.DONE;
      plan.completionOutcome = CartographyCompletionOutcome.SUCCESS;
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
    target: CartographyTarget,
    spacecraftId: number,
    startedAt = new Date(),
  ): Promise<CartographyPlan> {
    const plan = await this.requirePlan(userId, target);
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
    plan.completionOutcome = null;
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

  private async progressRegionFinalization(
    manager: EntityManager,
    plan: CartographyPlan,
    mapRegionId: number,
    onRegionCharted?: RegionChartedHandler,
  ): Promise<{ completed: boolean; userId: number | null; starSystemId: null; mapRegionId?: number }> {
    const repo = manager.getRepository(CartographyPlan);
    const notCompleted = { completed: false, userId: null, starSystemId: null } as const;
    if (await this.isDiscovered(manager, plan.userId, regionTarget(mapRegionId))) {
      this.completeWithoutReward(plan);
      await repo.save(plan);
      return notCompleted;
    }
    plan.finalizationTick = (plan.finalizationTick ?? 0) + 1;
    if (plan.finalizationTick < 3) {
      await repo.save(plan);
      return notCompleted;
    }
    const inserted = await manager
      .getRepository(RegionDiscovery)
      .createQueryBuilder()
      .insert()
      .values({ userId: plan.userId, mapRegionId, source: RegionDiscoverySource.CARTOGRAPHY })
      .orIgnore()
      .execute();
    if ((inserted.raw as unknown[]).length === 0) {
      this.completeWithoutReward(plan);
      await repo.save(plan);
      return notCompleted;
    }
    plan.status = CartographyPlanStatus.DONE;
    plan.completionOutcome = CartographyCompletionOutcome.SUCCESS;
    plan.finalizingSpacecraftId = null;
    plan.completedAt = new Date();
    await repo.save(plan);
    await onRegionCharted?.(manager, { userId: plan.userId, mapRegionId });
    return { completed: true, userId: plan.userId, starSystemId: null, mapRegionId };
  }

  private completeWithoutReward(plan: CartographyPlan): void {
    plan.status = CartographyPlanStatus.DONE;
    plan.completionOutcome = CartographyCompletionOutcome.INVALIDATED;
    plan.finalizingSpacecraftId = null;
    plan.finalizationStartedAt = null;
    plan.finalizationTick = null;
    plan.completedAt = new Date();
  }

  private async requirePlan(
    userId: number,
    target: CartographyTarget,
  ): Promise<CartographyPlan> {
    const plan = await this.getPlan(userId, target);
    if (!plan) throw new NotFoundException('Kein Kartographieplan vorhanden');
    return plan;
  }
}
