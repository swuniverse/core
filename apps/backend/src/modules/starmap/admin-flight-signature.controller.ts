import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, ValidateIf, Max, Min } from 'class-validator';
import type {
  AdminFlightSignatureQueryDto,
  AdminFlightSignatureFilter,
} from '@swuniverse/shared';
import { AdminGuard } from '../auth/admin.guard';
import { RequiresGameAccess } from '../game-status/game-status.guard';
import { AdminFlightSignatureService } from './admin-flight-signature.service';

export class AdminFlightSignatureQuery implements AdminFlightSignatureQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  xStart: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  xEnd: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  yStart: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  yEnd: number;

  @IsOptional()
  @IsIn(['ALL', 'SPACECRAFT', 'USER', 'ALLIANCE'])
  filter?: AdminFlightSignatureFilter;

  @ValidateIf(
    (query: AdminFlightSignatureQuery) =>
      (query.filter ?? 'ALL') !== 'ALL' || query.targetId !== undefined,
  )
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  targetId?: number;
}

@Controller('starmap/admin')
@RequiresGameAccess()
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class AdminFlightSignatureController {
  constructor(private readonly signatures: AdminFlightSignatureService) {}

  @Get('layers/:layerId/flight-signatures')
  getFields(
    @Param('layerId', ParseIntPipe) layerId: number,
    @Query() query: AdminFlightSignatureQuery,
  ) {
    return this.signatures.getFields(layerId, query);
  }
}
