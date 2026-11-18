jest.mock('../starmap/entities/space-location.entity', () => ({
  SpaceLocation: class SpaceLocation {},
}));

import { WsEventType } from '@swuniverse/shared';
import { In, LessThanOrEqual } from 'typeorm';
import {
  ColonyShipBuildQueue,
  ColonyShipBuildQueueMode,
  ColonyShipBuildQueueStatus,
  ShipBuildSource,
} from '../colony/entities/colony-ship-build-queue.entity';
import { MessageFolder } from '../messaging/message-folder';
import { ShipyardCompletionService } from './shipyard-completion.service';

function job(
  id: number,
  source: ShipBuildSource,
  mode: ColonyShipBuildQueueMode,
): ColonyShipBuildQueue {
  return {
    id,
    source,
    mode,
    status: ColonyShipBuildQueueStatus.QUEUED,
    userId: 100 + id,
    colonyId: source === ShipBuildSource.COLONY ? 20 : null,
    stationId: source === ShipBuildSource.STATION ? 30 : null,
  } as ColonyShipBuildQueue;
}

function completionWithCallback(
  ship: { id: number; name: string },
  manager: object,
) {
  return async (
    _job: ColonyShipBuildQueue,
    onCompleted?: (
      manager: object,
      ship: { id: number; name: string },
    ) => Promise<void>,
  ) => {
    await onCompleted?.(manager, ship);
    return ship;
  };
}

function fixture() {
  const queueRepo = { find: jest.fn() };
  const manager = { transactionId: 'shipyard-completion-test' };
  const deferredMessageNotification = jest.fn();
  const colonyShipyard = { completeJob: jest.fn() };
  const stationShipyard = { completeJob: jest.fn() };
  const messaging = {
    sendSystem: jest.fn(async (...args: unknown[]) => {
      const transaction = args[7] as
        | { manager: object; afterCommit: Array<() => void> }
        | undefined;
      transaction?.afterCommit.push(deferredMessageNotification);
    }),
  };
  const gateway = { emitToUser: jest.fn() };
  const service = new ShipyardCompletionService(
    queueRepo as never,
    colonyShipyard as never,
    stationShipyard as never,
    messaging as never,
    gateway as never,
  );

  return {
    service,
    queueRepo,
    manager,
    deferredMessageNotification,
    colonyShipyard,
    stationShipyard,
    messaging,
    gateway,
  };
}

describe('ShipyardCompletionService', () => {
  it('queries queued builds and retrofits globally through the deadline in deadline/id order', async () => {
    const { service, queueRepo } = fixture();
    const now = new Date('2026-11-18T12:34:00.000Z');
    const due = [
      job(1, ShipBuildSource.COLONY, ColonyShipBuildQueueMode.BUILD),
    ];
    queueRepo.find.mockResolvedValue(due);

    await expect(service.findDueJobs(now)).resolves.toBe(due);

    expect(queueRepo.find).toHaveBeenCalledTimes(1);
    expect(queueRepo.find).toHaveBeenCalledWith({
      where: {
        mode: In([
          ColonyShipBuildQueueMode.BUILD,
          ColonyShipBuildQueueMode.RETROFIT,
        ]),
        status: ColonyShipBuildQueueStatus.QUEUED,
        finishesAt: LessThanOrEqual(now),
      },
      order: { finishesAt: 'ASC', id: 'ASC' },
    });
    const [query] = queueRepo.find.mock.calls[0];
    expect(query.where).not.toHaveProperty('colonyId');
    expect(query.where).not.toHaveProperty('stationId');
  });

  it('dispatches colony builds, colony retrofits, and station builds and notifies each winner', async () => {
    const f = fixture();
    const colonyBuild = job(
      1,
      ShipBuildSource.COLONY,
      ColonyShipBuildQueueMode.BUILD,
    );
    const colonyRetrofit = job(
      2,
      ShipBuildSource.COLONY,
      ColonyShipBuildQueueMode.RETROFIT,
    );
    const stationBuild = job(
      3,
      ShipBuildSource.STATION,
      ColonyShipBuildQueueMode.BUILD,
    );
    const colonyShip = { id: 501, name: 'Kolonieschiff' };
    const retrofittedShip = { id: 502, name: 'Umgerüstetes Schiff' };
    const stationShip = { id: 503, name: 'Stationsschiff' };

    f.colonyShipyard.completeJob
      .mockImplementationOnce(completionWithCallback(colonyShip, f.manager))
      .mockImplementationOnce(
        completionWithCallback(retrofittedShip, f.manager),
      );
    f.stationShipyard.completeJob.mockImplementationOnce(
      completionWithCallback(stationShip, f.manager),
    );

    await f.service.completeJobs([colonyBuild, colonyRetrofit, stationBuild]);

    expect(f.colonyShipyard.completeJob.mock.calls).toEqual([
      [colonyBuild, expect.any(Function)],
      [colonyRetrofit, expect.any(Function)],
    ]);
    expect(f.stationShipyard.completeJob).toHaveBeenCalledWith(
      stationBuild,
      expect.any(Function),
    );
    expect(f.messaging.sendSystem).toHaveBeenNthCalledWith(
      1,
      colonyBuild.userId,
      'Schiff fertiggestellt',
      'Kolonieschiff wurde fertiggestellt.',
      'shipyard-completed:1',
      MessageFolder.SHIP,
      undefined,
      false,
      expect.objectContaining({
        manager: f.manager,
        afterCommit: expect.any(Array),
      }),
    );
    expect(f.messaging.sendSystem).toHaveBeenNthCalledWith(
      2,
      colonyRetrofit.userId,
      'Schiffsumrüstung abgeschlossen',
      'Die Umrüstung von Umgerüstetes Schiff wurde abgeschlossen.',
      'shipyard-completed:2',
      MessageFolder.SHIP,
      undefined,
      false,
      expect.objectContaining({
        manager: f.manager,
        afterCommit: expect.any(Array),
      }),
    );
    expect(f.messaging.sendSystem).toHaveBeenNthCalledWith(
      3,
      stationBuild.userId,
      'Schiff fertiggestellt',
      'Stationsschiff wurde fertiggestellt.',
      'shipyard-completed:3',
      MessageFolder.SHIP,
      undefined,
      false,
      expect.objectContaining({
        manager: f.manager,
        afterCommit: expect.any(Array),
      }),
    );
    expect(f.deferredMessageNotification).toHaveBeenCalledTimes(3);
    expect(f.gateway.emitToUser.mock.calls).toEqual([
      [
        colonyBuild.userId,
        WsEventType.SPACECRAFT_EVENT,
        {
          shipId: colonyShip.id,
          type: 'SHIP_BUILD_COMPLETED',
          detail: 'Kolonieschiff wurde fertiggestellt.',
        },
      ],
      [
        colonyBuild.userId,
        WsEventType.COLONY_UPDATED,
        { colonyId: colonyBuild.colonyId },
      ],
      [
        colonyRetrofit.userId,
        WsEventType.SPACECRAFT_EVENT,
        {
          shipId: retrofittedShip.id,
          type: 'SHIP_RETROFIT_COMPLETED',
          detail: 'Die Umrüstung von Umgerüstetes Schiff wurde abgeschlossen.',
        },
      ],
      [
        colonyRetrofit.userId,
        WsEventType.COLONY_UPDATED,
        { colonyId: colonyRetrofit.colonyId },
      ],
      [
        stationBuild.userId,
        WsEventType.SPACECRAFT_EVENT,
        {
          shipId: stationShip.id,
          type: 'SHIP_BUILD_COMPLETED',
          detail: 'Stationsschiff wurde fertiggestellt.',
        },
      ],
    ]);
  });

  it('skips messaging and events when either source reports a lost or cancelled job', async () => {
    const f = fixture();
    const colonyJob = job(
      4,
      ShipBuildSource.COLONY,
      ColonyShipBuildQueueMode.BUILD,
    );
    const stationJob = job(
      5,
      ShipBuildSource.STATION,
      ColonyShipBuildQueueMode.BUILD,
    );
    f.colonyShipyard.completeJob.mockResolvedValue(null);
    f.stationShipyard.completeJob.mockResolvedValue(null);

    await f.service.completeJobs([colonyJob, stationJob]);

    expect(f.colonyShipyard.completeJob).toHaveBeenCalledWith(
      colonyJob,
      expect.any(Function),
    );
    expect(f.stationShipyard.completeJob).toHaveBeenCalledWith(
      stationJob,
      expect.any(Function),
    );
    expect(f.messaging.sendSystem).not.toHaveBeenCalled();
    expect(f.deferredMessageNotification).not.toHaveBeenCalled();
    expect(f.gateway.emitToUser).not.toHaveBeenCalled();
  });

  it('propagates completion and transactional notification failures', async () => {
    const completionFixture = fixture();
    const colonyJob = job(
      6,
      ShipBuildSource.COLONY,
      ColonyShipBuildQueueMode.BUILD,
    );
    const completionError = new Error('completion failed');
    completionFixture.colonyShipyard.completeJob.mockRejectedValue(
      completionError,
    );

    await expect(
      completionFixture.service.completeJobs([colonyJob]),
    ).rejects.toBe(completionError);
    expect(completionFixture.messaging.sendSystem).not.toHaveBeenCalled();
    expect(completionFixture.gateway.emitToUser).not.toHaveBeenCalled();

    const notificationFixture = fixture();
    const ship = { id: 506, name: 'Nachrichtenschiff' };
    const notificationError = new Error('notification failed');
    notificationFixture.colonyShipyard.completeJob.mockImplementationOnce(
      async (
        _job: ColonyShipBuildQueue,
        onCompleted?: (
          manager: object,
          completedShip: { id: number; name: string },
        ) => Promise<void>,
      ) => {
        notificationFixture.messaging.sendSystem.mockRejectedValueOnce(
          notificationError,
        );
        await onCompleted?.(notificationFixture.manager, ship);
        return ship;
      },
    );

    await expect(
      notificationFixture.service.completeJobs([colonyJob]),
    ).rejects.toBe(notificationError);
    expect(notificationFixture.gateway.emitToUser).not.toHaveBeenCalled();
  });
});
