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

export type TradeAccountTransferDirection = 'TO_ACCOUNT' | 'FROM_ACCOUNT';

/** One requested line of an account transfer. */
export interface TradeAccountTransferLineDto {
  commodityId: number;
  amount: number;
}

/** Outcome like STU's transfer info: what moved and why lines were cut. Costs no energy. */
export interface TradeAccountTransferResultDto {
  direction: TradeAccountTransferDirection;
  transferred: Array<{ commodityId: number; commodityName: string; amount: number }>;
  messages: string[];
}

export interface TradeMenuGoodDto {
  commodityId: number;
  commodityName: string;
  amount: number;
  /** Whether this direction accepts the commodity at all. */
  transferable: boolean;
}

/** Ship trade menu at a post (`GET spacecraft/:id/trade/:postId`). */
export interface TradeMenuDto {
  tradePostId: number;
  tradePostName: string;
  /** Why the ship cannot trade here now; `null` when it can. */
  reason: string | null;
  hasLicense: boolean;
  cargo: TradeMenuGoodDto[];
  cargoUsed: number;
  cargoMax: number;
  account: TradeMenuGoodDto[];
  accountUsed: number;
  accountCapacity: number;
}

/** An own offer at a post (`GET trade/offers/mine`). */
export interface TradeOfferDto {
  id: number;
  tradePostId: number;
  tradePostName: string;
  offeredCommodityId: number;
  offeredCommodityName: string;
  /** Goods given per offer. */
  offeredAmount: number;
  wantedCommodityId: number;
  wantedCommodityName: string;
  /** Goods wanted per offer. */
  wantedAmount: number;
  /** Remaining number of offers. */
  offerCount: number;
  /** Goods held back from the account for the remaining offers. */
  reservedAmount: number;
  createdAt: string;
}

/** Body of `POST trade/posts/:id/offers`. */
export interface CreateTradeOfferDto {
  offeredCommodityId: number;
  offeredAmount: number;
  wantedCommodityId: number;
  wantedAmount: number;
  offerCount: number;
}

/** Server-authorized choices for a new offer (`GET trade/posts/:id/offer-options`). */
export interface TradeOfferOptionsDto {
  tradePostId: number;
  tradePostName: string;
  hasLicense: boolean;
  /** Free account space; a new offer needs some, like STU. */
  accountFree: number;
  /** Tradeable goods in the own account at this post. */
  accountGoods: Array<{ commodityId: number; commodityName: string; amount: number }>;
  /** Commodities that may be wanted in return. */
  tradeableCommodities: Array<{ id: number; name: string }>;
}
