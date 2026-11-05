import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminGuard } from '../auth/admin.guard';
import { RequiresGameAccess } from '../game-status/game-status.guard';
import { User } from '../auth/user.entity';
import { AdminAwardsGrantDto } from './admin-awards-grant.dto';
import { AwardService } from './award.service';
import { Award } from './entities/award.entity';

@Controller('admin/awards')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class AdminAwardsController {
  constructor(
    private readonly awardService: AwardService,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Award)
    private readonly awardRepository: Repository<Award>,
  ) {}

  @RequiresGameAccess()
  @Get('catalog')
  catalog() {
    return this.awardRepository.find({
      select: { key: true, description: true, prestige: true, isNpc: true },
      order: { key: 'ASC' },
    });
  }

  @RequiresGameAccess()
  @Post('grant')
  async grant(@Body() input: AdminAwardsGrantDto) {
    if (!(await this.userRepository.existsBy({ id: input.playerId }))) {
      throw new NotFoundException(`Player ${input.playerId} not found`);
    }
    if (!(await this.awardRepository.existsBy({ key: input.awardKey }))) {
      throw new NotFoundException(`Award ${input.awardKey} not found`);
    }
    return this.awardService.grant(input.playerId, input.awardKey, {
      incrementExisting: input.incrementExisting,
    });
  }
}
