import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CrewAssignment } from '../colony/entities/crew-assignment.entity';
import { Crew, CrewType } from '../colony/entities/crew.entity';
import { Spacecraft } from './entities/spacecraft.entity';
import { ShipClassDef } from './entities/ship-class-def.entity';
import { GameDataService } from '../game-data/game-data.service';
import type { SpacecraftModule } from './entities/spacecraft-module.entity';
import { CrewSkill } from './entities/crew-skill.entity';
import {
  CrewRank,
  crewRankDefinition,
  nextPromotableRank,
} from './crew-expertise';

@Injectable()
export class SpacecraftCrewService {
  private static readonly positionOrder = [
    CrewType.CAPTAIN,
    CrewType.COMMAND,
    CrewType.SECURITY,
    CrewType.SCIENCE,
    CrewType.TECHNICAL,
    CrewType.NAVIGATION,
    CrewType.CREWMAN,
  ];

  constructor(
    @InjectRepository(CrewAssignment)
    private readonly crewAssignmentRepo: Repository<CrewAssignment>,
    @InjectRepository(Crew)
    private readonly crewRepo: Repository<Crew>,
    @InjectRepository(Spacecraft)
    private readonly shipRepo: Repository<Spacecraft>,
    @InjectRepository(CrewSkill)
    private readonly crewSkillRepo: Repository<CrewSkill>,
    @InjectRepository(ShipClassDef)
    private readonly shipClassRepo: Repository<ShipClassDef>,
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

  async getCrewManagement(spacecraftId: number, userId: number) {
    const ship = await this.findOwnedShip(spacecraftId, userId);
    const [assignments, targets] = await Promise.all([
      this.crewAssignmentRepo.find({
        where: { spacecraftId },
        relations: ['crew'],
        order: { crewId: 'ASC' },
      }),
      this.getPositionTargets(ship),
    ]);
    const foreignCrew = assignments.filter((assignment) => assignment.userId !== userId).map((assignment) => ({ id: assignment.crewId, name: assignment.crew.name, ownerId: assignment.userId }));
    const ownAssignments = assignments.filter((assignment) => assignment.userId === userId);
    const skills = await this.crewSkillRepo.find({
      where: { crewId: In(assignments.map((assignment) => assignment.crewId)) },
    });
    for (const assignment of assignments) {
      assignment.crew.skills = skills.filter((skill) => skill.crewId === assignment.crewId);
    }
    const member = (assignment: CrewAssignment) => {
      const rank = assignment.crew.rank ?? CrewRank.CADET;
      const expertise = (assignment.crew.skills ?? []).map((skill) => ({
        position: skill.position,
        amount: skill.expertise,
      }));
      const promotion = nextPromotableRank(
        rank,
        Math.max(0, ...expertise.map((skill) => skill.amount)),
      );
      return {
        id: assignment.crewId,
        name: assignment.crew.name,
        type: assignment.crew.type,
        gender: assignment.crew.gender,
        originColony: null,
        position: assignment.slot,
        rank,
        rankLabel: crewRankDefinition(rank).label,
        expertise,
        promotion: promotion
          ? { rank: promotion.rank, label: promotion.label }
          : null,
      };
    };
    return {
      foreignCrew,
      positions: SpacecraftCrewService.positionOrder.map((slot) => ({
        slot,
        target: slot === CrewType.CREWMAN ? null : (targets[slot] ?? 0),
        crew: ownAssignments
          .filter((assignment) => assignment.slot === slot)
          .map(member),
      })),
      unassignedCrew: ownAssignments
        .filter((assignment) => assignment.slot == null)
        .map(member),
    };
  }

  async assignSlot(
    spacecraftId: number,
    crewId: number,
    userId: number,
    slot: CrewType | null,
  ) {
    const ship = await this.findMutableOwnedShip(spacecraftId, userId);
    const assignment = await this.crewAssignmentRepo.findOne({
      where: { crewId, spacecraftId, userId },
      relations: ['crew'],
    });
    if (!assignment) throw new NotFoundException('Crew member not found');
    if (slot != null && !SpacecraftCrewService.positionOrder.includes(slot)) {
      throw new BadRequestException('Unknown crew position');
    }
    if (slot && slot !== CrewType.CREWMAN) {
      const targets = await this.getPositionTargets(ship);
      const assigned = await this.crewAssignmentRepo.count({
        where: { spacecraftId, userId, slot },
      });
      if (assigned >= (targets[slot] ?? 0) && assignment.slot !== slot) {
        throw new BadRequestException('Crew position is full');
      }
    }
    assignment.slot = slot;
    await this.crewAssignmentRepo.save(assignment);
    return this.getCrewManagement(spacecraftId, userId);
  }

  async renameCrewMember(
    spacecraftId: number,
    crewId: number,
    userId: number,
    name: string,
  ) {
    await this.findMutableOwnedShip(spacecraftId, userId);
    const assignment = await this.crewAssignmentRepo.findOne({
      where: { crewId, spacecraftId, userId },
      relations: ['crew'],
    });
    if (!assignment) throw new NotFoundException('Crew member not found');
    assignment.crew.name = this.validateName(name);
    await this.crewRepo.save(assignment.crew);
    return this.getCrewManagement(spacecraftId, userId);
  }

  async renameCrew(spacecraftId: number, userId: number, name: string) {
    await this.findMutableOwnedShip(spacecraftId, userId);
    const baseName = this.validateName(name);
    const assignments = await this.crewAssignmentRepo.find({
      where: { spacecraftId, userId },
      relations: ['crew'],
      order: { crewId: 'ASC' },
    });
    assignments.forEach((assignment, index) => {
      assignment.crew.name = `${baseName} ${index + 1}`;
    });
    if (assignments.length > 0) {
      await this.crewRepo.save(assignments.map((assignment) => assignment.crew));
    }
    return this.getCrewManagement(spacecraftId, userId);
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

  private async findOwnedShip(spacecraftId: number, userId: number) {
    const ship = await this.shipRepo.findOne({
      where: { id: spacecraftId, userId },
    });
    if (!ship) throw new NotFoundException('Spacecraft not found');
    return ship;
  }

  private async findMutableOwnedShip(spacecraftId: number, userId: number) {
    return this.findOwnedShip(spacecraftId, userId);
  }

  private async getPositionTargets(ship: Spacecraft) {
    const shipClass = await this.shipClassRepo.findOneBy({ id: ship.shipClassId });
    const definition = shipClass
      ? this.gameData.getShipClassDefByKey?.(shipClass.key)
      : undefined;
    return (
      this.gameData.getShipyardRumpCrew?.(definition?.stuRumpId)?.positions ?? {}
    );
  }

  private validateName(name: string) {
    const trimmed = name?.trim();
    if (!trimmed) throw new BadRequestException('Crew name is required');
    if (/\p{Cc}/u.test(trimmed)) {
      throw new BadRequestException('Crew name contains control characters');
    }
    if ([...trimmed].length > 255) {
      throw new BadRequestException('Crew name is too long');
    }
    return trimmed;
  }
}
