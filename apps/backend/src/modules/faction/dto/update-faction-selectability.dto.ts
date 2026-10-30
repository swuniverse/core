import { IsBoolean } from 'class-validator';

export class UpdateFactionSelectabilityDto {
  @IsBoolean()
  isSelectable: boolean;
}
