import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export const ADMIN_SHIP_SPAWN_PRESETS = [
  'operational',
  'damaged',
  'critical',
  'offline',
] as const;
export type AdminShipSpawnPreset = (typeof ADMIN_SHIP_SPAWN_PRESETS)[number];

export class AdminShipModuleSelectionDto {
  @IsString()
  @IsNotEmpty()
  slotId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  commodityId!: number;
}

export class AdminSpawnShipDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  shipClassId!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  buildplanId?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  torpedoTypeId?: number;

  @IsBoolean()
  @IsOptional()
  fillTorpedoes = false;

  @IsString()
  @IsOptional()
  name = '';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  layerId!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  posX!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  posY!: number;

  @IsArray()
  @ArrayMaxSize(32)
  @ValidateNested({ each: true })
  @Type(() => AdminShipModuleSelectionDto)
  modules: AdminShipModuleSelectionDto[] = [];

  @IsIn(ADMIN_SHIP_SPAWN_PRESETS)
  preset: AdminShipSpawnPreset = 'operational';
}
