import { In, type EntityManager } from 'typeorm';
import { ColonyStorage } from '../colony/entities/colony-storage.entity';
import {
  ColonyShipBuildQueue,
  ColonyShipBuildQueueMode,
  ColonyShipBuildQueueStatus,
} from '../colony/entities/colony-ship-build-queue.entity';
import { CargoItem } from './entities/cargo-item.entity';

/** STU cancelRepair/cancelRetrofit: drops open shipyard repair and retrofit jobs, refunding retrofit modules. */
export async function cancelShipyardJobs(
  manager: EntityManager,
  spacecraftId: number,
  nowait = false,
): Promise<ColonyShipBuildQueueMode[]> {
  const jobs = await manager.find(ColonyShipBuildQueue, {
    where: {
      spacecraftId,
      mode: In([
        ColonyShipBuildQueueMode.REPAIR,
        ColonyShipBuildQueueMode.RETROFIT,
      ]),
      status: In([
        ColonyShipBuildQueueStatus.QUEUED,
        ColonyShipBuildQueueStatus.PAUSED,
      ]),
    },
    order: { id: 'ASC' },
    lock: {
      mode: 'pessimistic_write',
      ...(nowait ? { onLocked: 'nowait' as const } : {}),
    },
  });
  for (const job of jobs) {
    if (job.mode === ColonyShipBuildQueueMode.RETROFIT) {
      const refunds = new Map<number, number>();
      for (const id of job.retrofitSnapshot?.consumedModuleCommodityIds ?? [])
        refunds.set(id, (refunds.get(id) ?? 0) + 1);
      for (const [commodityId, amount] of [...refunds].sort(
        ([a], [b]) => a - b,
      )) {
        // Follow existing SWU cancellation refunds; never mint modules for completed jobs.
        if (job.colonyId != null) {
          let row = await manager.findOne(ColonyStorage, {
            where: { colonyId: job.colonyId, commodityId },
            lock: {
              mode: 'pessimistic_write',
              ...(nowait ? { onLocked: 'nowait' as const } : {}),
            },
          });
          row ??= manager.create(ColonyStorage, {
            colonyId: job.colonyId,
            commodityId,
            amount: 0,
          });
          row.amount += amount;
          await manager.save(ColonyStorage, row);
        } else if (job.stationId != null) {
          let row = await manager.findOne(CargoItem, {
            where: { spacecraftId: job.stationId, commodityId },
            lock: {
              mode: 'pessimistic_write',
              ...(nowait ? { onLocked: 'nowait' as const } : {}),
            },
          });
          row ??= manager.create(CargoItem, {
            spacecraftId: job.stationId,
            commodityId,
            amount: 0,
          });
          row.amount += amount;
          await manager.save(CargoItem, row);
        }
      }
    }
    job.status = ColonyShipBuildQueueStatus.CANCELLED;
    await manager.save(ColonyShipBuildQueue, job);
  }
  return jobs.map((job) => job.mode);
}
