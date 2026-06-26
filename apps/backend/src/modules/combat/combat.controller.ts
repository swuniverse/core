import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CombatService } from './combat.service';

@Controller('combat')
@UseGuards(AuthGuard('jwt'))
export class CombatController {
  constructor(private readonly combatService: CombatService) {}

  @Post('attack-colony')
  attackColony(
    @Request() req: { user: { sub: number } },
    @Body('attackerId') attackerId: number,
    @Body('colonyId') colonyId: number,
  ) {
    return this.combatService.attackColony(attackerId, colonyId, req.user.sub);
  }

  @Post('attack')
  attack(
    @Request() req: { user: { sub: number } },
    @Body('attackerId') attackerId: number,
    @Body('targetId') targetId: number,
  ) {
    return this.combatService.attack(attackerId, targetId, req.user.sub);
  }
}
