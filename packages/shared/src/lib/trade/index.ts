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
