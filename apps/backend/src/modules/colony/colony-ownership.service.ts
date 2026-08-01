import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Colony } from './entities/colony.entity';

@Injectable()
export class ColonyOwnershipService {
  constructor(
    @InjectRepository(Colony)
    private readonly colonyRepo: Repository<Colony>,
  ) {}

  async findOwnedColony(colonyId: number, userId: number): Promise<Colony> {
    const colony = await this.colonyRepo.findOne({
      where: { id: colonyId, userId, isAbandoned: false },
      relations: [
        'fields',
        'storage',
        'stats',
        'changeable',
        'starSystem',
        'celestialObject',
      ],
    });
    if (!colony) throw new NotFoundException('Colony not found');
    return colony;
  }

  async findOwnedColonyWithChangeable(
    colonyId: number,
    userId: number,
  ): Promise<Colony> {
    const colony = await this.colonyRepo.findOne({
      where: { id: colonyId, userId, isAbandoned: false },
      relations: ['changeable', 'stats'],
    });
    if (!colony) throw new NotFoundException('Colony not found');
    if (!colony.changeable) {
      throw new BadRequestException('Colony changeable state missing');
    }
    return colony;
  }
}
