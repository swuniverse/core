import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Research, ResearchStatus } from './entities/research.entity';
import { GameDataService } from '../game-data/game-data.service';
import { ShipClassDef } from '../spacecraft/entities/ship-class-def.entity';

@Injectable()
export class UnlockResolverService {
  constructor(
    @InjectRepository(Research)
    private readonly researchRepo: Repository<Research>,
    @InjectRepository(ShipClassDef)
    private readonly shipClassRepo: Repository<ShipClassDef>,
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
    shipClassId: number,
  ): Promise<boolean> {
    const shipClass = await this.shipClassRepo.findOneBy({ id: shipClassId });
    if (!shipClass || shipClass.isNpc) return false;
    if (!shipClass.unlockTechId) return true;

    const research = await this.researchRepo.findOne({
      where: {
        userId,
        techId: shipClass.unlockTechId,
        status: ResearchStatus.COMPLETED,
      },
    });
    return !!research;
  }

  async getCompletedTechNames(userId: number): Promise<Set<string>> {
    const completed = await this.researchRepo.find({
      where: { userId, status: ResearchStatus.COMPLETED },
    });

    const techTree = this.gameData.getTechTree();
    const names = new Set<string>();
    for (const r of completed) {
      const tech = techTree.find((t) => t.id === r.techId);
      if (tech) {
        names.add(tech.name);
        if (tech.rawName) names.add(tech.rawName);
        if (tech.key) names.add(tech.key);
      }
    }
    return names;
  }

  async hasTechByName(userId: number, techName: string): Promise<boolean> {
    const techTree = this.gameData.getTechTree();
    const normalized = this.normalizeTechName(techName);
    const tech = techTree.find((t) => {
      const candidates = [t.name, t.rawName, t.key].filter(Boolean) as string[];
      return candidates.some(
        (candidate) => this.normalizeTechName(candidate) === normalized,
      );
    });
    if (!tech) return false;

    const research = await this.researchRepo.findOne({
      where: { userId, techId: tech.id, status: ResearchStatus.COMPLETED },
    });
    return !!research;
  }

  private normalizeTechName(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[´'`’]/g, '')
      .replace(/\s+/g, ' ');
  }
}
