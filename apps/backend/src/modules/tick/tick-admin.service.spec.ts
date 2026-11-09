import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  GameTickState,
  GameTickStatus,
  GameTickType,
} from './entities/game-tick-state.entity';
import { User } from '../auth/user.entity';
import { MessagingService } from '../messaging/messaging.service';
import { MaintenanceService } from './maintenance.service';
import { TickService } from './tick.service';
import { TickAdminService } from './tick-admin.service';

describe('TickAdminService', () => {
  it('can be initialized by Nest with the TickModule TickService provider', async () => {
    await expect(
      Test.createTestingModule({
        providers: [
          TickAdminService,
          { provide: getRepositoryToken(GameTickState), useValue: {} },
          { provide: getRepositoryToken(User), useValue: {} },
          { provide: MessagingService, useValue: {} },
          { provide: TickService, useValue: {} },
          { provide: MaintenanceService, useValue: {} },
        ],
      }).compile(),
    ).resolves.toBeDefined();
  });

  const createService = () => {
    const tickStateRepo = {
      find: jest.fn(),
    };
    const userRepo = {
      find: jest.fn(),
    };
    const messagingService = {
      sendSystem: jest.fn(),
    };
    const tickService = {
      triggerManualTick: jest.fn(),
      checkBuildingCompletions: jest.fn(),
      checkWarpArrivals: jest.fn(),
    };
    const maintenanceService = { run: jest.fn() };
    return {
      service: new TickAdminService(
        tickStateRepo as any,
        userRepo as any,
        messagingService as any,
        tickService as any,
        maintenanceService as any,
      ),
      tickStateRepo,
      userRepo,
      messagingService,
    };
  };

  it('lists latest runs in descending start order with bounded errors', async () => {
    const { service, tickStateRepo } = createService();
    tickStateRepo.find.mockResolvedValue([
      {
        tickType: GameTickType.MAIN,
        tickNumber: 42,
        scheduledFor: new Date('2026-10-27T12:00:00Z'),
        startedAt: new Date('2026-10-27T12:00:01Z'),
        completedAt: new Date('2026-10-27T12:00:04Z'),
        status: GameTickStatus.FAILED,
        error: 'x'.repeat(600),
      },
    ]);

    const result = await service.listRuns(50);

    expect(tickStateRepo.find).toHaveBeenCalledWith({
      order: { startedAt: 'DESC', id: 'DESC' },
      take: 50,
    });
    expect(result[0]).toEqual(
      expect.objectContaining({ durationMs: 3000, error: 'x'.repeat(500) }),
    );
  });

  it('notifies every admin exactly once for a failed run', async () => {
    const { service, userRepo, messagingService } = createService();
    userRepo.find.mockResolvedValue([{ id: 7 }, { id: 9 }]);

    await service.notifyFailure({
      tickType: GameTickType.MAINTENANCE,
      tickNumber: 20261027,
      status: GameTickStatus.FAILED,
      error: 'handler failed',
    } as any);

    expect(messagingService.sendSystem).toHaveBeenCalledTimes(2);
    expect(messagingService.sendSystem).toHaveBeenCalledWith(
      7,
      'Tick fehlgeschlagen',
      expect.stringContaining('handler failed'),
      'tick-failed:MAINTENANCE:20261027:7',
    );
  });
});
