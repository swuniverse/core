import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RequiresGameAccess } from '../game-status/game-status.guard';
import { AllianceDepotService } from './alliance-depot.service';

@Controller()
@RequiresGameAccess()
@UseGuards(AuthGuard('jwt'))
export class AllianceDepotController {
  constructor(private readonly depots: AllianceDepotService) {}
  @Get('spacecraft/:id/alliance-depot')
  get(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.depots.get(id, req.user.sub);
  }
  @Put('spacecraft/:id/alliance-depot')
  async assign(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    await this.depots.assign(id, req.user.sub);
    return { message: 'Depot der Allianz zugeordnet' };
  }
  @Delete('spacecraft/:id/alliance-depot')
  async unassign(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    await this.depots.unassign(id, req.user.sub);
    return { message: 'Depotzuordnung gelöst' };
  }
  @Get('alliances/:id/depots')
  list(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.depots.list(id, req.user.sub);
  }
}
