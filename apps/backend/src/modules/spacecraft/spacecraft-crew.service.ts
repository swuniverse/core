import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrewAssignment } from '../colony/entities/crew-assignment.entity';
import { Spacecraft } from './entities/spacecraft.entity';
import { ShipClassService } from './ship-class.service';

@Injectable()
export class SpacecraftCrewService {
  constructor(
    @InjectRepository(CrewAssignment)
    private readonly crewAssignmentRepo: Repository<CrewAssignment>,
    @InjectRepository(Spacecraft)
    private readonly shipRepo: Repository<Spacecraft>,
    private readonly shipClassService: ShipClassService,
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
    const shipClass = await this.shipClassService.findById(ship.shipClassId);
    return Math.max(0, shipClass?.crewMin ?? 0);
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
