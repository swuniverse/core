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
        'starSystem',
        'celestialObject',
      ],
    });
    if (!colony) throw new NotFoundException('Colony not found');
    return colony;
  }

  async findOwnedColonyWithStats(
    colonyId: number,
    userId: number,
  ): Promise<Colony> {
    const colony = await this.colonyRepo.findOne({
      where: { id: colonyId, userId, isAbandoned: false },
      relations: ['stats'],
    });
    if (!colony) throw new NotFoundException('Colony not found');
    if (!colony.stats) throw new BadRequestException('Colony stats missing');
    return colony;
  }
}
