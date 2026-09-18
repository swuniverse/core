import { Transform } from 'class-transformer';
import { IsInt, Min, ValidateIf } from 'class-validator';

export class EngineeringAmountDto {
  @Transform(({ value }) => (value === 'MAX' ? value : Number(value)))
  @ValidateIf((_object, value) => value !== 'MAX')
  @IsInt()
  @Min(1)
  amount: number | 'MAX';
}
