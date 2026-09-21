import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrewAssignment } from '../colony/entities/crew-assignment.entity';
import { Spacecraft } from './entities/spacecraft.entity';
import { GameDataService } from '../game-data/game-data.service';
import type { SpacecraftModule } from './entities/spacecraft-module.entity';

@Injectable()
export class SpacecraftCrewService {
  constructor(
    @InjectRepository(CrewAssignment)
    private readonly crewAssignmentRepo: Repository<CrewAssignment>,
    @InjectRepository(Spacecraft)
    private readonly shipRepo: Repository<Spacecraft>,
    private readonly gameData: GameDataService,
  ) {}

  async getAssignedCrewCount(spacecraftId: number): Promise<number> {
    return this.crewAssignmentRepo.count({ where: { spacecraftId } });
  }

  async getAssignedCrew(spacecraftId: number) {
    const assignments = await this.crewAssignmentRepo.find({
      where: { spacecraftId },
      relations: ['crew'],
      order: { crewId: 'ASC' },
    });
    return assignments.map((assignment) => ({
      id: assignment.crewId,
      name: assignment.crew?.name ?? `Crew ${assignment.crewId}`,
      position: assignment.slot ?? assignment.crew?.type ?? 'CREWMAN',
      rank: assignment.crew?.type ?? 'CREWMAN',
    }));
  }

  async getRequiredCrew(ship: Spacecraft): Promise<number> {
    return Math.max(0, ship.crewRequired ?? 0);
  }

  applyRequiredCrew(
    ship: Spacecraft,
    baseCrew: number,
    modules: SpacecraftModule[],
  ): number {
    ship.crewRequired = this.calculateRequiredCrew(baseCrew, modules);
    ship.crewMax = Math.max(ship.crewMax, ship.crewRequired);
    return ship.crewRequired;
  }

  calculateRequiredCrew(baseCrew: number, modules: SpacecraftModule[]): number {
    return Math.max(
      0,
      baseCrew +
        modules.reduce((sum, module) => {
          const item = this.gameData
            .getAllFabricationItems()
            .find(
              (candidate) =>
                candidate.moduleType === module.moduleType &&
                candidate.moduleLevel === module.level,
            );
          return sum + (item?.shipyardModuleStats?.crew ?? 0);
        }, 0),
    );
  }

  async hasEnoughCrew(ship: Spacecraft): Promise<boolean> {
    const [assigned, required] = await Promise.all([
      this.getAssignedCrewCount(ship.id),
      this.getRequiredCrew(ship),
    ]);
    return required <= 0 || assigned >= required;
  }

  async syncCrewCache(ship: Spacecraft): Promise<Spacecraft> {
    ship.crew = await this.getAssignedCrewCount(ship.id);
    return this.shipRepo.save(ship);
  }

  async assertEnoughCrew(ship: Spacecraft): Promise<void> {
    if (!(await this.hasEnoughCrew(ship))) {
      throw new Error('Not enough crew');
    }
  }
}
