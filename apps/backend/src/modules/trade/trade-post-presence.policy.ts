import { Injectable } from '@nestjs/common';
import type { SpacecraftRuntimeSystemsDto } from '@swuniverse/shared';
import type { TradePost } from './entities/trade-post.entity';

export interface TradePostPresenceShip {
  userId: number;
  locationId: number;
  status: string;
  runtimeSystems: SpacecraftRuntimeSystemsDto | null;
  dockedAtId?: number | null;
}

@Injectable()
export class TradePostPresencePolicy {
  isAt(
    ship: TradePostPresenceShip,
    post: Pick<TradePost, 'locationId'>,
    userId: number,
  ): boolean {
    return (
      ship.userId === userId &&
      ship.locationId === post.locationId &&
      ship.status !== 'IN_FLIGHT' &&
      ship.runtimeSystems?.WARPDRIVE?.active !== true &&
      ship.runtimeSystems?.CLOAK?.active !== true
    );
  }
}
