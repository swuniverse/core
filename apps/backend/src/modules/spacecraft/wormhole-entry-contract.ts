import { IsInt, IsOptional, Min } from 'class-validator';

// Registered only with the atomic passage executor from tmw-K7a2.
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
