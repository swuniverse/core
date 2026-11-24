import {
  BadRequestException,
  Body,
  Controller,
  NotFoundException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DataSource } from 'typeorm';
import { AdminGuard } from '../auth/admin.guard';
import { User } from '../auth/user.entity';
import { RequiresGameAccess } from '../game-status/game-status.guard';
import { MessagingService } from '../messaging/messaging.service';
import { AdminPrestigeCorrectionDto } from './admin-prestige.dto';
import { PrestigeService } from './prestige.service';

/** STU `PrestigeCheat`, admin only: books a signed amount with a mandatory reason. */
@Controller('admin/prestige')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class AdminPrestigeController {
  constructor(
    private readonly dataSource: DataSource,
    private readonly prestige: PrestigeService,
    private readonly messaging: MessagingService,
  ) {}

  @RequiresGameAccess()
  @Post('correction')
  async correct(
    @Body() input: AdminPrestigeCorrectionDto,
  ): Promise<{ playerId: number; prestige: number }> {
    const total = await this.dataSource.transaction(async (manager) => {
      const user = await manager.findOne(User, {
        where: { id: input.playerId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) throw new NotFoundException('Spieler nicht gefunden');
      if (user.isNpc) {
        throw new BadRequestException('NPC-Konten haben kein Prestige');
      }
      await this.prestige.change(user.id, input.amount, input.description, manager);
      return user.prestige + input.amount;
    });
    await this.messaging.sendSystem(
      input.playerId,
      `Dein Prestige wurde von der Spielleitung um ${input.amount} geändert.\nGrund: ${input.description}`,
    );
    return { playerId: input.playerId, prestige: total };
  }
}
