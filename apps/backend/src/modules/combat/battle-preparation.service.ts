import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource, In, MoreThan, type EntityManager } from 'typeorm';
import { Colony } from '../colony/entities/colony.entity';
import { ColonyStorage } from '../colony/entities/colony-storage.entity';
import {
  ColonyShipBuildQueue,
  ColonyShipBuildQueueMode,
  ColonyShipBuildQueueStatus,
} from '../colony/entities/colony-ship-build-queue.entity';
import { Anomaly } from '../anomaly/entities/anomaly.entity';
import { CargoItem } from '../spacecraft/entities/cargo-item.entity';
import {
  AlertState,
  Spacecraft,
  SpacecraftStatus,
} from '../spacecraft/entities/spacecraft.entity';
import { SpacecraftRepairService } from '../spacecraft/spacecraft-repair.service';
import { SpacecraftCrewService } from '../spacecraft/spacecraft-crew.service';
import { SpacecraftAlertService } from '../spacecraft/spacecraft-alert.service';
import { initializeSpacecraftRuntimeSystems } from '../spacecraft/spacecraft-runtime-state.service';
import {
  CombatAction,
  type BattleParticipant,
  type CombatLogEntry,
} from './combat.engine';
import { CombatCause, isOneWayCombat } from './combat-cause';

/** Persistent FightLib::ready actions before the pure engine takes its first turn. */
@Injectable()
export class BattlePreparationService {
  constructor(
    private readonly db: DataSource,
    private readonly repairs: SpacecraftRepairService,
    private readonly crew: SpacecraftCrewService,
    private readonly alerts: SpacecraftAlertService,
  ) {}

  async prepare(
    attackers: BattleParticipant[],
    defenders: BattleParticipant[],
    cause: CombatCause,
  ): Promise<CombatLogEntry[]> {
    const seen = new Set<number>();
    const selected = [
      ...attackers.map((member) => ({ ...member, role: 'attacker' as const })),
      ...(isOneWayCombat(cause)
        ? []
        : defenders.map((member) => ({
            ...member,
            role: 'defender' as const,
          }))),
    ].filter(({ ship }) => {
      if (
        ship.hull <= 0 ||
        ship.status === SpacecraftStatus.DESTROYED ||
        seen.has(ship.id)
      )
        return false;
      seen.add(ship.id);
      return true;
    });
    if (!selected.length) return [];
    const outcome = await this.db.transaction(async (manager) => {
      const ids = [...new Set(selected.map(({ ship }) => ship.id))].sort(
        (a, b) => a - b,
      );
      const current = await manager.find(Spacecraft, {
        where: { id: In(ids) },
        order: { id: 'ASC' },
        lock: { mode: 'pessimistic_write', onLocked: 'nowait' },
      });
      const changed: Array<{ original: Spacecraft; prepared: Spacecraft }> = [];
      const log: CombatLogEntry[] = [];
      for (const member of selected) {
        const stored = current.find((ship) => ship.id === member.ship.id);
        if (!stored) throw new NotFoundException('Spacecraft not found');
        if (stored.userId !== member.ship.userId)
          throw new ConflictException(
            'Schiffsbesitzer hat sich vor dem Kampf geändert',
          );
        if (stored.locationId !== member.ship.locationId)
          throw new ConflictException('Schiff hat den Kampfsektor verlassen');
        const ship = {
          ...member.ship,
          ...stored,
          location: member.ship.location,
          modules: member.modules,
          runtimeSystems: structuredClone(stored.runtimeSystems ?? {}),
        } as Spacecraft;
        changed.push({ original: member.ship, prepared: ship });
        if (ship.hull <= 0 || ship.status === SpacecraftStatus.DESTROYED)
          continue;
        const record = (detail: string) =>
          log.push({
            action: CombatAction.PREPARATION,
            source: member.role,
            sourceId: ship.id,
            detail,
          });
        if (ship.kind !== 'STATION' && ship.dockedAtId != null) {
          ship.dockedAtId = null;
          record('Das Schiff hat abgedockt');
        }
        if ((await this.repairs.cancelTasks(manager, [ship.id], true)).length)
          record(
            'Laufende Reparatur abgebrochen; eingesetzte Teile zurückerstattet',
          );
        for (const mode of await this.cancelShipyardJobs(manager, ship.id))
          record(
            mode === ColonyShipBuildQueueMode.RETROFIT
              ? 'Laufende Umrüstung abgebrochen; eingesetzte Module zurückerstattet'
              : 'Werftreparatur abgebrochen',
          );
        const systems = initializeSpacecraftRuntimeSystems(ship);
        for (const key of ['WARPDRIVE', 'CLOAK'] as const) {
          if (systems[key]?.active) {
            systems[key]!.active = false;
            record(
              key === 'CLOAK'
                ? 'Tarnung deaktiviert'
                : 'Hyperantrieb deaktiviert',
            );
          }
        }
        const hasEnoughCrew = await this.crew.hasEnoughCrew(ship);
        if (!hasEnoughCrew)
          record('Alarmreaktion nicht möglich: Nicht ausreichend Crew');
        else if (!systems.COMPUTER?.active || systems.COMPUTER.integrity <= 0)
          record('Alarmreaktion nicht möglich: Computer nicht betriebsbereit');
        else {
          const anomalies =
            ship.locationId == null
              ? []
              : await manager.find(Anomaly, {
                  where: {
                    locationId: ship.locationId,
                    remainingTicks: MoreThan(0),
                  },
                  relations: ['type'],
                });
          const blocked = anomalies.find((anomaly) =>
            ['ION_STORM', 'SUBSPACE_ELLIPSE'].includes(anomaly.type?.key),
          );
          const held = await manager.exists(Spacecraft, {
            where: { tractoredShipId: ship.id },
          });
          const hasColony =
            ship.user?.isNpc === true ||
            (await manager.exists(Colony, { where: { userId: ship.userId } }));
          const wasGreen = ship.alertState === AlertState.GREEN;
          try {
            const result = this.alerts.apply(
              ship,
              wasGreen ? AlertState.YELLOW : ship.alertState,
              {
                hasEnoughCrew,
                hasColony,
                activateSystems: !wasGreen,
                shieldBlocked: held
                  ? 'Das Schiff wird von einem Traktorstrahl gehalten'
                  : blocked
                    ? blocked.type.key === 'ION_STORM'
                      ? 'Ionensturm am Ort'
                      : 'Subraumellipse am Ort'
                    : undefined,
              },
            );
            result.messages.forEach(record);
          } catch (error) {
            if (!(error instanceof Error)) throw error;
            // EPS shortage on the level change is an expected readiness failure.
            if (!(error instanceof BadRequestException)) throw error;
            record(error.message);
          }
        }
        await manager.save(Spacecraft, ship);
      }
      return { changed, log };
    });
    // Do not mutate caller snapshots until cancellation, refunds and readiness commit.
    for (const { original, prepared } of outcome.changed)
      Object.assign(original, prepared);
    return outcome.log;
  }

  private async cancelShipyardJobs(
    manager: EntityManager,
    spacecraftId: number,
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
      lock: { mode: 'pessimistic_write', onLocked: 'nowait' },
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
              lock: { mode: 'pessimistic_write', onLocked: 'nowait' },
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
              lock: { mode: 'pessimistic_write', onLocked: 'nowait' },
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
}
