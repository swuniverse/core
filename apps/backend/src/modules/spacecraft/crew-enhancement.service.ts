import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';
import { Crew } from '../colony/entities/crew.entity';
import { CrewAssignment } from '../colony/entities/crew-assignment.entity';
import { CrewSkill } from './entities/crew-skill.entity';
import {
  automaticCrewRank,
  CREW_ENHANCEMENT_AMOUNTS,
  CrewEnhancementEvent,
  crewRankDefinition,
  CrewRank,
  nextPromotableRank,
} from './crew-expertise';

@Injectable()
export class CrewEnhancementService {
  constructor(private readonly dataSource: DataSource) {}

  async enhanceSpacecraft(
    spacecraftId: number,
    event: CrewEnhancementEvent,
    manager?: EntityManager,
  ): Promise<void> {
    const run = async (entityManager: EntityManager) => {
      const assignments = await entityManager.find(CrewAssignment, {
        where: { spacecraftId },
        relations: ['crew'],
      });
      const skills = assignments.length > 0 ? await entityManager.find(CrewSkill, {
        where: { crewId: In(assignments.map((assignment) => assignment.crewId)) },
      }) : [];
      const amounts = CREW_ENHANCEMENT_AMOUNTS[event];
      for (const assignment of assignments) {
        if (!assignment.slot) continue;
        const amount = amounts[assignment.slot] ?? 0;
        if (amount <= 0) continue;
        const skill =
          skills.find((value) => value.crewId === assignment.crewId && value.position === assignment.slot) ??
          entityManager.create(CrewSkill, {
            crewId: assignment.crewId,
            position: assignment.slot,
            expertise: 0,
          });
        skill.expertise += amount;
        await entityManager.save(skill);
        const automaticRank = automaticCrewRank(skill.expertise);
        if (
          crewRankDefinition(automaticRank).expertise >
          crewRankDefinition(assignment.crew.rank ?? CrewRank.CADET).expertise
        ) {
          assignment.crew.rank = automaticRank;
          await entityManager.save(assignment.crew);
        }
      }
    };
    if (manager) return run(manager);
    await this.dataSource.transaction(run);
  }

  async promote(userId: number, crewId: number): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const crew = await manager.findOne(Crew, {
        where: { id: crewId, userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!crew) throw new NotFoundException('Crew member not found');
      const skills = await manager.find(CrewSkill, { where: { crewId } });
      const highestExpertise = Math.max(0, ...skills.map((skill) => skill.expertise));
      const next = nextPromotableRank(crew.rank ?? CrewRank.CADET, highestExpertise);
      if (!next) throw new BadRequestException('Crew member is not eligible for promotion');
      const definition = crewRankDefinition(next.rank);
      const limit = 'limit' in definition ? definition.limit : null;
      const rankCount = await manager.count(Crew, { where: { userId, rank: next.rank } });
      if (limit != null && rankCount >= limit) {
        throw new BadRequestException(`Promotion limit for ${definition.label} reached`);
      }
      crew.rank = next.rank;
      await manager.save(crew);
    });
  }
}
