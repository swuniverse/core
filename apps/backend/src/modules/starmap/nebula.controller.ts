import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { NebulaApplyDto, NebulaSettingsDto } from '@swuniverse/shared';
import { PermissionGuard, RequirePermission } from '../auth/permission.guard';
import { Permission } from '../auth/permissions';
import { RequiresGameAccess } from '../game-status/game-status.guard';
import { NebulaService } from './nebula.service';

@Controller('starmap/admin/layers/:id/nebula')
@RequiresGameAccess()
@UseGuards(AuthGuard('jwt'), PermissionGuard)
@RequirePermission(Permission.MAP_EDITOR)
export class NebulaController {
  constructor(private readonly nebula: NebulaService) {}

  @Post('preview')
  preview(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: NebulaSettingsDto,
  ) {
    return this.nebula.preview(id, body);
  }

  @Post('apply')
  apply(@Param('id', ParseIntPipe) id: number, @Body() body: NebulaApplyDto) {
    return this.nebula.apply(id, body);
  }
}
