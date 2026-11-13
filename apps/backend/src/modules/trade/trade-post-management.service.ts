import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, MoreThan } from 'typeorm';
import type { StationTradePostDto, UpdateTradePostDto } from '@swuniverse/shared';
import { User } from '../auth/user.entity';
import { GameDataService } from '../game-data/game-data.service';
import { Spacecraft, SpacecraftKind } from '../spacecraft/entities/spacecraft.entity';
import { TradeLicenseCondition } from './entities/trade-license-condition.entity';
import { TradeLicense } from './entities/trade-license.entity';
import { TradePost } from './entities/trade-post.entity';
import { tradeNetworkName } from './trade-network';
import { TradeStorageService } from './trade-storage.service';

const NAME_MIN = 3;
const NAME_MAX = 40;
const DESCRIPTION_MAX = 1000;

/**
 * Owner management of a player trade post from the station view (tmw-T12b,
 * STU `ChangeTradePostName` and the station's trade post box).
 */
@Injectable()
export class TradePostManagementService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly storage: TradeStorageService,
    private readonly gameData: GameDataService,
  ) {}

  async getForStation(stationId: number, userId: number, now = new Date()): Promise<StationTradePostDto | null> {
    const manager = this.dataSource.manager;
    const station = await manager.findOneBy(Spacecraft, { id: stationId, userId, kind: SpacecraftKind.STATION });
    if (!station) throw new NotFoundException('Station nicht gefunden');
    const post = await manager.findOneBy(TradePost, { stationId: station.id, ownerId: userId });
    if (!post) return null;
    const [owner, condition, licenseeCount, capacity] = await Promise.all([
      manager.findOneBy(User, { id: userId }),
      manager.findOneBy(TradeLicenseCondition, { tradePostId: post.id }),
      manager.countBy(TradeLicense, { tradePostId: post.id, expiresAt: MoreThan(now) }),
      this.storage.capacityIn(manager, post.id, userId, post),
    ]);
    return {
      tradePostId: post.id,
      name: post.name,
      description: post.description,
      networkId: post.networkId,
      networkName: tradeNetworkName(post.networkId, post.networkId === post.ownerId ? owner?.username : null),
      storage: { used: capacity.occupied, capacity: capacity.capacity },
      condition: condition
        ? {
            commodityId: condition.commodityId,
            commodityName: this.gameData.getCommodity(condition.commodityId)?.name ?? `Ware #${condition.commodityId}`,
            amount: condition.amount,
            durationDays: condition.durationDays,
          }
        : null,
      licenseeCount,
      tradeableCommodities: this.gameData
        .getAllCommodities()
        .filter((commodity) => commodity.isTradeable)
        .map((commodity) => ({ id: commodity.id, name: commodity.name }))
        .sort((left, right) => left.name.localeCompare(right.name, 'de')),
    };
  }

  async update(tradePostId: number, userId: number, input: UpdateTradePostDto): Promise<TradePost> {
    const changes: Partial<Pick<TradePost, 'name' | 'description'>> = {};
    if (input?.name !== undefined) changes.name = this.validName(input.name);
    if (input?.description !== undefined) changes.description = this.validDescription(input.description);
    if (!Object.keys(changes).length) throw new BadRequestException('Name oder Beschreibung angeben');

    return this.dataSource.transaction(async (manager) => {
      const post = await manager.findOne(TradePost, {
        where: { id: tradePostId, ownerId: userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!post) throw new NotFoundException('Handelsposten nicht gefunden');
      Object.assign(post, changes);
      return manager.save(post);
    });
  }

  private validName(value: unknown): string {
    const name = typeof value === 'string' ? cleanLine(value) : '';
    const length = [...name].length;
    if (length < NAME_MIN || length > NAME_MAX) {
      throw new BadRequestException(`Der Name muss ${NAME_MIN} bis ${NAME_MAX} Zeichen lang sein`);
    }
    return name;
  }

  private validDescription(value: unknown): string {
    if (typeof value !== 'string') throw new BadRequestException('Die Beschreibung muss ein Text sein');
    const description = cleanText(value);
    if ([...description].length > DESCRIPTION_MAX) {
      throw new BadRequestException(`Die Beschreibung darf höchstens ${DESCRIPTION_MAX} Zeichen lang sein`);
    }
    return description;
  }
}

/** STU `trim(strip_tags(...))`; control characters become spaces. */
function cleanLine(value: string): string {
  return replaceControls(stripTags(value), () => false).trim();
}

/** Like {@link cleanLine}, but keeps line breaks and tabs. */
function cleanText(value: string): string {
  return replaceControls(stripTags(value).replace(/\r\n?/g, '\n'), (char) => char === '\n' || char === '\t').trim();
}

function stripTags(value: string): string {
  return value.replace(/<[^>]*>?/g, '');
}

function replaceControls(value: string, keep: (char: string) => boolean): string {
  return value
    .split('')
    .map((char) => {
      const code = char.charCodeAt(0);
      return (code < 32 || code === 127) && !keep(char) ? ' ' : char;
    })
    .join('');
}
