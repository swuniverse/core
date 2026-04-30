import { IsString, IsEmail, MinLength, MaxLength, IsEnum } from 'class-validator';
import { Faction } from '@swuniverse/shared';

export class RegisterRequestDto {
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  username: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @IsEnum(Faction)
  faction: Faction;
}
