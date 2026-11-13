import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type { AdminTradeDealDto, AdminTradeDealInput } from '@swuniverse/shared';
import { FactionEntity } from '../faction/entities/faction.entity';
import { GameDataService } from '../game-data/game-data.service';
import { AdminShipBuildplan } from '../spacecraft/entities/admin-ship-buildplan.entity';
import { TradeDeal } from './entities/trade-deal.entity';

/** Admins create Hutt Cartel deals instead of STU's NPC tool `CreateDeal`. */
@Injectable()
export class TradeDealAdminService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly gameData: GameDataService,
  ) {}

  async list(): Promise<AdminTradeDealDto[]> {
    const deals = await this.dataSource.manager.find(TradeDeal, { where: { auction: false }, order: { id: 'DESC' } });
    return deals.map(toDto);
  }

  async create(input: AdminTradeDealInput): Promise<AdminTradeDealDto> {
    const values = await this.validate(input);
    return toDto(await this.dataSource.manager.save(TradeDeal, this.dataSource.manager.create(TradeDeal, { ...values, auction: false, notifiedAt: null })));
  }

  async update(id: number, input: AdminTradeDealInput): Promise<AdminTradeDealDto> {
    const deal = await this.find(id);
    const values = await this.validate(input);
    // A moved start announces the deal again when it begins.
    const notifiedAt = values.startsAt.getTime() === deal.startsAt.getTime() ? deal.notifiedAt : null;
    return toDto(await this.dataSource.manager.save(TradeDeal, Object.assign(deal, values, { notifiedAt })));
  }

  async end(id: number, now = new Date()): Promise<AdminTradeDealDto> {
    const deal = await this.find(id);
    if (deal.endsAt <= now) return toDto(deal);
    deal.endsAt = now;
    if (deal.startsAt >= now) deal.startsAt = new Date(now.getTime() - 1000);
    return toDto(await this.dataSource.manager.save(deal));
  }

  private async find(id: number): Promise<TradeDeal> {
    const deal = await this.dataSource.manager.findOneBy(TradeDeal, { id, auction: false });
    if (!deal) throw new NotFoundException('Deal nicht gefunden');
    return deal;
  }

  private async validate(input: AdminTradeDealInput) {
    const positive = (value: unknown) => Number.isSafeInteger(value) && (value as number) > 0;
    const optional = (value: unknown) => value === null || value === undefined;
    const giveCommodity = !optional(input?.giveCommodityId);
    const buildplan = !optional(input?.buildplanId);
    if (giveCommodity === buildplan) throw new BadRequestException('Genau eine Ware oder einen Bauplan anbieten');
    if (giveCommodity && (!this.gameData.getCommodity(input.giveCommodityId as number) || !positive(input.giveCommodityAmount))) {
      throw new BadRequestException('Angebotene Ware und Menge müssen gültig sein');
    }
    if (buildplan && !(await this.dataSource.manager.existsBy(AdminShipBuildplan, { id: input.buildplanId as number }))) {
      throw new BadRequestException('Bauplan nicht gefunden');
    }
    const wantCommodity = !optional(input.wantCommodityId);
    const wantPrestige = !optional(input.wantPrestige);
    if (wantCommodity === wantPrestige) throw new BadRequestException('Genau eine Ware oder Prestige als Preis verlangen');
    if (wantCommodity && (!this.gameData.getCommodity(input.wantCommodityId as number) || !positive(input.wantCommodityAmount))) {
      throw new BadRequestException('Verlangte Ware und Menge müssen gültig sein');
    }
    if (wantPrestige && !positive(input.wantPrestige)) throw new BadRequestException('Prestigepreis muss positiv sein');
    if (!optional(input.amount) && !positive(input.amount)) throw new BadRequestException('Anzahl muss leer oder positiv sein');
    if (!optional(input.factionId) && !(await this.dataSource.manager.existsBy(FactionEntity, { id: input.factionId as number }))) {
      throw new BadRequestException('Fraktion nicht gefunden');
    }
    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(input.endsAt);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
      throw new BadRequestException('Das Ende muss nach dem Start liegen');
    }
    return {
      amount: input.amount ?? null,
      giveCommodityId: giveCommodity ? (input.giveCommodityId as number) : null,
      giveCommodityAmount: giveCommodity ? (input.giveCommodityAmount as number) : null,
      buildplanId: buildplan ? (input.buildplanId as number) : null,
      ship: buildplan && input.ship === true,
      wantCommodityId: wantCommodity ? (input.wantCommodityId as number) : null,
      wantCommodityAmount: wantCommodity ? (input.wantCommodityAmount as number) : null,
      wantPrestige: wantPrestige ? (input.wantPrestige as number) : null,
      factionId: input.factionId ?? null,
      startsAt,
      endsAt,
    };
  }
}

function toDto(deal: TradeDeal): AdminTradeDealDto {
  return {
    id: deal.id,
    amount: deal.amount,
    giveCommodityId: deal.giveCommodityId,
    giveCommodityAmount: deal.giveCommodityAmount,
    buildplanId: deal.buildplanId,
    ship: deal.ship,
    wantCommodityId: deal.wantCommodityId,
    wantCommodityAmount: deal.wantCommodityAmount,
    wantPrestige: deal.wantPrestige,
    factionId: deal.factionId,
    startsAt: deal.startsAt.toISOString(),
    endsAt: deal.endsAt.toISOString(),
    notifiedAt: deal.notifiedAt?.toISOString() ?? null,
    createdAt: deal.createdAt.toISOString(),
  };
}
