import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WsEventType } from '@swuniverse/shared';
import { EntityManager, In, LessThanOrEqual, Repository } from 'typeorm';
import { ColonyShipyardService } from '../colony/colony-shipyard.service';
import {
  ColonyShipBuildQueue,
  ColonyShipBuildQueueMode,
  ColonyShipBuildQueueStatus,
  ShipBuildSource,
} from '../colony/entities/colony-ship-build-queue.entity';
import { MessageFolder } from '../messaging/message-folder';
import { MessagingService } from '../messaging/messaging.service';
import { Spacecraft } from '../spacecraft/entities/spacecraft.entity';
import { StationShipyardService } from '../spacecraft/station-shipyard.service';
import { GameGateway } from '../websocket/game.gateway';

/** The minute runner discovers jobs globally; each source rechecks under lock. */
@Injectable()
export class ShipyardCompletionService {
  constructor(
    @InjectRepository(ColonyShipBuildQueue)
    private readonly queueRepo: Repository<ColonyShipBuildQueue>,
    private readonly colonyShipyard: ColonyShipyardService,
    private readonly stationShipyard: StationShipyardService,
    private readonly messaging: MessagingService,
    private readonly gateway: GameGateway,
  ) {}

  findDueJobs(now: Date): Promise<ColonyShipBuildQueue[]> {
    return this.queueRepo.find({
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
  }

  async completeJobs(jobs: ColonyShipBuildQueue[]): Promise<void> {
    for (const job of jobs) {
      const afterCommit: Array<() => void> = [];
      const retrofit = job.mode === ColonyShipBuildQueueMode.RETROFIT;
      const type = retrofit
        ? 'SHIP_RETROFIT_COMPLETED'
        : 'SHIP_BUILD_COMPLETED';
      const onCompleted = async (manager: EntityManager, ship: Spacecraft) => {
        await this.messaging.sendSystem(
          job.userId,
          retrofit ? 'Schiffsumrüstung abgeschlossen' : 'Schiff fertiggestellt',
          retrofit
            ? `Die Umrüstung von ${ship.name} wurde abgeschlossen.`
            : `${ship.name} wurde fertiggestellt.`,
          `shipyard-completed:${job.id}`,
          MessageFolder.SHIP,
          undefined,
          false,
          { manager, afterCommit },
        );
      };
      const ship =
        job.source === ShipBuildSource.STATION
          ? await this.stationShipyard.completeJob(job, onCompleted)
          : await this.colonyShipyard.completeJob(job, onCompleted);
      if (!ship) continue;
      for (const notify of afterCommit) notify();
      const detail = retrofit
        ? `Die Umrüstung von ${ship.name} wurde abgeschlossen.`
        : `${ship.name} wurde fertiggestellt.`;
      this.gateway.emitToUser(job.userId, WsEventType.SPACECRAFT_EVENT, {
        shipId: ship.id,
        type,
        detail,
      });
      if (job.colonyId != null) {
        this.gateway.emitToUser(job.userId, WsEventType.COLONY_UPDATED, {
          colonyId: job.colonyId,
        });
      }
    }
  }
}
