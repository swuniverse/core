import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { SpacecraftTrackerDto } from '@swuniverse/shared';
import { DataSource, EntityManager } from 'typeorm';
import { Spacecraft } from './entities/spacecraft.entity';
import { InteractionContextService } from './interaction-context.service';
import { checkInteraction, InteractionRule } from './interaction-policy';
import { SpacecraftRuntimeStateService } from './spacecraft-runtime-state.service';

export const TRACKER_MAX_TICKS = 70;
export const TRACKER_ACTIVATION_ENERGY = 15;
export const TRACKER_TICK_ENERGY = 7;

const TRACKING_RULES = [
  InteractionRule.POSITION,
  InteractionRule.SOURCE_CREW,
  InteractionRule.SOURCE_UNSHIELDED,
  InteractionRule.SOURCE_UNCLOAKED,
  InteractionRule.SOURCE_UNHYPERSPACED,
  InteractionRule.TARGET_UNHYPERSPACED,
  InteractionRule.TARGET_UNCLOAKED,
  InteractionRule.TARGET_UNSHIELDED,
  InteractionRule.TARGET_INTACT,
] as const;

@Injectable()
export class SpacecraftTrackerService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly runtimeState: SpacecraftRuntimeStateService,
    private readonly interactionContext: InteractionContextService,
  ) {}

  async track(
    sourceId: number,
    targetId: number,
    userId: number,
  ): Promise<SpacecraftTrackerDto> {
    if (sourceId === targetId) throw new BadRequestException('Ungültiges Ziel');
    return this.dataSource.transaction(async (manager) => {
      const ships = await manager.find(Spacecraft, {
        where: [{ id: sourceId }, { id: targetId }],
        relations: { modules: true, location: { galaxyField: true, systemField: true } },
        lock: { mode: 'pessimistic_write', tables: ['spacecraft'] },
      });
      const source = ships.find((ship) => ship.id === sourceId);
      const target = ships.find((ship) => ship.id === targetId);
      if (!source || source.userId !== userId) {
        throw new NotFoundException('Spacecraft not found');
      }
      if (!target || target.userId === userId) {
        throw new BadRequestException('Zielschiff nicht gefunden');
      }
      const decision = checkInteraction(
        await this.interactionContext.load(source.id, target.id),
        TRACKING_RULES,
      );
      if (!decision.allowed) {
        throw new BadRequestException(decision.reason ?? 'Ziel muss sich auf demselben Feld befinden');
      }
      const systems = this.runtimeState.initialize(source);
      const tracker = systems.TRACKER;
      if (!tracker) throw new BadRequestException('Peilsender nicht verfügbar');
      if (tracker.active || tracker.targetId != null) {
        throw new BadRequestException('Es wird bereits ein Ziel verfolgt');
      }
      if (tracker.integrity <= 0) throw new BadRequestException('Peilsender zerstört');
      if (tracker.cooldown > 0) throw new BadRequestException('Peilsender kühlt noch ab');
      const lrs = systems.LONG_RANGE_SENSORS;
      const nbs = systems.SHORT_RANGE_SENSORS;
      if (!lrs?.active || lrs.integrity <= 0 || !nbs?.active || nbs.integrity <= 0) {
        throw new BadRequestException(
          'Peilsender benötigt aktive intakte Kurz- und Langstreckensensoren',
        );
      }
      if (source.energy < TRACKER_ACTIVATION_ENERGY) {
        throw new BadRequestException('Nicht genug EPS');
      }
      source.energy -= TRACKER_ACTIVATION_ENERGY;
      systems.TRACKER = {
        ...tracker,
        active: true,
        targetId: target.id,
        ticksRemaining: TRACKER_MAX_TICKS,
      };
      source.runtimeSystems = systems;
      await manager.save(source);
      return this.toDto(source, target);
    });
  }

  async deactivate(sourceId: number, userId: number): Promise<void> {
    const source = await this.dataSource.manager.findOne(Spacecraft, {
      where: { id: sourceId, userId },
      relations: { modules: true },
    });
    if (!source) throw new NotFoundException('Spacecraft not found');
    this.clearTracker(source, true);
    await this.dataSource.manager.save(source);
  }

  async get(sourceId: number, userId: number): Promise<SpacecraftTrackerDto | null> {
    const source = await this.dataSource.manager.findOne(Spacecraft, {
      where: { id: sourceId, userId },
      relations: { modules: true },
    });
    if (!source) throw new NotFoundException('Spacecraft not found');
    const tracker = this.runtimeState.initialize(source).TRACKER;
    if (!tracker?.active || tracker.targetId == null) return null;
    const target = await this.dataSource.manager.findOne(Spacecraft, {
      where: { id: tracker.targetId },
      relations: { location: { galaxyField: true, systemField: true } },
    });
    if (!target) return null;
    return this.toDto(source, target);
  }

  async processTick(source: Spacecraft): Promise<void> {
    const systems = this.runtimeState.initialize(source);
    const tracker = systems.TRACKER;
    if (!tracker?.active || tracker.targetId == null) return;
    const target = await this.dataSource.manager.findOne(Spacecraft, {
      where: { id: tracker.targetId },
      relations: { location: { galaxyField: true, systemField: true } },
    });
    if (!target) {
      this.clearTracker(source, true);
      return;
    }
    if (source.energy < TRACKER_TICK_ENERGY || (tracker.ticksRemaining ?? 0) <= 1) {
      this.clearTracker(source, true);
      return;
    }
    source.energy -= TRACKER_TICK_ENERGY;
    systems.TRACKER = { ...tracker, ticksRemaining: (tracker.ticksRemaining ?? 1) - 1 };
    source.runtimeSystems = systems;
  }

  async clearTrackingTarget(manager: EntityManager, targetId: number): Promise<void> {
    const ships = await manager.find(Spacecraft, { relations: { modules: true } });
    for (const source of ships) {
      const tracker = this.runtimeState.initialize(source).TRACKER;
      if (tracker?.targetId !== targetId) continue;
      this.clearTracker(source, true);
      await manager.save(source);
    }
  }

  assertTrackedTarget(source: Spacecraft, targetId: number): void {
    const tracker = this.runtimeState.initialize(source).TRACKER;
    if (!tracker?.active || tracker.targetId !== targetId) {
      throw new BadRequestException('Ziel wird nicht verfolgt');
    }
  }

  private clearTracker(source: Spacecraft, cooldown: boolean): void {
    const systems = this.runtimeState.initialize(source);
    const tracker = systems.TRACKER;
    if (!tracker) return;
    systems.TRACKER = {
      ...tracker,
      active: false,
      cooldown: cooldown ? 1 : tracker.cooldown,
      targetId: undefined,
      ticksRemaining: undefined,
    };
    source.runtimeSystems = systems;
  }

  private toDto(source: Spacecraft, target: Spacecraft): SpacecraftTrackerDto {
    const tracker = this.runtimeState.initialize(source).TRACKER!;
    const location = target.location;
    const field = location?.systemField ?? location?.galaxyField;
    return {
      targetId: target.id,
      targetName: target.name,
      ticksRemaining: tracker.ticksRemaining ?? 0,
      location: location
        ? {
            scope: location.systemField ? 'SYSTEM' : 'GALAXY',
            x: location.systemField?.sx ?? location.galaxyField?.cx ?? 0,
            y: location.systemField?.sy ?? location.galaxyField?.cy ?? 0,
            fieldId: field?.id ?? 0,
          }
        : null,
    };
  }
}
