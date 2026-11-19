import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WsEventType } from '@swuniverse/shared';
import { In, LessThanOrEqual, Repository } from 'typeorm';
import { ColonyShipyardService } from '../colony/colony-shipyard.service';
import { Colony } from '../colony/entities/colony.entity';
import {
  ColonyShipBuildQueue,
  ColonyShipBuildQueueMode,
  ColonyShipBuildQueueStatus,
} from '../colony/entities/colony-ship-build-queue.entity';
import { Spacecraft } from '../spacecraft/entities/spacecraft.entity';
import { SpacecraftRepairTask } from '../spacecraft/entities/spacecraft-repair-task.entity';
import { StationShipRepair } from '../spacecraft/entities/station-ship-repair.entity';
import { SpacecraftRepairService } from '../spacecraft/spacecraft-repair.service';
import { StationRepairService } from '../spacecraft/station-repair.service';
import { GameGateway } from '../websocket/game.gateway';

/**
 * STU `FinishPassiveShipRepairJobs` and `RepairTaskJobs`: colony shipyard and
 * station repair queues and on-board system repairs, every minute. Each step
 * re-checks its due time under its own lock; station self-repair stays in the
 * main tick like STU `StationPassiveRepairHandler`.
 */
@Injectable()
export class RepairCompletionService {
  constructor(
    @InjectRepository(ColonyShipBuildQueue)
    private readonly queueRepo: Repository<ColonyShipBuildQueue>,
    @InjectRepository(Colony)
    private readonly colonyRepo: Repository<Colony>,
    @InjectRepository(StationShipRepair)
    private readonly stationRepairRepo: Repository<StationShipRepair>,
    @InjectRepository(SpacecraftRepairTask)
    private readonly repairTaskRepo: Repository<SpacecraftRepairTask>,
    @InjectRepository(Spacecraft)
    private readonly shipRepo: Repository<Spacecraft>,
    private readonly colonyShipyard: ColonyShipyardService,
    private readonly stationRepairs: StationRepairService,
    private readonly shipRepairs: SpacecraftRepairService,
    private readonly gateway: GameGateway,
  ) {}

  /** Whether anything could need a step now (keeps empty minutes out of the tick history). */
  async hasWork(now: Date): Promise<boolean> {
    const [colonyJobs, stationJobs, shipTasks] = await Promise.all([
      this.queueRepo.exists({
        where: {
          mode: ColonyShipBuildQueueMode.REPAIR,
          status: In([
            ColonyShipBuildQueueStatus.QUEUED,
            ColonyShipBuildQueueStatus.PAUSED,
          ]),
        },
      }),
      this.stationRepairRepo.exists({}),
      this.repairTaskRepo.exists({ where: { completesAt: LessThanOrEqual(now) } }),
    ]);
    return colonyJobs || stationJobs || shipTasks;
  }

  async run(now: Date): Promise<void> {
    // One failing colony, station or ship must not stop every later one; the tick still fails.
    const failures: Array<{ key: string; error: unknown }> = [];
    const attempt = async (key: string, work: () => Promise<void>) => {
      try {
        await work();
      } catch (error) {
        failures.push({ key, error });
      }
    };

    // Paused jobs are included: the colony pass also resumes them when slots free up.
    const colonyIds = [
      ...new Set(
        (
          await this.queueRepo.find({
            select: { colonyId: true },
            where: {
              mode: ColonyShipBuildQueueMode.REPAIR,
              status: In([
                ColonyShipBuildQueueStatus.QUEUED,
                ColonyShipBuildQueueStatus.PAUSED,
              ]),
            },
          })
        ).flatMap((job) => (job.colonyId == null ? [] : [job.colonyId])),
      ),
    ];
    const colonies = colonyIds.length
      ? await this.colonyRepo.find({
          where: { id: In(colonyIds) },
          relations: ['fields', 'stats', 'changeable', 'celestialObject', 'storage'],
        })
      : [];
    for (const colony of colonies) {
      if (colony.isAbandoned || colony.userId == null) continue;
      await attempt(`colony ${colony.id}`, async () => {
        await this.colonyShipyard.processShipBuildQueue(colony, true);
        this.gateway.emitToUser(colony.userId!, WsEventType.COLONY_UPDATED, {
          colonyId: colony.id,
        });
      });
    }

    const stationIds = [
      ...new Set(
        (await this.stationRepairRepo.find({ select: { stationId: true } })).map(
          (job) => job.stationId,
        ),
      ),
    ];
    for (const stationId of stationIds) {
      await attempt(`station ${stationId}`, () =>
        this.stationRepairs.processQueue(stationId),
      );
    }

    const dueTasks = await this.repairTaskRepo.find({
      select: { spacecraftId: true },
      where: { completesAt: LessThanOrEqual(now) },
    });
    const ships = dueTasks.length
      ? await this.shipRepo.find({
          where: { id: In(dueTasks.map((task) => task.spacecraftId)) },
        })
      : [];
    for (const ship of ships) {
      await attempt(`spacecraft ${ship.id}`, () => this.shipRepairs.processTick(ship));
    }

    if (failures.length === 1) throw failures[0].error;
    if (failures.length) {
      throw new AggregateError(
        failures.map((failure) => failure.error),
        `Repair steps failed: ${failures.map((failure) => failure.key).join(', ')}`,
      );
    }
  }
}
