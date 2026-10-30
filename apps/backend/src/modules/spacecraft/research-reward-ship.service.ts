import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { Colony } from '../colony/entities/colony.entity';
import { Crew, CrewType } from '../colony/entities/crew.entity';
import { CrewAssignment } from '../colony/entities/crew-assignment.entity';
import { GameDataService } from '../game-data/game-data.service';
import { ResearchRewardGrantService } from '../research/research-reward-grant.service';
import { SpaceLocation } from '../starmap/entities/space-location.entity';
import { ShipClassDef } from './entities/ship-class-def.entity';
import { SpacecraftModule } from './entities/spacecraft-module.entity';
import {
  AlertState,
  Spacecraft,
  SpacecraftOperatingMode,
  SpacecraftStatus,
} from './entities/spacecraft.entity';
import { SpacecraftCrewService } from './spacecraft-crew.service';
import { SpacecraftRuntimeStateService } from './spacecraft-runtime-state.service';
import { SpacecraftStatsService } from './spacecraft-stats.service';

export type ResearchRewardShipResult =
  | { outcome: 'no-mapping' | 'already-granted' | 'no-colony' }
  | { outcome: 'granted'; shipId: number };

/**
 * Spawns the explicitly mapped reward ship of a completed research in the
 * orbit of the player's oldest colony. Reserve, ship, modules, crew and grant
 * completion are persisted in one transaction; the grant row is the
 * idempotency boundary.
 */
@Injectable()
export class ResearchRewardShipService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly gameData: GameDataService,
    private readonly grantService: ResearchRewardGrantService,
    private readonly statsService: SpacecraftStatsService,
    private readonly crewService: SpacecraftCrewService,
    private readonly runtimeStateService: SpacecraftRuntimeStateService,
  ) {}

  async grantShipReward(
    userId: number,
    techId: number,
  ): Promise<ResearchRewardShipResult> {
    return this.dataSource.transaction(async (manager) => {
      const reserved = await this.grantService.reserve(manager, userId, techId);
      if (reserved.outcome === 'no-mapping') return { outcome: 'no-mapping' };
      if (reserved.outcome === 'already-granted') {
        return { outcome: 'already-granted' };
      }

      const reward = this.gameData.getTech(techId)!.shipReward!;
      const shipClass = await this.resolveShipClass(manager, reward);
      const modules = this.resolveModules(reward);

      // No colony: commit the RESERVED grant only; a later call resumes it.
      const colony = await manager.getRepository(Colony).findOne({
        where: { userId },
        relations: ['systemField'],
        order: { createdAt: 'ASC', id: 'ASC' },
      });
      if (!colony?.systemFieldId) return { outcome: 'no-colony' };
      const location = await manager
        .getRepository(SpaceLocation)
        .findOneBy({ systemFieldId: colony.systemFieldId });
      if (!location) return { outcome: 'no-colony' };

      const ship = await this.createShip(
        manager,
        userId,
        shipClass,
        modules,
        location,
      );
      await this.grantService.complete(manager, userId, techId);
      return { outcome: 'granted', shipId: ship.id };
    });
  }

  private async resolveShipClass(
    manager: EntityManager,
    reward: { shipClassKey: string },
  ): Promise<ShipClassDef> {
    const shipClass = await manager
      .getRepository(ShipClassDef)
      .findOneBy({ key: reward.shipClassKey });
    if (!shipClass) {
      throw new Error(`Reward ship class not found: ${reward.shipClassKey}`);
    }
    return shipClass;
  }

  private resolveModules(reward: {
    moduleSelections: Array<{ slotId: string; commodityId: number }>;
  }) {
    return reward.moduleSelections.map((selection) => {
      const item = this.gameData.getFabricationItemByOutputCommodity(
        selection.commodityId,
      );
      if (!item?.moduleType || !item.shipyardType) {
        throw new Error(
          `Reward commodity #${selection.commodityId} is not a ship module`,
        );
      }
      return { slotId: selection.slotId, item };
    });
  }

  private async createShip(
    manager: EntityManager,
    userId: number,
    shipClass: ShipClassDef,
    selections: ReturnType<ResearchRewardShipService['resolveModules']>,
    location: SpaceLocation,
  ): Promise<Spacecraft> {
    const shipRepo = manager.getRepository(Spacecraft);
    const ship = await shipRepo.save(
      shipRepo.create({
        name: shipClass.name,
        shipClassId: shipClass.id,
        userId,
        locationId: location.id,
        location,
        status: SpacecraftStatus.IDLE,
        alertState: AlertState.GREEN,
        operatingMode: SpacecraftOperatingMode.NORMAL,
        hull: shipClass.hullBase,
        hullMax: shipClass.hullBase,
        shields: shipClass.shieldBase,
        shieldsMax: shipClass.shieldBase,
        energy: shipClass.epsBase,
        energyMax: shipClass.epsBase,
        warpSpeed: shipClass.warpdriveBase,
        crew: 0,
        crewMax: shipClass.crewMax,
        cargoUsed: 0,
        cargoMax: shipClass.cargoCapacity,
        battery: shipClass.batteryBase,
        batteryMax: shipClass.batteryBase,
        reactorFuel: shipClass.reactorBase * 10,
        reactorFuelMax: shipClass.reactorBase * 10,
      }),
    );
    const moduleRepo = manager.getRepository(SpacecraftModule);
    const modules: SpacecraftModule[] = [];
    for (const { slotId, item } of selections) {
      modules.push(
        await moduleRepo.save(
          moduleRepo.create({
            spacecraftId: ship.id,
            slotId,
            moduleType: item.moduleType!,
            category: item.shipyardType!,
            level: item.moduleLevel ?? 1,
            integrity: 100,
            cooldown: 0,
            isActive: true,
          }),
        ),
      );
    }
    this.statsService.applyStats(ship, shipClass, modules);
    this.crewService.applyRequiredCrew(ship, shipClass.crewMin, modules);
    const systems = this.runtimeStateService.initialize(ship);
    for (const state of Object.values(systems)) {
      if (state) {
        state.active = true;
        state.integrity = 100;
        state.cooldown = 0;
      }
    }
    ship.runtimeSystems = systems;

    const crewCount = Math.min(
      ship.crewMax,
      this.crewService.calculateRequiredCrew(shipClass.crewMin, modules),
    );
    const crewRepo = manager.getRepository(Crew);
    const assignmentRepo = manager.getRepository(CrewAssignment);
    for (let index = 0; index < crewCount; index++) {
      const crew = await crewRepo.save(
        crewRepo.create({
          userId,
          name: `Crew ${ship.id}-${index + 1}`,
          type: CrewType.CREWMAN,
        }),
      );
      await assignmentRepo.save(
        assignmentRepo.create({
          crewId: crew.id,
          userId,
          colonyId: null,
          spacecraftId: ship.id,
          slot: CrewType.CREWMAN,
        }),
      );
    }
    ship.crew = crewCount;
    return shipRepo.save(ship);
  }
}
