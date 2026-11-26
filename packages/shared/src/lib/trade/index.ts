import type { SpaceLocationDto } from '../starmap/index.js';

export type TradeLicenseStatus = 'NONE' | 'ACCOUNT';

export interface TradePostListItemDto {
  id: number;
  name: string;
  description: string;
  networkId: number;
  /** `null` for an abandoned post (tmw-T12c). */
  owner: {
    id: number;
    name: string;
  } | null;
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

/** One own trade account as STU's account box (`tradeAccounts.twig`). */
export interface TradeAccountBoxDto {
  tradePostId: number;
  name: string;
  isNpcPost: boolean;
  /** Same visibility rule as `TradePostListItemDto.location`. */
  location: SpaceLocationDto | null;
  networkId: number;
  networkName: string;
  stock: Array<{ commodityId: number; amount: number }>;
  /** Goods reserved by own offers; they take no account space (STU). */
  offerStock: Array<{ commodityId: number; amount: number }>;
  /** Only stock counts against the limit, as in every space check. */
  storage: { occupied: number; limit: number; isOverStorage: boolean };
  /** Valid licenses issued at the post, the owner's included (STU `getLicenseCount`). */
  issuedLicenseCount: number;
  licenseCondition: { commodityId: number; amount: number; durationDays: number } | null;
  isOwner: boolean;
  /** Free and total transfer capacity over 24 hours; NPC posts only (STU). */
  transferCapacity: { free: number; capacity: number } | null;
}

export interface TradeOverviewDto {
  accounts: TradeAccountStorageDto[];
  accountBoxes: TradeAccountBoxDto[];
  spacecraft: TradePostSpacecraftDto[];
  /** Free and total transfer capacity per own account post, over the last 24 hours. */
  transferCapacities: Array<{ tradePostId: number; free: number; capacity: number }>;
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
  /** Purchase and renewal are free: the player holds an active trade agreement with the post owner. */
  freeByAgreement: boolean;
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

/** The owner's view of the trade post of an own station (`GET trade/stations/:id/post`). */
export interface StationTradePostDto {
  tradePostId: number;
  name: string;
  description: string;
  networkId: number;
  networkName: string;
  /** The owner's own account at the post; only stock counts as used. */
  storage: { used: number; capacity: number };
  condition: {
    commodityId: number;
    commodityName: string;
    amount: number;
    durationDays: number;
  } | null;
  /** Valid licenses of the post, the owner's included (STU `getLicenseCount`). */
  licenseeCount: number;
  /** Commodities the owner may configure as license price. */
  tradeableCommodities: Array<{ id: number; name: string }>;
}

/** `PATCH trade/posts/:id`, owner only; at least one field. */
export interface UpdateTradePostDto {
  name?: string;
  description?: string;
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

export type TradeOfferSearchMode = 'offer' | 'demand' | 'both';

/** An offer at a licensed post as seen by the searching player. */
export interface TradeOfferListItemDto extends TradeOfferDto {
  networkId: number;
  ownerName: string;
  isOwn: boolean;
  /** How often the player can take it now (stock, space, remaining count). */
  maxTake: number;
}

/** `GET trade/offers?commodityId=&mode=&postId=&page=` */
export interface TradeOfferSearchDto {
  items: TradeOfferListItemDto[];
  total: number;
  page: number;
  pageSize: number;
  /** Posts with a valid own license, for the post filter. */
  licensedPosts: Array<{ id: number; name: string }>;
  /** Tradeable commodities, for the commodity filter. */
  commodities: Array<{ id: number; name: string }>;
}

/** `GET trade/offers/by-commodity/:id`: offers giving or wanting one commodity. */
export interface TradeOfferCommodityOverviewDto {
  commodityId: number;
  commodityName: string;
  offered: TradeOfferListItemDto[];
  wanted: TradeOfferListItemDto[];
}

export interface TakeTradeOfferResultDto {
  taken: number;
  message: string;
}

/** One commodity at a basic trade account (STU `BasicTradeItem`). */
export interface BasicTradeItemDto {
  commodityId: number;
  commodityName: string;
  /** Rate the next trade is pinned to. */
  rateId: string;
  /** Goods received for 1 Aurodium. */
  buyValue: number;
  /** Goods paid for 1 Aurodium. */
  sellValue: number;
  stored: number;
}

/** A licensed NPC post of a faction network with its basic trade. */
export interface BasicTradeAccountDto {
  tradePostId: number;
  tradePostName: string;
  networkId: number;
  aurodium: number;
  items: BasicTradeItemDto[];
}

export interface BasicTradeChartDto {
  networkId: number;
  commodityId: number;
  commodityName: string;
  totalTradeCount: number;
  /** Oldest first; the newest `limit` rates. */
  points: Array<{ value: number; dateMs: number }>;
}

/** `GET trade/basic?limit=` */
export interface BasicTradeOverviewDto {
  accounts: BasicTradeAccountDto[];
  charts: BasicTradeChartDto[];
  limit: number;
}

/** Body of `POST trade/basic/buy` and `/sell`. */
export interface BasicTradeRequestDto {
  postId: number;
  rateId: string;
}

export type TradeDealItemKind = 'COMMODITY' | 'SHIP' | 'BUILDPLAN';

/** Ship or buildplan offer (STU `deals.twig`): hull, buildplan modules and the crew it needs. */
export interface TradeDealBuildplanDto {
  id: number;
  name: string;
  shipClassId: number;
  shipClassKey: string | null;
  shipClassName: string;
  /** Hull minimum crew plus the crew of every module. */
  crew: number;
  modules: Array<{ commodityId: number; name: string; type: string | null }>;
}

export interface TradeDealPlayerDto {
  id: number;
  name: string;
}

/** An active Hutt Cartel instant deal (`GET trade/deals`). */
export interface TradeDealDto {
  id: number;
  kind: TradeDealItemKind;
  /** Remaining takes; `null` is unlimited. */
  amount: number | null;
  give: { commodityId: number; commodityName: string; amount: number } | null;
  /** Ship or buildplan deals: the admin buildplan and its hull. */
  buildplan: TradeDealBuildplanDto | null;
  want: { commodityId: number; commodityName: string; amount: number } | null;
  wantPrestige: number | null;
  factionName: string | null;
  endsAt: string;
}

export interface TradeDealsDto {
  /** Licensed at the Hutt Cartel post; without it `deals` stays empty. */
  hasLicense: boolean;
  notice: string | null;
  tradePostId: number | null;
  tradePostName: string | null;
  prestige: number;
  /** Own account at the Hutt post, for the commodities the deals want. */
  account: Array<{ commodityId: number; amount: number }>;
  deals: TradeDealDto[];
  /** Running auctions (tmw-T8b). */
  auctions: TradeAuctionDto[];
  /** Ended auctions won by the player and not yet claimed. */
  wonAuctions: TradeWonAuctionDto[];
  /** STU `HASENDEDAUCTIONS`: auctions with a winner that ended in the last 30 days, newest first. */
  endedAuctions: TradeEndedAuctionDto[];
}

/** Auction currency: a commodity, or prestige when `null`. */
export type TradeAuctionCurrencyDto = { commodityId: number; commodityName: string } | null;

export interface TradeAuctionDto {
  id: number;
  kind: TradeDealItemKind;
  give: { commodityId: number; commodityName: string; amount: number } | null;
  buildplan: TradeDealBuildplanDto | null;
  currency: TradeAuctionCurrencyDto;
  /** Current price; `null` without bids. */
  currentAmount: number | null;
  isHighestBidder: boolean;
  /** Public like STU; other players' maximum bids stay secret. */
  highestBidder: TradeDealPlayerDto | null;
  /** Own maximum bid while the player is the highest bidder. */
  ownMaxAmount: number | null;
  factionName: string | null;
  endsAt: string;
}

export interface TradeWonAuctionDto {
  id: number;
  kind: TradeDealItemKind;
  give: { commodityId: number; commodityName: string; amount: number } | null;
  buildplan: TradeDealBuildplanDto | null;
  currency: TradeAuctionCurrencyDto;
  price: number;
  /** Part of the maximum bid returned when claiming. */
  refund: number;
  endedAt: string;
}

export interface TradeEndedAuctionDto {
  id: number;
  kind: TradeDealItemKind;
  give: { commodityId: number; commodityName: string; amount: number } | null;
  buildplan: TradeDealBuildplanDto | null;
  currency: TradeAuctionCurrencyDto;
  price: number;
  highestBidder: TradeDealPlayerDto;
  endedAt: string;
}

/** Body of `POST trade/deals/:id/bid`. */
export interface BidTradeAuctionDto {
  maxAmount: number;
}

/** Body of `POST trade/deals/:id/take`. */
export interface TakeTradeDealDto {
  amount: number;
}

/** Admin input for `admin/trade/deals`. Exactly one gift and one price. */
export interface AdminTradeDealInput {
  /** Auction (tmw-T8b): the price field only names the currency. */
  auction?: boolean;
  amount: number | null;
  giveCommodityId: number | null;
  giveCommodityAmount: number | null;
  buildplanId: number | null;
  ship: boolean;
  wantCommodityId: number | null;
  wantCommodityAmount: number | null;
  wantPrestige: number | null;
  factionId: number | null;
  startsAt: string;
  endsAt: string;
}

export interface AdminTradeDealDto extends AdminTradeDealInput {
  id: number;
  auction: boolean;
  auctionAmount: number | null;
  auctionUserId: number | null;
  takenAt: string | null;
  notifiedAt: string | null;
  createdAt: string;
}

/** `GET trade/posts/:id/transfer-targets`: own licensed posts of the same network. */
export interface TradeNetworkTransferTargetsDto {
  tradePostId: number;
  free: number;
  capacity: number;
  targets: Array<{ tradePostId: number; tradePostName: string; freeStorage: number }>;
}

/** Body of `POST trade/posts/:id/transfer`. */
export interface TradeNetworkTransferRequestDto {
  targetPostId: number;
  commodityId: number;
  amount: number;
}

/** `GET`/`POST trade/networks/:id/shoutbox`: the newest entries first. */
export interface TradeShoutboxDto {
  networkId: number;
  networkName: string;
  entries: Array<{ id: number; userId: number; username: string; message: string; createdAt: string }>;
}

/** `GET trade/lottery`: the running monthly period and the last draw. */
export interface TradeLotteryDto {
  hasLicense: boolean;
  notice: string | null;
  tradePostName: string | null;
  /** `YYYY.MM` */
  period: string;
  tickets: number;
  ownTickets: number;
  /** 80 % of the tickets, rounded up. */
  jackpot: number;
  /** Own Aurodium at the Hutt post. */
  aurodium: number;
  lastDraw: {
    period: string;
    tickets: number;
    jackpot: number;
    ownTickets: number;
    winner: { id: number; username: string } | null;
  } | null;
}

/** Admin `admin/trade/lottery-buildplans`: a prize ship of a faction, weighted by chance. */
export interface LotteryWinnerBuildplanDto {
  id: number;
  factionId: number;
  buildplanId: number;
  chance: number;
}
