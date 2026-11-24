import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { TickRunDto, TickRunType } from '@swuniverse/shared';
import { Repository } from 'typeorm';
import { User } from '../auth/user.entity';
import { MessagingService } from '../messaging/messaging.service';
import {
  GameTickState,
  GameTickStatus,
  GameTickType,
} from './entities/game-tick-state.entity';
import { MaintenanceService } from './maintenance.service';
import { TickService } from './tick.service';

const ERROR_PREVIEW_LENGTH = 500;

@Injectable()
export class TickAdminService {
  constructor(
    @InjectRepository(GameTickState)
    private readonly tickStateRepo: Repository<GameTickState>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly messagingService: MessagingService,
    private readonly tickService: TickService,
    private readonly maintenanceService: MaintenanceService,
  ) {}

  async listRuns(limit: number): Promise<TickRunDto[]> {
    const runs = await this.tickStateRepo.find({
      order: { startedAt: 'DESC', id: 'DESC' },
      take: Math.min(Math.max(limit, 1), 100),
    });
    return runs.map((run) => ({
      type: run.tickType,
      tickNumber: run.tickNumber,
      scheduledFor: run.scheduledFor.toISOString(),
      startedAt: run.startedAt?.toISOString() ?? null,
      completedAt: run.completedAt?.toISOString() ?? null,
      durationMs:
        run.startedAt && run.completedAt
          ? run.completedAt.getTime() - run.startedAt.getTime()
          : null,
      status: run.status,
      error: run.error?.slice(0, ERROR_PREVIEW_LENGTH) ?? null,
    }));
  }

  async run(type: TickRunType): Promise<unknown> {
    switch (type) {
      case GameTickType.MAIN:
        return this.runWithFailureNotification(() =>
          this.tickService.triggerManualTick(),
        );
      case GameTickType.BUILDING_COMPLETION:
        return this.runWithFailureNotification(() =>
          this.tickService.checkBuildingCompletions(true),
        );
      case GameTickType.MAINTENANCE: {
        const result = await this.maintenanceService.run();
        await this.notifyFailure(result);
        return result;
      }
      default:
        throw new BadRequestException('Unbekannter Tick-Typ');
    }
  }

  private async runWithFailureNotification<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const failed = await this.tickStateRepo.find({
        where: { status: GameTickStatus.FAILED },
        order: { completedAt: 'DESC', id: 'DESC' },
        take: 1,
      });
      if (failed[0]) await this.notifyFailure(failed[0]);
      throw error;
    }
  }

  async notifyFailure(run: GameTickState): Promise<void> {
    if (run.status !== GameTickStatus.FAILED) return;
    const admins = await this.userRepo.find({
      where: { isAdmin: true },
      select: { id: true },
    });
    const body = `Tick fehlgeschlagen\nTyp: ${run.tickType}\nTick: ${run.tickNumber}\nFehler: ${run.error ?? 'Unbekannter Fehler'}`;
    await Promise.all(
      admins.map((admin) =>
        this.messagingService.sendSystem(
          admin.id,
          body,
          `tick-failed:${run.tickType}:${run.tickNumber}:${admin.id}`,
        ),
      ),
    );
  }
}
