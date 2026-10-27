import { IsString } from 'class-validator';

export class ChangeEmailRequestDto {
  @IsString()
  password: string;

  @IsString()
  newEmail: string;
}
