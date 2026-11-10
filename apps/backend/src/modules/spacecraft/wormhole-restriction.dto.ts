import { IsIn, IsInt, Max, Min } from 'class-validator';
import {
  WORMHOLE_RESTRICTION_MODES,
  WORMHOLE_RESTRICTION_TARGET_TYPES,
  type CreateWormholeRestrictionDto,
  type WormholeRestrictionMode,
  type WormholeRestrictionTargetType,
} from '@swuniverse/shared';

export class WormholeRestrictionRequest implements CreateWormholeRestrictionDto {
  @IsInt()
  @Min(1)
  @Max(2147483647)
  wormholeId: number;

  @IsIn(WORMHOLE_RESTRICTION_TARGET_TYPES)
  targetType: WormholeRestrictionTargetType;

  @IsInt()
  @Min(1)
  @Max(2147483647)
  targetId: number;

  @IsIn(WORMHOLE_RESTRICTION_MODES)
  mode: WormholeRestrictionMode;
}
