import { IsInt, IsOptional, Min } from 'class-validator';

// This contract is not a registered route. Activation belongs to tmw-K7a2.
export const WORMHOLE_ENTRY_ROUTE = {
  method: 'POST',
  path: 'spacecraft/:id/wormhole/enter',
} as const;

export class WormholeEntryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  wormholeId?: number;
}
