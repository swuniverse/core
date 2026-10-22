import { IsString, MaxLength, MinLength } from 'class-validator';
import type { LostPasswordDto, ResetPasswordDto } from '@swuniverse/shared';

export class LostPasswordRequestDto implements LostPasswordDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  login: string;
}

export class ResetPasswordRequestDto implements ResetPasswordDto {
  @IsString()
  @MinLength(32)
  @MaxLength(256)
  token: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;
}
