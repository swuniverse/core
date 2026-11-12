import type { SpaceLocationDto } from '../starmap/index.js';

export type TradeLicenseStatus = 'NONE' | 'ACCOUNT';

export interface TradePostListItemDto {
  id: number;
  name: string;
  description: string;
  networkId: number;
  owner: {
    id: number;
    name: string;
  };
  licenseStatus: TradeLicenseStatus;
  location: SpaceLocationDto | null;
  level: number;
  storageLimit: number;
  transferCapacity: number;
}

export interface TradeAccountStorageDto {
  tradePostId: number;
  commodityId: number;
  amount: number;
}

export interface TradePostSpacecraftDto {
  tradePostId: number;
  spacecraftId: number;
  spacecraftName: string;
  shipClassId: number;
  kind: 'SHIP' | 'STATION';
}

export interface TradeOverviewDto {
  accounts: TradeAccountStorageDto[];
  spacecraft: TradePostSpacecraftDto[];
}

/** A valid trade license of the requesting player (`GET trade/licenses`). */
export interface TradeLicenseDto {
  id: number;
  tradePostId: number;
  tradePostName: string;
  networkId: number;
  startsAt: string;
  expiresAt: string;
}

/** A valid license issued at an own trade post (`GET trade/posts/:id/licenses`). */
export interface IssuedTradeLicenseDto {
  id: number;
  userId: number;
  username: string;
  startsAt: string;
  expiresAt: string;
}

export interface TradeLicensePaymentShipDto {
  id: number;
  name: string;
  /** Cargo of the license commodity. */
  amount: number;
}

export interface TradeLicensePaymentAccountDto {
  tradePostId: number;
  tradePostName: string;
  /** Stock of the license commodity. */
  amount: number;
}

/**
 * Server-authorized license options at a post for the requesting player
 * (`GET trade/posts/:id/license-menu?shipId=`). Sources already have enough stock.
 */
export interface TradeLicenseMenuDto {
  tradePostId: number;
  tradePostName: string;
  networkId: number;
  isOwner: boolean;
  condition: {
    commodityId: number;
    commodityName: string;
    amount: number;
    durationDays: number;
  } | null;
  /** The player's license while it is valid. */
  license: { id: number; startsAt: string; expiresAt: string } | null;
  /** Resulting expiry of a renewal now; `null` when there is nothing to renew. */
  renewalExpiresAt: string | null;
  purchase: {
    shipId: number | null;
    /** Why no purchase is possible now; `null` when it is. */
    rejection: string | null;
    payShips: TradeLicensePaymentShipDto[];
  };
  /** Own accounts in the post's network that cover the price. */
  accounts: TradeLicensePaymentAccountDto[];
  /** Commodities the owner may configure as price; empty for everyone else. */
  tradeableCommodities: Array<{ id: number; name: string }>;
}

/** The trade post at a spacecraft's location (`GET trade/spacecraft/:id/post`). */
export interface TradePostAtSpacecraftDto {
  tradePostId: number;
  tradePostName: string;
  /** Why the ship cannot use the post now; `null` when it can. */
  reason: string | null;
}
