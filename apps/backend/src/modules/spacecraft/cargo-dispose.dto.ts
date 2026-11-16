import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import type { SpacecraftCargoDisposeRequestDto } from '@swuniverse/shared';

class CargoDisposeItemDto {
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  commodityId: number;

  @IsInt()
  @Min(0)
  @Max(Number.MAX_SAFE_INTEGER)
  amount: number;
}

export class CargoDisposeDto implements SpacecraftCargoDisposeRequestDto {
  @IsArray()
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => CargoDisposeItemDto)
  items: CargoDisposeItemDto[];
}
