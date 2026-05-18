import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Research, ResearchStatus } from './entities/research.entity';
import { GameDataService } from '../game-data/game-data.service';

@Injectable()
export class UnlockResolverService {
  constructor(
    @InjectRepository(Research)
    private readonly researchRepo: Repository<Research>,
    private readonly gameData: GameDataService,
  ) {}

  async isBuildingUnlocked(
    userId: number,
    buildingId: number,
  ): Promise<boolean> {
    const building = this.gameData.getBuilding(buildingId);
    if (!building) return false;
    if (!building.researchRequired) return true;

    return this.hasTechByName(userId, building.researchRequired);
  }

  async isShipClassUnlocked(
    userId: number,
    _shipClassId: number,
  ): Promise<boolean> {
    // All ship classes currently unlocked (no researchRequired field on ShipClassDef yet)
    return true;
  }

  async getCompletedTechNames(userId: number): Promise<Set<string>> {
    const completed = await this.researchRepo.find({
      where: { userId, status: ResearchStatus.COMPLETED },
    });

    const techTree = this.gameData.getTechTree();
    const names = new Set<string>();
    for (const r of completed) {
      const tech = techTree.find((t) => t.id === r.techId);
      if (tech) names.add(tech.name);
    }
    return names;
  }

  private async hasTechByName(
    userId: number,
    techName: string,
  ): Promise<boolean> {
    const techTree = this.gameData.getTechTree();
    const tech = techTree.find((t) => t.name === techName);
    if (!tech) return true;

    const research = await this.researchRepo.findOne({
      where: { userId, techId: tech.id, status: ResearchStatus.COMPLETED },
    });
    return !!research;
  }
}
