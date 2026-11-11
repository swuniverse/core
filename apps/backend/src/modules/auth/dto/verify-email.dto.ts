import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class VerifyEmailRequestDto {
  @IsString()
  @MinLength(16)
  @MaxLength(128)
  token: string;
}

export class ResendVerificationRequestDto {
  @IsEmail()
  email: string;
}
