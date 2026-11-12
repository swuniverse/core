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
