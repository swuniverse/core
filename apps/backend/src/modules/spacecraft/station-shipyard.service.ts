import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { ShipModuleSelection } from '@swuniverse/shared';
import { DataSource, Repository } from 'typeorm';
import { User } from '../auth/user.entity';
import { ColonyTimingService } from '../colony/colony-timing.service';
import { ColonyShipBuildQueue, ColonyShipBuildQueueMode, ColonyShipBuildQueueStatus, ShipBuildSource } from '../colony/entities/colony-ship-build-queue.entity';
import { UnlockResolverService } from '../research/unlock-resolver.service';
import { CargoItem } from './entities/cargo-item.entity';
import { ShipClassDef } from './entities/ship-class-def.entity';
import { SpacecraftModule } from './entities/spacecraft-module.entity';
import { AlertState, Spacecraft, SpacecraftKind, SpacecraftStatus, StationRole } from './entities/spacecraft.entity';
import { initializeSpacecraftRuntimeSystems } from './spacecraft-runtime-state.service';
import { ShipbuildingCoreService } from './shipbuilding-core.service';

export interface StationShipBuildRequest { shipClassId: number; name: string; moduleSelections?: ShipModuleSelection[] }

@Injectable()
export class StationShipyardService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(ColonyShipBuildQueue) private readonly queueRepo: Repository<ColonyShipBuildQueue>,
    @InjectRepository(ShipClassDef) private readonly classRepo: Repository<ShipClassDef>,
    @InjectRepository(Spacecraft) private readonly shipRepo: Repository<Spacecraft>,
    @InjectRepository(SpacecraftModule) private readonly moduleRepo: Repository<SpacecraftModule>,
    private readonly core: ShipbuildingCoreService,
    private readonly timing: ColonyTimingService,
    private readonly unlocks: UnlockResolverService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async overview(stationId: number, userId: number) {
    const station = await this.ownedShipyard(this.dataSource.manager, stationId, userId);
    const [classes, cargo, queues, user] = await Promise.all([
      this.classRepo.find({ where: { isNpc: false }, order: { id: 'ASC' } }),
      this.dataSource.manager.find(CargoItem, { where: { spacecraftId: stationId } }),
      this.queueRepo.find({ where: { stationId, status: ColonyShipBuildQueueStatus.QUEUED }, order: { finishesAt: 'ASC' } }),
      this.userRepo.findOne({ where: { id: userId } }),
    ]);
    const amount = new Map(cargo.map((x) => [x.commodityId, x.amount]));
    const options = [];
    for (const hull of classes) {
      if (!(await this.unlocks.isShipClassUnlocked(userId, hull.id))) continue;
      const prepared = this.core.prepare(hull, [], user?.faction ?? null);
      options.push({ ...hull, buildCosts: prepared.materialCosts.map((cost) => ({ ...cost, stored: amount.get(cost.commodityId) ?? 0 })) });
    }
    return { stationId, role: station.stationRole, options, queues };
  }

  async build(stationId: number, userId: number, request: StationShipBuildRequest) {
    return this.dataSource.transaction(async (manager) => {
      const station = await this.ownedShipyard(manager, stationId, userId, true);
      if (await manager.count(ColonyShipBuildQueue, { where: { stationId, status: ColonyShipBuildQueueStatus.QUEUED } })) throw new BadRequestException('In dieser Raumwerft wird bereits ein Schiff gebaut');
      const hull = await this.classRepo.findOneBy({ id: request.shipClassId });
      if (!hull || hull.isNpc || !(await this.unlocks.isShipClassUnlocked(userId, hull.id))) throw new BadRequestException('Unknown or locked ship class');
      const user = await this.userRepo.findOne({ where: { id: userId } });
      const prepared = this.core.prepare(hull, request.moduleSelections ?? [], user?.faction ?? null);
      const required = new Map<number, number>();
      for (const cost of prepared.materialCosts) required.set(cost.commodityId, (required.get(cost.commodityId) ?? 0) + cost.amount);
      for (const id of prepared.moduleCommodityIds) required.set(id, (required.get(id) ?? 0) + 1);
      const cargo = await manager.find(CargoItem, { where: { spacecraftId: station.id }, lock: { mode: 'pessimistic_write' } });
      for (const [id, value] of required) if ((cargo.find((x) => x.commodityId === id)?.amount ?? 0) < value) throw new BadRequestException(`Not enough commodity #${id}`);
      for (const [id, value] of required) cargo.find((x) => x.commodityId === id)!.amount -= value;
      await manager.save(CargoItem, cargo);
      const queue = this.queueRepo.create({ source: ShipBuildSource.STATION, colonyId: null, stationId, userId, shipClassId: hull.id, mode: ColonyShipBuildQueueMode.BUILD, buildingFunctionId: null, spacecraftId: null, name: request.name?.trim() || hull.name, buildPlanName: null, buildPlanId: null, buildPlanSignature: null, moduleSelections: prepared.moduleSelections, moduleCommodityIds: prepared.moduleCommodityIds, moduleTypes: prepared.moduleTypes, repairSnapshot: null, retrofitSnapshot: null, finishesAt: this.timing.dateAfterScaledMinutes(Math.max(1, hull.buildTimeTicks || 1)), stoppedAt: null, status: ColonyShipBuildQueueStatus.QUEUED });
      return manager.save(ColonyShipBuildQueue, queue);
    });
  }

  async processTick(stationId: number): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const station = await manager.findOne(Spacecraft, { where: { id: stationId, kind: SpacecraftKind.STATION }, lock: { mode: 'pessimistic_write' } });
      if (!station || station.stationRole !== StationRole.SHIPYARD) return;
      const due = await manager.find(ColonyShipBuildQueue, { where: { stationId, source: ShipBuildSource.STATION, mode: ColonyShipBuildQueueMode.BUILD, status: ColonyShipBuildQueueStatus.QUEUED }, relations: { shipClass: true }, order: { finishesAt: 'ASC', id: 'ASC' }, lock: { mode: 'pessimistic_write' } });
      for (const job of due) {
        if (job.finishesAt > new Date()) continue;
        if (await manager.count(Spacecraft, { where: { dockedAtId: station.id } }) >= station.dockCapacity) return;
        const hull = job.shipClass ?? await this.classRepo.findOneBy({ id: job.shipClassId });
        if (!hull) return;
        const ship = manager.create(Spacecraft, { name: job.name, shipClassId: hull.id, userId: job.userId, locationId: station.locationId, dockedAtId: station.id, kind: SpacecraftKind.SHIP, status: SpacecraftStatus.IDLE, alertState: AlertState.GREEN, hull: hull.hullBase, hullMax: hull.hullBase, shields: hull.shieldBase, shieldsMax: hull.shieldBase, energy: hull.epsBase, energyMax: hull.epsBase, epsMax: hull.epsBase, warpSpeed: hull.warpdriveBase, warpdriveMax: hull.warpdriveBase, crew: 0, crewRequired: hull.crewMin, crewMax: hull.crewMax, cargoUsed: 0, cargoMax: hull.cargoCapacity, battery: hull.batteryBase, batteryMax: hull.batteryBase, reactorOutput: 0, evadeChance: 0, buildPlanId: job.buildPlanId });
        const saved = await manager.save(Spacecraft, ship);
        const modules: SpacecraftModule[] = [];
        for (const selection of job.moduleSelections ?? []) modules.push(await manager.save(SpacecraftModule, manager.create(SpacecraftModule, { spacecraftId: saved.id, slotId: selection.slotId, moduleType: `COMMODITY_${selection.commodityId}`, category: job.moduleTypes?.[modules.length] ?? 'UNKNOWN', level: 1, integrity: 100, cooldown: 0, isActive: true })));
        saved.modules = modules; initializeSpacecraftRuntimeSystems(saved); await manager.save(Spacecraft, saved);
        job.status = ColonyShipBuildQueueStatus.COMPLETED; await manager.save(ColonyShipBuildQueue, job);
      }
    });
  }

  private async ownedShipyard(manager: any, id: number, userId: number, lock = false): Promise<Spacecraft> {
    const station = await manager.findOne(Spacecraft, { where: { id, userId, kind: SpacecraftKind.STATION }, ...(lock ? { lock: { mode: 'pessimistic_write' } } : {}) });
    if (!station) throw new NotFoundException('Station nicht gefunden');
    if (station.stationRole !== StationRole.SHIPYARD) throw new BadRequestException('Diese Station ist keine Raumwerft');
    return station;
  }
}
