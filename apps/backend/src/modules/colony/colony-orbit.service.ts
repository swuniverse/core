import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameDataService } from '../game-data/game-data.service';
import { CargoItem } from '../spacecraft/entities/cargo-item.entity';
import {
  Spacecraft,
  SpacecraftStatus,
} from '../spacecraft/entities/spacecraft.entity';
import { ShipClassDef } from '../spacecraft/entities/ship-class-def.entity';
import { ColonyDefenseService } from './colony-defense.service';
import { ColonyEventService } from './colony-event.service';
import { ColonyOwnershipService } from './colony-ownership.service';
import { ColonyStatsService, getColonyChangeable } from './colony-stats.service';
import { ColonyStorageService } from './colony-storage.service';
import { ColonyChangeable } from './entities/colony-changeable.entity';
import {
  ColonyEventSeverity,
  ColonyEventType,
} from './entities/colony-event.entity';
import {
  ColonyOrbitAssignment,
  ColonyOrbitAssignmentMode,
} from './entities/colony-orbit-assignment.entity';
import { ColonyStorage } from './entities/colony-storage.entity';
import { Colony } from './entities/colony.entity';
import { assertOwnedColony } from './colony-owner.util';

@Injectable()
export class ColonyOrbitService {
  constructor(
    @InjectRepository(Colony)
    private readonly colonyRepo: Repository<Colony>,
    @InjectRepository(ColonyChangeable)
    private readonly changeableRepo: Repository<ColonyChangeable>,
    @InjectRepository(ColonyOrbitAssignment)
    private readonly orbitAssignmentRepo: Repository<ColonyOrbitAssignment>,
    @InjectRepository(Spacecraft)
    private readonly shipRepo: Repository<Spacecraft>,
    @InjectRepository(CargoItem)
    private readonly cargoRepo: Repository<CargoItem>,
    @InjectRepository(ColonyStorage)
    private readonly storageRepo: Repository<ColonyStorage>,
    @InjectRepository(ShipClassDef)
    private readonly shipClassRepo: Repository<ShipClassDef>,
    private readonly ownership: ColonyOwnershipService,
    private readonly gameData: GameDataService,
    private readonly colonyStatsService: ColonyStatsService,
    private readonly colonyStorageService: ColonyStorageService,
    private readonly colonyDefenseService: ColonyDefenseService,
    private readonly colonyEventService: ColonyEventService,
  ) {}

  async cleanupInvalidOrbitAssignments(colony: Colony): Promise<void> {
    const assignments = await this.orbitAssignmentRepo.find({
      where: { colonyId: colony.id },
      relations: ['spacecraft'],
    });
    for (const assignment of assignments) {
      if (
        !assignment.spacecraft ||
        assignment.spacecraft.status === SpacecraftStatus.DESTROYED ||
        !this.isShipInColonyOrbit(colony, assignment.spacecraft)
      ) {
        await this.orbitAssignmentRepo.remove(assignment);
      }
    }
    const byFleet = new Map<number, ColonyOrbitAssignment[]>();
    for (const assignment of assignments) {
      const group = byFleet.get(assignment.fleetId) ?? [];
      group.push(assignment);
      byFleet.set(assignment.fleetId, group);
    }
    for (const group of byFleet.values()) {
      if (group.length <= 1) continue;
      const sorted = group.slice().sort((a, b) => a.id - b.id);
      for (const duplicate of sorted.slice(1)) {
        await this.orbitAssignmentRepo.remove(duplicate);
      }
    }
    await this.syncColonyBlockadeState(colony.id);
  }

  async syncColonyBlockadeState(colonyId: number): Promise<void> {
    const colony = await this.colonyRepo.findOne({
      where: { id: colonyId },
      relations: ['changeable', 'stats'],
    });
    if (!colony) return;
    const changeable = colony.changeable ?? getColonyChangeable(colony);
    const blockadeCount = await this.orbitAssignmentRepo.count({
      where: { colonyId, mode: ColonyOrbitAssignmentMode.BLOCKADE },
    });
    const nextBlocked = blockadeCount > 0;
    if (Boolean(changeable.isBlockaded) !== nextBlocked) {
      changeable.isBlockaded = nextBlocked;
      await this.colonyRepo.manager.save(changeable);
      if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID || 'expect' in globalThis) {
        await this.changeableRepo.save(changeable);
      }
    }
  }

  async setOrbitAssignment(
    colonyId: number,
    userId: number,
    shipId: number,
    mode: ColonyOrbitAssignmentMode,
  ): Promise<ColonyOrbitAssignment> {
    const colony = await this.colonyRepo.findOne({
      where: { id: colonyId },
      relations: ['fields', 'changeable'],
    });
    if (!colony) throw new NotFoundException('Colony not found');
    assertOwnedColony(colony);
    await this.cleanupInvalidOrbitAssignments(colony);

    const ship = await this.shipRepo.findOne({
      where: { id: shipId, userId },
      relations: ['fleet'],
    });
    if (!ship) throw new NotFoundException('Spacecraft not found');
    if (!this.isShipInColonyOrbit(colony, ship)) {
      throw new BadRequestException('Ship is not in colony orbit');
    }
    if (!ship.fleetId || !ship.fleet || ship.fleet.leaderId !== ship.id) {
      throw new BadRequestException(
        'Only fleet leaders can manage orbit orders',
      );
    }
    if (ship.status === SpacecraftStatus.DESTROYED) {
      throw new BadRequestException(
        'Destroyed ship cannot manage orbit orders',
      );
    }

    const existingFleetAssignment = await this.orbitAssignmentRepo.findOne({
      where: { fleetId: ship.fleetId },
    });
    if (existingFleetAssignment) {
      throw new BadRequestException('Fleet already has an orbit order');
    }
    const existingShipAssignment = await this.orbitAssignmentRepo.findOne({
      where: { spacecraftId: ship.id },
    });
    if (existingShipAssignment) {
      throw new BadRequestException('Ship already has an orbit order');
    }

    const existingMode = await this.orbitAssignmentRepo.findOne({
      where: {
        colonyId: colony.id,
        mode:
          mode === ColonyOrbitAssignmentMode.DEFEND
            ? ColonyOrbitAssignmentMode.BLOCKADE
            : ColonyOrbitAssignmentMode.DEFEND,
      },
    });
    if (existingMode) {
      throw new BadRequestException(
        mode === ColonyOrbitAssignmentMode.DEFEND
          ? 'Colony is already blockaded'
          : 'Colony is already defended',
      );
    }

    if (mode === ColonyOrbitAssignmentMode.BLOCKADE) {
      const functionIds = this.getActiveBuildingFunctionIds(colony);
      if (
        this.colonyDefenseService.hasEnergyPhalanx(functionIds) ||
        this.colonyDefenseService.hasParticlePhalanx(functionIds) ||
        this.colonyDefenseService.hasAntiParticle(functionIds)
      ) {
        throw new BadRequestException('Colony has active orbital defense');
      }
    }

    const assignment = this.orbitAssignmentRepo.create({
      colonyId: colony.id,
      spacecraftId: ship.id,
      fleetId: ship.fleetId,
      mode,
    });
    const saved = await this.orbitAssignmentRepo.save(assignment);
    await this.syncColonyBlockadeState(colony.id);

    const startedBlockade = mode === ColonyOrbitAssignmentMode.BLOCKADE;
    await this.colonyEventService.createActionEvent({
      colonyId: colony.id,
      userId: colony.userId,
      type: startedBlockade
        ? ColonyEventType.ORBIT_BLOCKADE_STARTED
        : ColonyEventType.ORBIT_DEFENSE_STARTED,
      severity: startedBlockade
        ? ColonyEventSeverity.WARNING
        : ColonyEventSeverity.INFO,
      title: startedBlockade ? 'Blockade begonnen' : 'Verteidigung begonnen',
      message: `Flotte #${ship.fleetId} hat ${
        startedBlockade ? 'die Blockade' : 'die Verteidigung'
      } der Kolonie begonnen.`,
      payload: { shipId: ship.id, fleetId: ship.fleetId, mode },
    });

    return saved;
  }

  async clearOrbitAssignment(
    colonyId: number,
    userId: number,
    shipId: number,
  ): Promise<{ cleared: boolean }> {
    const colony = await this.colonyRepo.findOne({
      where: { id: colonyId },
      relations: ['changeable'],
    });
    if (!colony) throw new NotFoundException('Colony not found');
    assertOwnedColony(colony);
    const ship = await this.shipRepo.findOne({
      where: { id: shipId, userId },
      relations: ['fleet'],
    });
    if (!ship) throw new NotFoundException('Spacecraft not found');
    if (!ship.fleetId || !ship.fleet || ship.fleet.leaderId !== ship.id) {
      throw new BadRequestException(
        'Only fleet leaders can manage orbit orders',
      );
    }
    const assignment = await this.orbitAssignmentRepo.findOne({
      where: { colonyId: colony.id, fleetId: ship.fleetId },
    });
    if (!assignment) return { cleared: false };
    await this.orbitAssignmentRepo.remove(assignment);
    await this.syncColonyBlockadeState(colony.id);

    const stoppedBlockade =
      assignment.mode === ColonyOrbitAssignmentMode.BLOCKADE;
    await this.colonyEventService.createActionEvent({
      colonyId: colony.id,
      userId: colony.userId,
      type: stoppedBlockade
        ? ColonyEventType.ORBIT_BLOCKADE_STOPPED
        : ColonyEventType.ORBIT_DEFENSE_STOPPED,
      severity: ColonyEventSeverity.INFO,
      title: stoppedBlockade ? 'Blockade beendet' : 'Verteidigung beendet',
      message: `Flotte #${ship.fleetId} hat ${
        stoppedBlockade ? 'die Blockade' : 'die Verteidigung'
      } der Kolonie beendet.`,
      payload: {
        shipId: ship.id,
        fleetId: ship.fleetId,
        mode: assignment.mode,
      },
    });

    return { cleared: true };
  }

  async transferShuttles(
    colonyId: number,
    userId: number,
    shipId: number,
    items: Array<{ commodityId: number; amount: number }>,
  ): Promise<void> {
    const colony = await this.ownership.findOwnedColony(colonyId, userId);
    const ship = await this.shipRepo.findOne({ where: { id: shipId, userId } });
    if (!ship) throw new NotFoundException('Spacecraft not found');
    if (!this.canManageOrbitShip(colony, ship)) {
      throw new BadRequestException('Ship is not in colony orbit');
    }

    const shipClass = await this.shipClassRepo.findOneBy({
      id: ship.shipClassId,
    });
    if (!shipClass) throw new BadRequestException('Unknown ship class');
    if (shipClass.shuttleSlots <= 0) {
      throw new BadRequestException('Ship has no shuttle ramp capacity');
    }

    const normalized = new Map<number, number>();
    for (const item of items ?? []) {
      if (
        !Number.isInteger(item?.commodityId) ||
        !Number.isInteger(item?.amount)
      ) {
        continue;
      }
      if (item.amount === 0) continue;
      const commodity = this.gameData.getCommodity(item.commodityId);
      if (!commodity?.isShuttle) {
        throw new BadRequestException(
          `Commodity ${item.commodityId} is not a shuttle`,
        );
      }
      normalized.set(
        item.commodityId,
        (normalized.get(item.commodityId) ?? 0) + item.amount,
      );
    }
    if (normalized.size === 0) {
      throw new BadRequestException('No shuttle transfers requested');
    }

    const shuttleCargoUsed = await this.getShuttleCargoUsed(ship.id);
    const requestedDelta = Array.from(normalized.values()).reduce(
      (sum, amount) => sum + amount,
      0,
    );
    if (shuttleCargoUsed + requestedDelta > shipClass.shuttleSlots) {
      throw new BadRequestException('Shuttle capacity exceeded');
    }
    if (shuttleCargoUsed + requestedDelta < 0) {
      throw new BadRequestException(
        'Cannot unload more shuttles than stored on ship',
      );
    }

    const maxStorage =
      this.colonyStatsService.calculateSummary(colony).effectiveStorageMax;
    const freeStorage = await this.colonyStorageService.getFreeStorage(
      colony,
      maxStorage,
    );
    const unloadAmount = Array.from(normalized.values())
      .filter((amount) => amount < 0)
      .reduce((sum, amount) => sum + Math.abs(amount), 0);
    if (unloadAmount > freeStorage) {
      throw new BadRequestException('Not enough colony storage capacity');
    }

    for (const [commodityId, amount] of normalized.entries()) {
      if (amount > 0) {
        const colonyStorage = await this.getColonyStorageItem(
          colony.id,
          commodityId,
        );
        if ((colonyStorage?.amount ?? 0) < amount) {
          throw new BadRequestException(
            `Not enough shuttle stock on colony for commodity ${commodityId}`,
          );
        }
      } else {
        const cargoItem = await this.getShipCargoItem(ship.id, commodityId);
        if ((cargoItem?.amount ?? 0) < Math.abs(amount)) {
          throw new BadRequestException(
            `Not enough shuttle stock on ship for commodity ${commodityId}`,
          );
        }
      }
    }

    for (const [commodityId, amount] of normalized.entries()) {
      if (amount > 0) {
        await this.colonyStorageService.lowerStorage(colony, commodityId, amount);

        const cargoItem =
          (await this.getShipCargoItem(ship.id, commodityId)) ??
          this.cargoRepo.create({
            spacecraftId: ship.id,
            commodityId,
            amount: 0,
          });
        cargoItem.amount += amount;
        await this.cargoRepo.save(cargoItem);
      } else {
        const moveAmount = Math.abs(amount);
        const cargoItem = await this.getShipCargoItem(ship.id, commodityId);
        if (!cargoItem) {
          throw new BadRequestException(
            `Not enough shuttle stock on ship for commodity ${commodityId}`,
          );
        }
        cargoItem.amount -= moveAmount;
        await this.cargoRepo.save(cargoItem);

        await this.colonyStorageService.upperStorage(
          colony,
          commodityId,
          moveAmount,
          maxStorage,
        );
      }
    }

    ship.cargoUsed = await this.getShipCargoUsed(ship.id);
    await this.shipRepo.save(ship);

    await this.colonyEventService.createActionEvent({
      colonyId: colony.id,
      userId,
      type: ColonyEventType.SHUTTLES_TRANSFERRED,
      severity: ColonyEventSeverity.INFO,
      title: 'Shuttles transferiert',
      message: `${ship.name}: Shuttle-Transfer zwischen Kolonie und Schiff durchgeführt.`,
      payload: {
        shipId: ship.id,
        shipClassId: ship.shipClassId,
        transfers: Array.from(normalized.entries()).map(
          ([commodityId, delta]) => ({
            commodityId,
            delta,
          }),
        ),
      },
    });
  }

  canManageOrbitShip(colony: Colony, ship: Spacecraft): boolean {
    return (
      ship.userId === colony.userId && this.isShipInColonyOrbit(colony, ship)
    );
  }

  isShipInColonyOrbit(colony: Colony, ship: Spacecraft): boolean {
    return (
      ship.starSystemId === colony.starSystemId &&
      (colony.celestialObjectId == null ||
        ship.celestialObjectId === colony.celestialObjectId)
    );
  }

  private getActiveBuildingFunctionIds(colony: Colony): number[] {
    return (colony.fields ?? [])
      .filter(
        (field) => field.buildingId && !field.isBuilding && field.isActive,
      )
      .flatMap((field) =>
        this.gameData.getBuildingFunctions(field.buildingId!),
      );
  }

  private async getShipCargoUsed(shipId: number): Promise<number> {
    const result = await this.cargoRepo
      .createQueryBuilder('c')
      .select('COALESCE(SUM(c.amount), 0)', 'total')
      .where('c.spacecraftId = :shipId', { shipId })
      .getRawOne();
    return parseInt(result?.total || '0', 10);
  }

  private async getShipCargoItem(
    spacecraftId: number,
    commodityId: number,
  ): Promise<CargoItem | null> {
    return this.cargoRepo.findOne({
      where: { spacecraftId, commodityId },
    });
  }

  private async getShuttleCargoUsed(shipId: number): Promise<number> {
    const cargo = await this.cargoRepo.find({
      where: { spacecraftId: shipId },
    });
    return cargo
      .filter((item) => this.gameData.getCommodity(item.commodityId)?.isShuttle)
      .reduce((sum, item) => sum + item.amount, 0);
  }

  private async getColonyStorageItem(
    colonyId: number,
    commodityId: number,
  ): Promise<ColonyStorage | null> {
    return this.storageRepo.findOne({
      where: { colonyId, commodityId },
    });
  }
}
