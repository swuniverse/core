import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CombatService } from './combat.service';

@Controller('combat')
@UseGuards(AuthGuard('jwt'))
export class CombatController {
  constructor(private readonly combatService: CombatService) {}

  @Post('attack')
  attack(
    @Request() req: { user: { sub: number } },
    @Body('attackerId') attackerId: number,
    @Body('targetId') targetId: number,
  ) {
    return this.combatService.attack(attackerId, targetId, req.user.sub);
  }
}
