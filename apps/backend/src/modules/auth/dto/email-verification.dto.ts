import { IsEmail, IsString, MaxLength } from 'class-validator';

export class VerifyEmailRequestDto {
  @IsString()
  token: string;
}

export class UpdateVerificationEmailRequestDto {
  @IsEmail()
  @MaxLength(255)
  email: string;
}
