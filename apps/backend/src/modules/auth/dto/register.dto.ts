import { IsString, IsEmail, MinLength, MaxLength, IsInt } from 'class-validator';

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

  @IsInt()
  factionId: number;
}
