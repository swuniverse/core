import { IsInt, Min } from 'class-validator';

export class UpdateFactionPlayerLimitDto {
  @IsInt()
  @Min(0)
  playerLimit: number;
}
