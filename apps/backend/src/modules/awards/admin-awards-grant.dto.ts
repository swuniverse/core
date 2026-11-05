import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class AdminAwardsGrantDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  playerId!: number;

  @IsString()
  @IsNotEmpty()
  awardKey!: string;

  @IsBoolean()
  @IsOptional()
  incrementExisting?: boolean;
}
