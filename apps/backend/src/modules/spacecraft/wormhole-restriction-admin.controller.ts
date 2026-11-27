import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { AdminWormholeRestrictionsDto } from '@swuniverse/shared';
import { Permission } from '../auth/permissions';
import { PermissionGuard, RequirePermission } from '../auth/permission.guard';
import { WormholeRestrictionRequest } from './wormhole-restriction.dto';
import { WormholeRestrictionService } from './wormhole-restriction.service';

/** STU "Wurmlochkontrolle": only admins and map editors manage wormhole rules. */
@Controller('starmap/admin')
@UseGuards(AuthGuard('jwt'), PermissionGuard)
@RequirePermission(Permission.MAP_EDITOR)
export class WormholeRestrictionAdminController {
  constructor(private readonly restrictions: WormholeRestrictionService) {}

  @Get('wormhole-restrictions')
  list(): Promise<AdminWormholeRestrictionsDto> {
    return this.restrictions.list();
  }

  @Post('wormholes/:id/restrictions')
  add(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: WormholeRestrictionRequest,
  ): Promise<AdminWormholeRestrictionsDto> {
    return this.restrictions.add(id, dto);
  }

  @Delete('wormholes/:id/restrictions/:restrictionId')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Param('restrictionId', ParseIntPipe) restrictionId: number,
  ): Promise<AdminWormholeRestrictionsDto> {
    return this.restrictions.remove(id, restrictionId);
  }
}
