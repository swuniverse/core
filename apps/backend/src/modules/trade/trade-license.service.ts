import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import type { IssuedTradeLicenseDto, TradeLicenseDto } from '@swuniverse/shared';
import { TradeLicense } from './entities/trade-license.entity';
import { GameDataService } from '../game-data/game-data.service';
import { TradeLicenseCondition } from './entities/trade-license-condition.entity';
import { TradePost } from './entities/trade-post.entity';

export interface TradeLicenseConditionInput {
  commodityId: number;
  amount: number;
  durationDays: number;
}

@Injectable()
export class TradeLicenseService {
  constructor(
    @InjectRepository(TradePost)
    private readonly posts: Repository<TradePost>,
    @InjectRepository(TradeLicenseCondition)
    private readonly conditions: Repository<TradeLicenseCondition>,
    private readonly gameData: GameDataService,
    @InjectRepository(TradeLicense)
    private readonly licenses: Repository<TradeLicense>,
  ) {}

  async getCondition(
    tradePostId: number,
    userId: number,
  ): Promise<TradeLicenseCondition | null> {
    await this.ownedPost(tradePostId, userId);
    return this.conditions.findOneBy({ tradePostId });
  }

  async setCondition(
    tradePostId: number,
    userId: number,
    input: TradeLicenseConditionInput,
  ): Promise<TradeLicenseCondition> {
    await this.ownedPost(tradePostId, userId);
    this.validate(input);

    const commodity = this.gameData.getCommodity(input.commodityId);
    if (!commodity?.isTradeable) {
      throw new BadRequestException('Ware ist nicht handelbar');
    }

    const condition =
      (await this.conditions.findOneBy({ tradePostId })) ??
      this.conditions.create({ tradePostId });
    Object.assign(condition, input);
    return this.conditions.save(condition);
  }

  /** Valid licenses only: a license grants nothing from its expiry on. */
  async listOwn(userId: number, now = new Date()): Promise<TradeLicenseDto[]> {
    const licenses = await this.licenses.find({
      where: { userId, expiresAt: MoreThan(now) },
      relations: ['tradePost'],
      order: { expiresAt: 'ASC', id: 'ASC' },
    });
    return licenses.map((license) => ({
      id: license.id,
      tradePostId: license.tradePostId,
      tradePostName: license.tradePost.name,
      networkId: license.tradePost.networkId,
      startsAt: license.startsAt.toISOString(),
      expiresAt: license.expiresAt.toISOString(),
    }));
  }

  async listIssued(tradePostId: number, userId: number, now = new Date()): Promise<IssuedTradeLicenseDto[]> {
    // STU: every holder of a valid license at the post sees the list; the owner holds a permanent one.
    const own = await this.licenses.existsBy({ tradePostId, userId, expiresAt: MoreThan(now) });
    if (!own) throw new ForbiddenException('Nur Lizenzinhaber sehen die ausgestellten Lizenzen');
    const licenses = await this.licenses.find({
      where: { tradePostId, expiresAt: MoreThan(now) },
      relations: ['user'],
      order: { expiresAt: 'ASC', id: 'ASC' },
    });
    return licenses.map((license) => ({
      id: license.id,
      userId: license.userId,
      username: license.user.username,
      startsAt: license.startsAt.toISOString(),
      expiresAt: license.expiresAt.toISOString(),
    }));
  }

  private async ownedPost(tradePostId: number, userId: number) {
    const post = await this.posts.findOneBy({ id: tradePostId, ownerId: userId });
    if (!post) throw new NotFoundException('Handelsposten nicht gefunden');
    return post;
  }

  private validate(input: TradeLicenseConditionInput): void {
    if (!Number.isSafeInteger(input.commodityId) || input.commodityId < 1) {
      throw new BadRequestException('Ware muss eine gültige ID haben');
    }
    if (!Number.isSafeInteger(input.amount) || input.amount < 1) {
      throw new BadRequestException('Menge muss eine positive Ganzzahl sein');
    }
    if (
      !Number.isSafeInteger(input.durationDays) ||
      input.durationDays < 1 ||
      input.durationDays > 365
    ) {
      throw new BadRequestException(
        'Lizenzdauer muss zwischen 1 und 365 Tagen liegen',
      );
    }
  }
}
