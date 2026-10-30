import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NpcAccountService, NpcKey } from '../auth/npc-account.service';
import {
  FactionZone,
  GalaxyField,
} from '../starmap/entities/galaxy-field.entity';
import { SpaceLocation } from '../starmap/entities/space-location.entity';
import { TradeLicenseCondition } from './entities/trade-license-condition.entity';
import {
  TRADE_POST_DEFAULT_LEVEL,
  TRADE_POST_DEFAULT_STORAGE_LIMIT,
  TRADE_POST_DEFAULT_TRANSFER_CAPACITY,
  TradePost,
} from './entities/trade-post.entity';

type SeedDefinition = {
  name: string;
  networkId: number;
  owner: NpcKey;
  factionZone: FactionZone;
};

const SEED_DEFINITIONS: SeedDefinition[] = [
  {
    name: 'Imperialer Versorgungsknoten Aurek',
    networkId: 1,
    owner: NpcKey.EMPIRE_SUPPLY,
    factionZone: FactionZone.EMPIRE,
  },
  {
    name: 'Imperialer Versorgungsknoten Besh',
    networkId: 1,
    owner: NpcKey.EMPIRE_SUPPLY,
    factionZone: FactionZone.EMPIRE,
  },
  {
    name: 'Versorgungsstützpunkt Aurek',
    networkId: 2,
    owner: NpcKey.REBEL_SUPPLY,
    factionZone: FactionZone.REBEL,
  },
  {
    name: 'Versorgungsstützpunkt Besh',
    networkId: 2,
    owner: NpcKey.REBEL_SUPPLY,
    factionZone: FactionZone.REBEL,
  },
  {
    name: 'Hutten-Handelsposten',
    networkId: 3,
    owner: NpcKey.HUTT_CARTEL,
    factionZone: FactionZone.NEUTRAL,
  },
];

@Injectable()
export class TradePostSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(TradePostSeedService.name);

  constructor(
    @InjectRepository(TradePost)
    private readonly tradePostRepo: Repository<TradePost>,
    @InjectRepository(TradeLicenseCondition)
    private readonly licenseConditionRepo: Repository<TradeLicenseCondition>,
    @InjectRepository(GalaxyField)
    private readonly galaxyFieldRepo: Repository<GalaxyField>,
    @InjectRepository(SpaceLocation)
    private readonly locationRepo: Repository<SpaceLocation>,
    private readonly npcAccounts: NpcAccountService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.seed();
  }

  async seed(): Promise<void> {
    const fields = await this.galaxyFieldRepo.find({
      relations: ['layer'],
      order: { layerId: 'ASC', cx: 'ASC', cy: 'ASC', id: 'ASC' },
    });
    const canonicalLayerId = fields.find((field) => field.layer?.isDefault)?.layerId
      ?? fields[0]?.layerId;
    if (canonicalLayerId === undefined) {
      this.logger.warn('Skipping NPC trade post seed because no galaxy fields exist');
      return;
    }

    const locations = await this.locationRepo.find();
    const locationByFieldId = new Map(
      locations
        .filter((location) => location.galaxyFieldId !== null)
        .map((location) => [location.galaxyFieldId, location.id]),
    );
    const candidates = fields
      .filter((field) => field.layerId === canonicalLayerId)
      .filter((field) => locationByFieldId.has(field.id))
      .sort((left, right) =>
        left.layerId - right.layerId ||
        left.cx - right.cx ||
        left.cy - right.cy ||
        left.id - right.id,
      );
    const used = new Set<number>();

    for (const definition of SEED_DEFINITIONS) {
      const field = candidates.find(
        (candidate) =>
          !used.has(candidate.id) &&
          candidate.factionZone === definition.factionZone,
      );
      if (!field) {
        this.logger.warn(`Skipping ${definition.name}: no eligible location`);
        continue;
      }
      used.add(field.id);
      const locationId = locationByFieldId.get(field.id);
      if (locationId === undefined) continue;
      const owner = await this.npcAccounts.get(definition.owner);
      const existing = await this.tradePostRepo.findOneBy({
        name: definition.name,
      });
      const post = await this.tradePostRepo.save(
        this.tradePostRepo.create({
          ...existing,
          name: definition.name,
          description: '',
          networkId: definition.networkId,
          level: TRADE_POST_DEFAULT_LEVEL,
          storageLimit: TRADE_POST_DEFAULT_STORAGE_LIMIT,
          transferCapacity: TRADE_POST_DEFAULT_TRANSFER_CAPACITY,
          ownerId: owner.id,
          locationId,
          stationId: null,
        }),
      );
      const condition = await this.licenseConditionRepo.findOneBy({
        tradePostId: post.id,
      });
      if (!condition) {
        await this.licenseConditionRepo.save(
          this.licenseConditionRepo.create({
            tradePostId: post.id,
            commodityId: 50,
            amount: 10,
            durationDays: 30,
          }),
        );
      }
    }
  }
}
