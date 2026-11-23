import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, LessThanOrEqual, Repository } from 'typeorm';
import type {
  SpacecraftRepairOptionsDto,
  SpacecraftSelfRepairDto,
} from '@swuniverse/shared';
import { CrewType } from '../colony/entities/crew.entity';
import { CrewAssignment } from '../colony/entities/crew-assignment.entity';
import { CrewEnhancementService } from './crew-enhancement.service';
import { CrewEnhancementEvent } from './crew-expertise';
import { MessagingService, type TransactionalNotifications } from '../messaging/messaging.service';
import { CargoItem } from './entities/cargo-item.entity';
import { SpacecraftModule } from './entities/spacecraft-module.entity';
import { StationShipRepair } from './entities/station-ship-repair.entity';
import {
  RepairPartsType,
  RepairTargetType,
  SpacecraftRepairTask,
} from './entities/spacecraft-repair-task.entity';
import { AlertState, Spacecraft } from './entities/spacecraft.entity';
import {
  CartographyPlan,
  CartographyPlanStatus,
} from './entities/cartography-plan.entity';
import { SpacecraftCrewService } from './spacecraft-crew.service';

const SPARE_PARTS_ID = 10001;
const SYSTEM_COMPONENTS_ID = 10002;
export const REPAIR_THRESHOLD = 45;

@Injectable()
export class SpacecraftRepairService {
  constructor(
    @InjectRepository(Spacecraft)
    private readonly shipRepo: Repository<Spacecraft>,
    @InjectRepository(SpacecraftModule)
    private readonly moduleRepo: Repository<SpacecraftModule>,
    @InjectRepository(SpacecraftRepairTask)
    private readonly taskRepo: Repository<SpacecraftRepairTask>,
    @InjectRepository(CargoItem)
    _cargoRepo: Repository<CargoItem>,
    @InjectRepository(CrewAssignment)
    private readonly crewAssignmentRepo: Repository<CrewAssignment>,
    @InjectRepository(CartographyPlan)
    _cartographyPlanRepo: Repository<CartographyPlan>,
    private readonly dataSource: DataSource,
    private readonly crewService: SpacecraftCrewService,
    private readonly messagingService: MessagingService,
    private readonly crewEnhancement: CrewEnhancementService = {
      enhanceSpacecraft: async () => undefined,
    } as unknown as CrewEnhancementService,
  ) {}

  async getOptions(
    spacecraftId: number,
    userId: number,
  ): Promise<SpacecraftRepairOptionsDto> {
    const ship = await this.findOwnedShip(spacecraftId, userId);
    const [modules, engineers, activeRepair] = await Promise.all([
      this.moduleRepo.find({
        where: { spacecraftId, integrity: LessThanOrEqual(REPAIR_THRESHOLD) },
        order: { id: 'ASC' },
      }),
      this.crewAssignmentRepo.count({
        where: { spacecraftId, slot: CrewType.TECHNICAL },
      }),
      this.taskRepo.findOneBy({ spacecraftId }),
    ]);
    const cost = Math.floor(ship.hullMax / 150);
    const targets: SpacecraftRepairOptionsDto['targets'] = [];
    if (Math.floor((ship.hull / ship.hullMax) * 100) <= REPAIR_THRESHOLD) {
      targets.push({
        type: 'HULL',
        moduleId: null,
        label: 'Hülle',
        integrity: Math.floor((ship.hull / ship.hullMax) * 100),
      });
    }
    targets.push(
      ...modules.map((module) => ({
        type: 'MODULE' as const,
        moduleId: module.id,
        label: module.moduleType,
        integrity: module.integrity,
      })),
    );
    return {
      targets,
      engineers,
      cost,
      durationSeconds: this.durationSeconds(engineers),
      activeRepair: activeRepair
        ? {
            targetType: activeRepair.targetType,
            moduleId: activeRepair.moduleId,
            completesAt: activeRepair.completesAt.toISOString(),
          }
        : null,
    };
  }

  async start(
    spacecraftId: number,
    userId: number,
    dto: SpacecraftSelfRepairDto,
  ): Promise<{ completed: boolean; targetIntegrity: number }> {
    const targetIntegrity = this.rollTarget(dto.partsType);
    return this.dataSource.transaction(async (manager) => {
      const ship = await manager.findOne(Spacecraft, {
        where: { id: spacecraftId, userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!ship) throw new NotFoundException('Spacecraft not found');
      if (ship.alertState !== AlertState.GREEN) {
        throw new BadRequestException('Reparaturen erfordern Alarmstufe Grün');
      }
      if (!(await this.crewService.hasEnoughCrew(ship))) {
        throw new BadRequestException('Nicht ausreichend Crew');
      }
      if (await manager.existsBy(SpacecraftRepairTask, { spacecraftId })) {
        throw new BadRequestException('Eine Reparatur läuft bereits');
      }
      if (
        await manager.existsBy(CartographyPlan, {
          finalizingSpacecraftId: spacecraftId,
          status: CartographyPlanStatus.FINISHING,
        })
      ) {
        throw new BadRequestException(
          'Während der Kartographie-Finalisierung ist keine Reparatur möglich',
        );
      }

      const current = await this.getCurrentIntegrity(manager, ship, dto);
      if (current > REPAIR_THRESHOLD) {
        throw new BadRequestException('Dieses System benötigt keine Eigenreparatur');
      }
      const baseCost = Math.floor(ship.hullMax / 150);
      const multiplier = dto.instant ? 3 : 1;
      const spareParts =
        dto.partsType !== RepairPartsType.SYSTEM_COMPONENTS
          ? baseCost * multiplier
          : 0;
      const systemComponents =
        dto.partsType !== RepairPartsType.SPARE_PARTS
          ? baseCost * multiplier
          : 0;
      await this.consume(manager, spacecraftId, SPARE_PARTS_ID, spareParts);
      await this.consume(
        manager,
        spacecraftId,
        SYSTEM_COMPONENTS_ID,
        systemComponents,
      );

      if (dto.instant) {
        await this.applyRepair(manager, ship, dto, targetIntegrity);
        return { completed: true, targetIntegrity };
      }
      const engineers = await manager.count(CrewAssignment, {
        where: { spacecraftId, slot: CrewType.TECHNICAL },
      });
      await manager.save(
        SpacecraftRepairTask,
        manager.create(SpacecraftRepairTask, {
          spacecraftId,
          targetType: dto.targetType as RepairTargetType,
          moduleId: dto.moduleId ?? null,
          partsType: dto.partsType as RepairPartsType,
          targetIntegrity,
          spareParts,
          systemComponents,
          completesAt: new Date(
            Date.now() + this.durationSeconds(engineers) * 1000,
          ),
        }),
      );
      return { completed: false, targetIntegrity };
    });
  }

  async processTick(ship: Spacecraft): Promise<void> {
    const outcome = await this.dataSource.transaction(async (manager) => {
      const task = await manager.findOne(SpacecraftRepairTask, {
        where: { spacecraftId: ship.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!task || task.completesAt > new Date()) return null;
      if (!(await this.crewService.hasEnoughCrew(ship))) {
        await manager.remove(task);
        return { cancelled: true, repaired: false, targetIntegrity: 0 };
      }
      const dto: SpacecraftSelfRepairDto = {
        targetType: task.targetType,
        moduleId: task.moduleId,
        partsType: task.partsType,
        instant: false,
      };
      const repaired = await this.applyRepair(
        manager,
        ship,
        dto,
        task.targetIntegrity,
      );
      await manager.remove(task);
      return {
        cancelled: false,
        repaired,
        targetIntegrity: task.targetIntegrity,
      };
    });
    if (!outcome) return;
    if (!outcome.cancelled && outcome.repaired) {
      await this.crewEnhancement.enhanceSpacecraft(
        ship.id,
        CrewEnhancementEvent.REPAIR_COMPLETED,
      );
    }
    await this.messagingService.sendSystem(
      ship.userId,
      outcome.cancelled
        ? 'Schiffsreparatur abgebrochen'
        : 'Schiffsreparatur abgeschlossen',
      outcome.cancelled
        ? `Die Reparatur der ${ship.name} wurde wegen unzureichender Crew abgebrochen.`
        : outcome.repaired
          ? `Die Crew der ${ship.name} hat das Zielsystem auf ${outcome.targetIntegrity} % repariert.`
          : `Der Reparaturversuch auf der ${ship.name} brachte keine Verbesserung.`,
    );
  }

  async cancelForFlight(
    spacecraftIds: number | number[],
    cause = 'Der Flug',
  ): Promise<void> {
    const ids = Array.isArray(spacecraftIds) ? spacecraftIds : [spacecraftIds];
    const cancelled = await this.dataSource.transaction((manager) =>
      this.cancelTasks(manager, ids),
    );
    await this.notifyCancelled(cancelled, cause);
  }

  /** Cancels and refunds running repairs inside the caller's transaction. */
  async cancelTasks(
    manager: EntityManager,
    spacecraftIds: number[],
    nowait = false,
  ): Promise<Array<{ userId: number; name: string }>> {
    const results: Array<{ userId: number; name: string }> = [];
    for (const spacecraftId of spacecraftIds) {
      // A station repair queue entry is dropped when the ship flies or docks elsewhere.
      const stationJob = await manager.findOne(StationShipRepair, {
        where: { shipId: spacecraftId },
        relations: ['ship'],
        lock: { mode: 'pessimistic_write', tables: ['station_ship_repairs'], ...(nowait ? { onLocked: 'nowait' as const } : {}) },
      });
      if (stationJob) {
        await manager.remove(stationJob);
        results.push({ userId: stationJob.ship.userId, name: stationJob.ship.name });
      }
      const task = await manager.findOne(SpacecraftRepairTask, {
        where: { spacecraftId },
        relations: ['spacecraft'],
        lock: { mode: 'pessimistic_write', tables: ['spacecraft_repair_tasks'], ...(nowait ? { onLocked: 'nowait' as const } : {}) },
      });
      if (!task) continue;
      await this.refund(
        manager,
        spacecraftId,
        SPARE_PARTS_ID,
        task.spareParts,
        nowait,
      );
      await this.refund(
        manager,
        spacecraftId,
        SYSTEM_COMPONENTS_ID,
        task.systemComponents,
        nowait,
      );
      await manager.remove(task);
      results.push({
        userId: task.spacecraft.userId,
        name: task.spacecraft.name,
      });
    }
    return results;
  }

  async notifyCancelled(
    cancelled: Array<{ userId: number; name: string }>,
    cause = 'Der Flug',
    transaction?: TransactionalNotifications,
  ): Promise<void> {
    await Promise.all(
      cancelled.map(({ userId, name }) => {
        const subject = 'Schiffsreparatur abgebrochen';
        const body = `${cause} der ${name} hat die laufende Reparatur abgebrochen. Die eingesetzten Teile wurden zurückerstattet.`;
        return transaction
          ? this.messagingService.sendSystem(userId, subject, body, undefined, undefined, undefined, false, transaction)
          : this.messagingService.sendSystem(userId, subject, body);
      }),
    );
  }

  private durationSeconds(engineers: number): number {
    return Math.max(1, Math.round(10_800 * (1 - Math.min(engineers, 9) / 10)));
  }

  private rollTarget(partsType: RepairPartsType | string): number {
    const [min, max] =
      partsType === RepairPartsType.SPARE_PARTS
        ? [13, 17]
        : partsType === RepairPartsType.SYSTEM_COMPONENTS
          ? [22, 28]
          : [35, 45];
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  private async findOwnedShip(id: number, userId: number): Promise<Spacecraft> {
    const ship = await this.shipRepo.findOneBy({ id, userId });
    if (!ship) throw new NotFoundException('Spacecraft not found');
    return ship;
  }

  private async getCurrentIntegrity(
    manager: EntityManager,
    ship: Spacecraft,
    dto: SpacecraftSelfRepairDto,
  ): Promise<number> {
    if (dto.targetType === RepairTargetType.HULL) {
      return Math.floor((ship.hull / ship.hullMax) * 100);
    }
    if (dto.moduleId == null) throw new BadRequestException('Modul fehlt');
    const module = await manager.findOne(SpacecraftModule, {
      where: { id: dto.moduleId, spacecraftId: ship.id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!module) throw new NotFoundException('Modul nicht gefunden');
    return module.integrity;
  }

  private async applyRepair(
    manager: EntityManager,
    ship: Spacecraft,
    dto: SpacecraftSelfRepairDto,
    targetIntegrity: number,
  ): Promise<boolean> {
    const current = await this.getCurrentIntegrity(manager, ship, dto);
    if (current > targetIntegrity) return false;
    if (dto.targetType === RepairTargetType.HULL) {
      ship.hull = Math.round((ship.hullMax * targetIntegrity) / 100);
      await manager.save(ship);
    } else {
      if (dto.moduleId == null) throw new BadRequestException('Modul fehlt');
      const module = await manager.findOneByOrFail(SpacecraftModule, {
        id: dto.moduleId,
        spacecraftId: ship.id,
      });
      module.integrity = targetIntegrity;
      await manager.save(module);
    }
    return true;
  }

  private async consume(
    manager: EntityManager,
    spacecraftId: number,
    commodityId: number,
    amount: number,
  ): Promise<void> {
    if (amount === 0) return;
    const item = await manager.findOne(CargoItem, {
      where: { spacecraftId, commodityId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!item || item.amount < amount) {
      throw new BadRequestException('Nicht genügend Reparaturteile im Lager');
    }
    item.amount -= amount;
    await manager.save(item);
  }

  private async refund(
    manager: EntityManager,
    spacecraftId: number,
    commodityId: number,
    amount: number,
    nowait = false,
  ): Promise<void> {
    if (amount === 0) return;
    let item = await manager.findOne(CargoItem, {
      where: { spacecraftId, commodityId },
      lock: { mode: 'pessimistic_write', ...(nowait ? { onLocked: 'nowait' as const } : {}) },
    });
    if (!item) item = manager.create(CargoItem, { spacecraftId, commodityId, amount: 0 });
    item.amount += amount;
    await manager.save(item);
  }
}
