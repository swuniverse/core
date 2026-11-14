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
    return this.reason(ship, post, userId) === null;
  }

  /** Why the ship cannot act at the post, or `null` when it can. */
  reason(
    ship: TradePostPresenceShip,
    post: Pick<TradePost, 'locationId'>,
    userId: number,
  ): string | null {
    if (ship.userId !== userId) return 'Das Schiff gehört nicht dir';
    if (ship.locationId !== post.locationId) {
      return 'Das Schiff befindet sich nicht am Handelsposten';
    }
    if (ship.runtimeSystems?.WARPDRIVE?.active === true) {
      return 'Der Hyperantrieb ist aktiv';
    }
    if (ship.runtimeSystems?.CLOAK?.active === true) return 'Die Tarnung ist aktiv';
    return null;
  }
}
