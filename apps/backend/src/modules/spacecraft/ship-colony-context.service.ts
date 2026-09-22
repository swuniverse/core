import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { SpacecraftTransferQuoteDto } from '@swuniverse/shared';
import { EntityManager, Repository } from 'typeorm';
import { Colony } from '../colony/entities/colony.entity';
import { ColonyChangeable } from '../colony/entities/colony-changeable.entity';
import { ColonyStorage } from '../colony/entities/colony-storage.entity';
import { ColonyStorageService } from '../colony/colony-storage.service';
import { CargoItem } from './entities/cargo-item.entity';
import { GameDataService } from '../game-data/game-data.service';
import { CrewAssignment } from '../colony/entities/crew-assignment.entity';
import { SpacecraftCrewService } from './spacecraft-crew.service';
import { Spacecraft, SpacecraftStatus } from './entities/spacecraft.entity';
import {
  calculateTransferEnergyCost,
  TRANSFER_CAPACITY_PER_EPS,
} from './transfer-cost';

@Injectable()
export class ShipColonyContextService {
  constructor(
    @InjectRepository(Spacecraft)
    private readonly shipRepo: Repository<Spacecraft>,
    @InjectRepository(Colony)
    private readonly colonyRepo: Repository<Colony>,
    @InjectRepository(CrewAssignment)
    private readonly crewRepo: Repository<CrewAssignment>,
    @InjectRepository(ColonyStorage)
    private readonly colonyStorageRepo: Repository<ColonyStorage>,
    @InjectRepository(CargoItem)
    private readonly cargoRepo: Repository<CargoItem>,
    private readonly storageService: ColonyStorageService,
    private readonly crewService: SpacecraftCrewService,
    private readonly gameData: GameDataService,
  ) {}

  async requireContext(
    shipId: number,
    userId: number,
    colonyId: number,
    manager?: EntityManager,
  ) {
    const shipRepo = manager?.getRepository(Spacecraft) ?? this.shipRepo;
    const colonyRepo = manager?.getRepository(Colony) ?? this.colonyRepo;
    const lock = manager ? { mode: 'pessimistic_write' as const } : undefined;
    const [ship, colony] = await Promise.all([
      shipRepo.findOne({ where: { id: shipId, userId }, lock }),
      colonyRepo.findOne({ where: { id: colonyId, userId }, lock }),
    ]);
    if (!ship) throw new NotFoundException('Ship not found');
    if (!colony) throw new NotFoundException('Colony not found');
    const changeable = await (
      manager?.getRepository(ColonyChangeable) ??
      this.colonyRepo.manager.getRepository(ColonyChangeable)
    ).findOne({ where: { colonyId: colony.id }, lock });
    if (changeable) colony.changeable = changeable;
    if (ship.status !== SpacecraftStatus.IDLE) {
      throw new BadRequestException('Ship must be idle');
    }
    if (ship.starSystemId !== colony.starSystemId) {
      throw new BadRequestException('Ship must be in same system as colony');
    }
    if (
      ship.currentSystemFieldX !== colony.posX ||
      ship.currentSystemFieldY !== colony.posY
    ) {
      throw new BadRequestException('Ship must be in colony orbit');
    }
    return { ship, colony };
  }

  chargeEnergy(ship: Spacecraft, amount: number): number {
    const cost = calculateTransferEnergyCost(amount);
    if (ship.energy < cost) {
      throw new BadRequestException(`${cost} ship energy required`);
    }
    ship.energy -= cost;
    return cost;
  }

  async getQuote(
    shipId: number,
    userId: number,
    colonyId: number,
  ): Promise<SpacecraftTransferQuoteDto> {
    try {
      const { ship, colony } = await this.requireContext(
        shipId,
        userId,
        colonyId,
      );
      const [colonyFree, colonyCrew, assignedCrew, colonyStorage, shipCargo] =
        await Promise.all([
          this.storageService.getFreeStorage(colony, colony.storageMax),
          this.crewRepo.count({ where: { colonyId: colony.id } }),
          this.crewService.getAssignedCrewCount(ship.id),
          this.colonyStorageRepo.find({
            where: { colonyId: colony.id },
            order: { commodityId: 'ASC' },
          }),
          this.cargoRepo.find({
            where: { spacecraftId: ship.id },
            order: { commodityId: 'ASC' },
          }),
        ]);
      const shipMinimum = await this.crewService.getRequiredCrew(ship);
      return {
        available: true,
        reason: null,
        colonyId,
        cargo: {
          shipUsed: ship.cargoUsed,
          shipMax: ship.cargoMax,
          colonyFree,
        },
        shipCargo: shipCargo.map((item) => ({
          commodityId: item.commodityId,
          commodityName:
            this.gameData.getCommodity(item.commodityId)?.name ??
            `Ware #${item.commodityId}`,
          amount: item.amount,
        })),
        colonyCargo: colonyStorage
          .filter((item) => item.amount > 0)
          .map((item) => ({
            commodityId: item.commodityId,
            commodityName:
              this.gameData.getCommodity(item.commodityId)?.name ??
              `Ware #${item.commodityId}`,
            amount: item.amount,
          })),
        crew: {
          shipCurrent: assignedCrew,
          shipMinimum,
          shipMax: ship.crewMax,
          colonyAvailable: colonyCrew,
          maxLoad: Math.max(
            0,
            Math.min(colonyCrew, ship.crewMax - assignedCrew),
          ),
          maxUnload: Math.max(0, assignedCrew - shipMinimum),
        },
        energyPerCapacity: TRANSFER_CAPACITY_PER_EPS,
      };
    } catch (error) {
      return {
        available: false,
        reason: error instanceof Error ? error.message : 'Transfer unavailable',
        colonyId,
        cargo: { shipUsed: 0, shipMax: 0, colonyFree: 0 },
        shipCargo: [],
        colonyCargo: [],
        crew: {
          shipCurrent: 0,
          shipMinimum: 0,
          shipMax: 0,
          colonyAvailable: 0,
          maxLoad: 0,
          maxUnload: 0,
        },
        energyPerCapacity: TRANSFER_CAPACITY_PER_EPS,
      };
    }
  }
}
