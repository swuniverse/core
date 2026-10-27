import { IsEmail, IsString, MaxLength } from 'class-validator';

export class VerifyEmailRequestDto {
  @IsString()
  token: string;
}

export class UpdateVerificationEmailRequestDto {
  @IsEmail()
  @MaxLength(254)
  email: string;
}
