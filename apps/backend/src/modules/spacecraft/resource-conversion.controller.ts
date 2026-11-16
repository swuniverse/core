import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsInt, Max, Min } from 'class-validator';
import { RequiresGameAccess } from '../game-status/game-status.guard';
import { ResourceConversionService } from './resource-conversion.service';

export class ResourceConversionSelection {
  @IsInt() @Min(1) @Max(2147483647) commodityId: number;
}
@Controller('spacecraft')
@RequiresGameAccess()
@UseGuards(AuthGuard('jwt'))
export class ResourceConversionController {
  constructor(private readonly collection: ResourceConversionService) {}
  @Get(':id/resource-conversion')
  get(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.collection.get(id, req.user.sub);
  }
  @Post(':id/resource-conversion')
  select(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body() body: ResourceConversionSelection,
  ) {
    return this.collection.select(id, req.user.sub, body.commodityId);
  }
  @Delete(':id/resource-conversion')
  stop(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.collection.select(id, req.user.sub, null);
  }
}
