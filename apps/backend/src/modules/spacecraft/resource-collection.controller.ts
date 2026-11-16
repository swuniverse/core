import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { RequiresGameAccess } from '../game-status/game-status.guard';
import { PermissionGuard, RequirePermission } from '../auth/permission.guard';
import { Permission } from '../auth/permissions';
import { ResourceCollectionService } from './resource-collection.service';

export class ResourceCollectionSelection {
  @IsInt() @Min(1) @Max(2147483647) commodityId: number;
}
export class MiningResourceRequest {
  @IsInt() @Min(1) @Max(2147483647) commodityId: number;
  @IsInt() @Min(1) @Max(1000) rate: number;
}
export class FieldMiningRequest {
  @IsArray()
  @ArrayMaxSize(16)
  @ValidateNested({ each: true })
  @Type(() => MiningResourceRequest)
  resources: MiningResourceRequest[];
}

@Controller('spacecraft')
@RequiresGameAccess()
@UseGuards(AuthGuard('jwt'))
export class ResourceCollectionController {
  constructor(private readonly collection: ResourceCollectionService) {}
  @Get(':id/resource-collection')
  get(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.collection.get(id, req.user.sub);
  }
  @Post(':id/resource-collection')
  select(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body() body: ResourceCollectionSelection,
  ) {
    return this.collection.select(id, req.user.sub, body.commodityId);
  }
  @Delete(':id/resource-collection')
  stop(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.collection.select(id, req.user.sub, null);
  }
}

@Controller('starmap/admin/field-types')
@RequiresGameAccess()
@UseGuards(AuthGuard('jwt'), PermissionGuard)
@RequirePermission(Permission.MAP_EDITOR)
export class FieldMiningController {
  constructor(private readonly collection: ResourceCollectionService) {}
  @Get('mining-commodities')
  commodities() {
    return this.collection.miningCommodities();
  }

  @Patch(':id/mining')
  configure(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: FieldMiningRequest,
  ) {
    return this.collection.configureFieldType(id, body.resources);
  }
}
