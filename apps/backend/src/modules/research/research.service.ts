import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Research, ResearchStatus } from './entities/research.entity';

interface TechDef {
  id: number;
  name: string;
  category: string;
  duration: number; // ticks to complete
  prerequisites: number[];
}

const TECH_TREE: TechDef[] = [
  { id: 1, name: 'Basic Engineering', category: 'infrastructure', duration: 2, prerequisites: [] },
  { id: 2, name: 'Advanced Mining', category: 'infrastructure', duration: 3, prerequisites: [1] },
  { id: 3, name: 'Energy Systems', category: 'infrastructure', duration: 3, prerequisites: [1] },
  { id: 4, name: 'Shipyard Ops', category: 'military', duration: 4, prerequisites: [1] },
  { id: 5, name: 'Blaster Technology', category: 'weapons', duration: 3, prerequisites: [4] },
  { id: 6, name: 'Shield Technology', category: 'defense', duration: 3, prerequisites: [3] },
  { id: 7, name: 'Hyperdrive Theory', category: 'navigation', duration: 5, prerequisites: [3, 4] },
  { id: 8, name: 'Turbolaser Arrays', category: 'weapons', duration: 5, prerequisites: [5] },
  { id: 9, name: 'Deflector Shields', category: 'defense', duration: 5, prerequisites: [6] },
  { id: 10, name: 'Advanced Hyperdrive', category: 'navigation', duration: 6, prerequisites: [7] },
  { id: 11, name: 'Proton Torpedoes', category: 'weapons', duration: 6, prerequisites: [5, 8] },
  { id: 12, name: 'Capital Ship Construction', category: 'military', duration: 8, prerequisites: [4, 7] },
];

@Injectable()
export class ResearchService {
  constructor(
    @InjectRepository(Research)
    private readonly researchRepo: Repository<Research>,
  ) {}

  getTechTree(): TechDef[] {
    return TECH_TREE;
  }

  async getUserResearch(userId: number): Promise<Research[]> {
    return this.researchRepo.find({
      where: { userId },
      order: { techId: 'ASC' },
    });
  }

  async getResearchState(userId: number) {
    const userResearch = await this.getUserResearch(userId);
    const completed = new Set(
      userResearch.filter((r) => r.status === ResearchStatus.COMPLETED).map((r) => r.techId),
    );

    return TECH_TREE.map((tech) => {
      const existing = userResearch.find((r) => r.techId === tech.id);
      let status: ResearchStatus;

      if (existing) {
        status = existing.status;
      } else if (tech.prerequisites.every((p) => completed.has(p))) {
        status = ResearchStatus.AVAILABLE;
      } else {
        status = ResearchStatus.LOCKED;
      }

      return {
        ...tech,
        status,
        progress: existing?.progress || 0,
        finishesAt: existing?.finishesAt || null,
      };
    });
  }

  async startResearch(userId: number, techId: number): Promise<Research> {
    const tech = TECH_TREE.find((t) => t.id === techId);
    if (!tech) throw new NotFoundException('Technology not found');

    const inProgress = await this.researchRepo.findOne({
      where: { userId, status: ResearchStatus.IN_PROGRESS },
    });
    if (inProgress) {
      throw new BadRequestException('Already researching something');
    }

    const userResearch = await this.getUserResearch(userId);
    const completed = new Set(
      userResearch.filter((r) => r.status === ResearchStatus.COMPLETED).map((r) => r.techId),
    );

    if (completed.has(techId)) {
      throw new BadRequestException('Already researched');
    }
    if (!tech.prerequisites.every((p) => completed.has(p))) {
      throw new BadRequestException('Prerequisites not met');
    }

    // Duration in ticks × 4.8h per tick → ms
    const durationMs = tech.duration * 4.8 * 60 * 60 * 1000;

    let research = userResearch.find((r) => r.techId === techId);
    if (research) {
      research.status = ResearchStatus.IN_PROGRESS;
      research.finishesAt = new Date(Date.now() + durationMs);
    } else {
      research = this.researchRepo.create({
        userId,
        techId,
        status: ResearchStatus.IN_PROGRESS,
        progress: 0,
        finishesAt: new Date(Date.now() + durationMs),
      });
    }

    return this.researchRepo.save(research);
  }

  async processTick(userId: number): Promise<void> {
    const inProgress = await this.researchRepo.findOne({
      where: { userId, status: ResearchStatus.IN_PROGRESS },
    });
    if (!inProgress) return;

    if (inProgress.finishesAt && new Date() >= inProgress.finishesAt) {
      inProgress.status = ResearchStatus.COMPLETED;
      inProgress.progress = 100;
      inProgress.finishesAt = null;
      await this.researchRepo.save(inProgress);
    }
  }
}
