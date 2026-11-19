import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { StationRepairDto, StationRepairJobDto } from '@swuniverse/shared';
import { DataSource, EntityManager, In } from 'typeorm';
import { ColonyTimingService } from '../colony/colony-timing.service';
import { MessageFolder } from '../messaging/message-folder';
import { MessagingService } from '../messaging/messaging.service';
import { CartographyPlan, CartographyPlanStatus } from './entities/cartography-plan.entity';
import { CargoItem } from './entities/cargo-item.entity';
import { SpacecraftModule } from './entities/spacecraft-module.entity';
import { SpacecraftRepairTask } from './entities/spacecraft-repair-task.entity';
import { StationShipRepair } from './entities/station-ship-repair.entity';
import { Spacecraft, SpacecraftKind } from './entities/spacecraft.entity';
import { CrewEnhancementService } from './crew-enhancement.service';
import { CrewEnhancementEvent } from './crew-expertise';
import { isCloaked } from './spacecraft-cloak';
import { SpacecraftStatsService } from './spacecraft-stats.service';
import {
  applyRepairStep,
  estimateRepairSteps,
  mayRepairShips,
  needsRepair,
  planRepairStep,
  requiredSelfRepairWorkbees,
  type RepairCost,
} from './station-repair-plan';

/**
 * Passive repair at stations (STU `RepairShip`, `CancelShipRepair`, `ReactivateShipRepair`,
 * `StationRepair`, `FinishPassiveShipRepairJobs`, `StationPassiveRepairHandler`):
 * a repair queue for docked ships plus passive self-repair of the station.
 */
@Injectable()
export class StationRepairService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly messaging: MessagingService,
    private readonly stats: SpacecraftStatsService,
    private readonly timing: ColonyTimingService,
    private readonly crewEnhancement: CrewEnhancementService,
  ) {}

  async getOverview(stationId: number, userId: number): Promise<StationRepairDto> {
    const manager = this.dataSource.manager;
    const station = await this.ownedStation(manager, stationId, userId);
    const [jobs, docked, workbees] = await Promise.all([
      manager.find(StationShipRepair, { where: { stationId }, order: { id: 'ASC' } }),
      manager.find(Spacecraft, {
        where: { dockedAtId: stationId },
        relations: { shipClass: true },
        order: { id: 'ASC' },
      }),
      this.dockedWorkbeeCount(manager, stationId),
    ]);
    const modulesByShip = await this.modulesByShip(manager, [...docked.map((ship) => ship.id), stationId]);
    const byId = new Map(docked.map((ship) => [ship.id, ship]));
    const queued = new Set(jobs.map((job) => job.shipId));
    const jobDtos: StationRepairJobDto[] = [];
    jobs.forEach((job, index) => {
      const ship = byId.get(job.shipId);
      if (!ship) return;
      jobDtos.push({
        shipId: ship.id,
        name: ship.name,
        hull: ship.hull,
        hullMax: ship.hullMax,
        status: job.isStopped ? 'STOPPED' : index === 0 ? 'ACTIVE' : 'WAITING',
        finishesAt: job.finishesAt?.toISOString() ?? null,
        steps: estimateRepairSteps(ship, modulesByShip.get(ship.id) ?? []),
      });
    });
    const stationModules = modulesByShip.get(stationId) ?? [];
    return {
      canRepairShips: mayRepairShips(station.stationRole) && this.hasCrew(station),
      queue: jobDtos,
      repairable: docked
        .filter(
          (ship) =>
            !isCloaked(ship) &&
            !queued.has(ship.id) &&
            needsRepair(ship, modulesByShip.get(ship.id) ?? []),
        )
        .map((ship) => ({
          shipId: ship.id,
          name: ship.name,
          hull: ship.hull,
          hullMax: ship.hullMax,
          steps: estimateRepairSteps(ship, modulesByShip.get(ship.id) ?? []),
        })),
      selfRepair: {
        needed: needsRepair(station, stationModules),
        active: station.passiveRepair,
        workbees: {
          docked: workbees,
          required: requiredSelfRepairWorkbees(station.stationRole),
        },
      },
    };
  }

  async queueShip(stationId: number, userId: number, shipId: number): Promise<{ message: string }> {
    const outcome = await this.dataSource.transaction(async (manager) => {
      const station = await this.ownedStation(manager, stationId, userId, true);
      if (!mayRepairShips(station.stationRole)) {
        throw new BadRequestException('Diese Station kann keine Schiffe reparieren');
      }
      if (!this.hasCrew(station)) throw new BadRequestException('Die Station hat nicht genug Crew');
      const ship = await manager.findOne(Spacecraft, {
        where: { id: shipId, dockedAtId: stationId },
        relations: { shipClass: true },
        lock: { mode: 'pessimistic_write', tables: ['spacecraft'] },
      });
      if (!ship || isCloaked(ship)) {
        throw new BadRequestException('Das Schiff kann nicht repariert werden');
      }
      const modules = await manager.find(SpacecraftModule, { where: { spacecraftId: ship.id } });
      if (!needsRepair(ship, modules)) throw new BadRequestException('Das Schiff kann nicht repariert werden');
      if (
        (await manager.existsBy(StationShipRepair, { shipId })) ||
        (await manager.existsBy(SpacecraftRepairTask, { spacecraftId: shipId }))
      ) {
        throw new BadRequestException('Das Schiff wird bereits repariert');
      }
      if (
        await manager.existsBy(CartographyPlan, {
          finalizingSpacecraftId: shipId,
          status: CartographyPlanStatus.FINISHING,
        })
      ) {
        throw new BadRequestException('Das Schiff kartographiert derzeit und kann daher nicht repariert werden');
      }
      const queued = (await manager.countBy(StationShipRepair, { stationId })) > 0;
      const finishesAt = queued ? null : this.stepEnd(ship);
      await manager.save(
        manager.create(StationShipRepair, {
          stationId,
          shipId,
          finishesAt,
          stoppedAt: null,
          isStopped: false,
        }),
      );
      const estimate = this.estimate(ship, modules);
      return { station, ship, queued, estimate };
    });
    const { station, ship, queued, estimate } = outcome;
    if (ship.userId !== userId || !queued) {
      await this.messaging.sendSystem(
        ship.userId,
        'Schiffsreparatur gestartet',
        queued
          ? `Die ${ship.name} wurde bei ${station.name} in die Reparaturwarteschlange aufgenommen.`
          : `Die ${ship.name} wird bei ${station.name} repariert. Voraussichtliche Fertigstellung: ${estimate}`,
        undefined,
        MessageFolder.SHIP,
      );
    }
    return {
      message: queued
        ? 'Das Schiff wurde zur Reparaturwarteschlange hinzugefügt'
        : `Das Schiff wird repariert. Voraussichtliche Fertigstellung: ${estimate}`,
    };
  }

  async cancel(stationId: number, userId: number, shipId: number): Promise<{ message: string }> {
    const ship = await this.dataSource.transaction(async (manager) => {
      await this.ownedStation(manager, stationId, userId, true);
      const job = await manager.findOne(StationShipRepair, {
        where: { stationId, shipId },
        relations: { ship: true },
        lock: { mode: 'pessimistic_write', tables: ['station_ship_repairs'] },
      });
      if (!job) throw new NotFoundException('Keine Reparatur für dieses Schiff');
      await manager.remove(job);
      return job.ship;
    });
    await this.messaging.sendSystem(
      ship.userId,
      'Schiffsreparatur abgebrochen',
      `Die Reparatur der ${ship.name} wurde abgebrochen.`,
      undefined,
      MessageFolder.SHIP,
    );
    return { message: `Die Reparatur der ${ship.name} wurde abgebrochen` };
  }

  /** Resumes a queue that halted for lack of spare parts (STU `ReactivateShipRepair`). */
  async reactivate(stationId: number, userId: number): Promise<{ message: string }> {
    await this.dataSource.transaction(async (manager) => {
      const station = await this.ownedStation(manager, stationId, userId, true);
      const jobs = await manager.find(StationShipRepair, {
        where: { stationId },
        relations: { ship: { shipClass: true } },
        order: { id: 'ASC' },
        lock: { mode: 'pessimistic_write', tables: ['station_ship_repairs'] },
      });
      if (jobs.length === 0) throw new BadRequestException('Die Reparaturwarteschlange ist leer');
      const now = new Date();
      const canRepair = mayRepairShips(station.stationRole) && this.hasCrew(station);
      jobs.forEach((job, index) => {
        job.isStopped = false;
        if (index > 0 || !canRepair) {
          job.stoppedAt = null;
          return;
        }
        if (job.finishesAt && job.stoppedAt) {
          job.finishesAt = new Date(job.finishesAt.getTime() + (now.getTime() - job.stoppedAt.getTime()));
        } else if (!job.finishesAt) {
          job.finishesAt = this.stepEnd(job.ship);
        }
        job.stoppedAt = null;
      });
      await manager.save(jobs);
    });
    return { message: 'Die Reparaturwarteschlange wurde reaktiviert' };
  }

  /** Switches on the passive self-repair of the station itself (STU `StationRepair`). */
  async startSelfRepair(stationId: number, userId: number): Promise<{ message: string }> {
    return this.dataSource.transaction(async (manager) => {
      const station = await this.ownedStation(manager, stationId, userId, true);
      if (!this.hasCrew(station)) throw new BadRequestException('Die Station hat nicht genug Crew');
      if (station.passiveRepair) throw new BadRequestException('Die Station wird bereits repariert.');
      const modules = await manager.find(SpacecraftModule, { where: { spacecraftId: station.id } });
      if (!needsRepair(station, modules)) throw new BadRequestException('Die Station ist nicht beschädigt');
      station.passiveRepair = true;
      await manager.save(station);
      return {
        message: `Die Station wird repariert. Fertigstellung in ${estimateRepairSteps(station, modules)} Ticks.`,
      };
    });
  }

  /** Main tick: one self-repair step of the station (STU `StationPassiveRepairHandler`). */
  async processTick(stationId: number, options: { skipRepair?: boolean } = {}): Promise<void> {
    if (options.skipRepair) return;
    await this.runStep(stationId, 'self');
  }

  /** Minute runner: the due step of the ship repair queue (STU `FinishPassiveShipRepairJobs`). */
  processQueue(stationId: number): Promise<void> {
    return this.runStep(stationId, 'queue');
  }

  private async runStep(stationId: number, part: 'self' | 'queue'): Promise<void> {
    const notices: Array<{ userId: number; subject: string; body: string; folder: MessageFolder }> = [];
    const experience: number[] = [];
    await this.dataSource.transaction(async (manager) => {
      const station = await manager.findOne(Spacecraft, {
        where: { id: stationId, kind: SpacecraftKind.STATION },
        lock: { mode: 'pessimistic_write', tables: ['spacecraft'] },
      });
      if (!station) return;
      if (part === 'self') {
        if (station.passiveRepair) await this.selfRepairStep(manager, station, notices, experience);
      } else {
        await this.queueStep(manager, station, notices, experience);
      }
    });
    for (const notice of notices) {
      await this.messaging.sendSystem(notice.userId, notice.subject, notice.body, undefined, notice.folder);
    }
    for (const shipId of experience) {
      await this.crewEnhancement.enhanceSpacecraft(shipId, CrewEnhancementEvent.REPAIR_COMPLETED);
    }
  }

  private async selfRepairStep(
    manager: EntityManager,
    station: Spacecraft,
    notices: Array<{ userId: number; subject: string; body: string; folder: MessageFolder }>,
    experience: number[],
  ): Promise<void> {
    const modules = await manager.find(SpacecraftModule, { where: { spacecraftId: station.id } });
    if (!needsRepair(station, modules)) {
      station.passiveRepair = false;
      await manager.save(station);
      return;
    }
    const required = requiredSelfRepairWorkbees(station.stationRole);
    if ((await this.dockedWorkbeeCount(manager, station.id)) < required) return;
    const step = planRepairStep(station, modules);
    if (!(await this.consumeParts(manager, station, step.costs))) return;
    applyRepairStep(station, step);
    if (step.modules.length > 0) await manager.save(step.modules);
    if (!needsRepair(station, modules)) {
      station.passiveRepair = false;
      station.hull = station.hullMax;
      experience.push(station.id);
      notices.push({
        userId: station.userId,
        subject: 'Stationsreparatur abgeschlossen',
        body: `Die Reparatur der ${station.name} wurde fertiggestellt.`,
        folder: MessageFolder.STATION,
      });
    }
    await manager.save(station);
  }

  private async queueStep(
    manager: EntityManager,
    station: Spacecraft,
    notices: Array<{ userId: number; subject: string; body: string; folder: MessageFolder }>,
    experience: number[],
  ): Promise<void> {
    const jobs = await manager.find(StationShipRepair, {
      where: { stationId: station.id },
      relations: { ship: { shipClass: true } },
      order: { id: 'ASC' },
      lock: { mode: 'pessimistic_write', tables: ['station_ship_repairs'] },
    });
    if (jobs.length === 0) return;
    const now = new Date();
    // Ships that left the station or no longer need work drop out of the queue.
    const live: StationShipRepair[] = [];
    for (const job of jobs) {
      const modules = await manager.find(SpacecraftModule, { where: { spacecraftId: job.shipId } });
      if (job.ship.dockedAtId === station.id && needsRepair(job.ship, modules)) {
        live.push(job);
      } else {
        await manager.remove(job);
      }
    }
    if (live.length === 0) return;
    if (!mayRepairShips(station.stationRole) || !this.hasCrew(station)) {
      await this.pause(manager, live, now);
      return;
    }
    if (live.some((job) => job.isStopped)) return;
    await this.pause(manager, live.slice(1), now);
    const job = live[0];
    if (job.stoppedAt) {
      if (job.finishesAt) {
        job.finishesAt = new Date(job.finishesAt.getTime() + (now.getTime() - job.stoppedAt.getTime()));
      }
      job.stoppedAt = null;
    }
    if (!job.finishesAt) {
      job.finishesAt = this.stepEnd(job.ship);
      await manager.save(job);
      return;
    }
    if (job.finishesAt > now) {
      await manager.save(job);
      return;
    }
    const ship = job.ship;
    const modules = await manager.find(SpacecraftModule, { where: { spacecraftId: ship.id } });
    const step = planRepairStep(ship, modules);
    if (!(await this.consumeParts(manager, station, step.costs))) {
      for (const entry of live) {
        entry.isStopped = true;
        entry.stoppedAt = now;
      }
      await manager.save(live);
      notices.push({
        userId: station.userId,
        subject: 'Reparatur angehalten',
        body: `Auf ${station.name} fehlen Ersatzteile oder Systemkomponenten für die Reparatur der ${ship.name}. Die Warteschlange wurde angehalten.`,
        folder: MessageFolder.STATION,
      });
      return;
    }
    applyRepairStep(ship, step);
    if (step.modules.length > 0) await manager.save(step.modules);
    if (ship.shipClass) this.stats.applyStats(ship, ship.shipClass, modules);
    if (needsRepair(ship, modules)) {
      job.finishesAt = this.stepEnd(ship);
      await manager.save([ship, job]);
      return;
    }
    ship.hull = ship.hullMax;
    await manager.save(ship);
    await manager.remove(job);
    experience.push(ship.id);
    notices.push({
      userId: ship.userId,
      subject: 'Schiffsreparatur abgeschlossen',
      body: `Die Reparatur der ${ship.name} wurde bei ${station.name} fertiggestellt.`,
      folder: MessageFolder.SHIP,
    });
    const next = live[1];
    if (next) {
      next.finishesAt = this.stepEnd(next.ship);
      next.stoppedAt = null;
      await manager.save(next);
    }
  }

  private async pause(manager: EntityManager, jobs: StationShipRepair[], now: Date): Promise<void> {
    for (const job of jobs) {
      if (job.finishesAt && !job.stoppedAt && !job.isStopped) {
        job.stoppedAt = now;
        await manager.save(job);
      }
    }
  }

  /** Takes the parts from the station storage, or reports that they are not all available. */
  private async consumeParts(
    manager: EntityManager,
    station: Spacecraft,
    costs: RepairCost[],
  ): Promise<boolean> {
    const items: Array<{ item: CargoItem; amount: number }> = [];
    for (const cost of costs) {
      const item = await manager.findOne(CargoItem, {
        where: { spacecraftId: station.id, commodityId: cost.commodityId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!item || item.amount < cost.amount) return false;
      items.push({ item, amount: cost.amount });
    }
    for (const { item, amount } of items) {
      item.amount -= amount;
      station.cargoUsed = Math.max(0, station.cargoUsed - amount);
      await manager.save(item);
    }
    return true;
  }

  private hasCrew(station: Spacecraft): boolean {
    return station.crewRequired <= 0 || station.crew >= station.crewRequired;
  }

  private stepEnd(ship: Spacecraft): Date {
    const minutes = Math.max(1, Math.ceil((ship.shipClass?.buildTimeTicks ?? 2) / 2));
    return this.timing.dateAfterScaledMinutes(minutes);
  }

  private estimate(ship: Spacecraft, modules: SpacecraftModule[]): string {
    const steps = Math.max(1, estimateRepairSteps(ship, modules));
    const minutes = Math.max(1, Math.ceil((ship.shipClass?.buildTimeTicks ?? 2) / 2));
    const finish = this.timing.dateAfterScaledMinutes(minutes * steps);
    return finish.toLocaleString('de-DE', { timeZone: 'Europe/Berlin' });
  }

  private async dockedWorkbeeCount(manager: EntityManager, stationId: number): Promise<number> {
    const docked = await manager.find(Spacecraft, {
      where: { dockedAtId: stationId },
      relations: { shipClass: true },
    });
    return docked.filter((ship) => ship.shipClass?.role === 'WORKBEE').length;
  }

  private async modulesByShip(manager: EntityManager, ids: number[]) {
    const result = new Map<number, SpacecraftModule[]>();
    if (ids.length === 0) return result;
    for (const module of await manager.find(SpacecraftModule, { where: { spacecraftId: In(ids) } })) {
      result.set(module.spacecraftId, [...(result.get(module.spacecraftId) ?? []), module]);
    }
    return result;
  }

  private async ownedStation(
    manager: EntityManager,
    stationId: number,
    userId: number,
    lock = false,
  ): Promise<Spacecraft> {
    const station = await manager.findOne(Spacecraft, {
      where: { id: stationId, userId, kind: SpacecraftKind.STATION },
      ...(lock ? { lock: { mode: 'pessimistic_write' as const, tables: ['spacecraft'] } } : {}),
    });
    if (!station) throw new NotFoundException('Station nicht gefunden');
    return station;
  }
}
