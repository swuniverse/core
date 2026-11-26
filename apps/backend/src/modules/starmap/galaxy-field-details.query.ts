import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  fieldEffectDefinition,
  knownFieldEffects,
  type StarmapFieldTradePostDto,
  type StarmapGalaxyFieldDetailsDto,
  type StarmapRegionInfoDto,
  type StarmapTerritoryOwnerDto,
} from '@swuniverse/shared';
import { In, Repository } from 'typeorm';
import { AllianceMembership } from '../alliance/entities/alliance-membership.entity';
import { User } from '../auth/user.entity';
import { GameDataService } from '../game-data/game-data.service';
import { Spacecraft } from '../spacecraft/entities/spacecraft.entity';
import { TradeLicenseCondition } from '../trade/entities/trade-license-condition.entity';
import { TradePost } from '../trade/entities/trade-post.entity';
import { GalaxyField } from './entities/galaxy-field.entity';
import { InfluenceArea, InfluenceSourceType } from './entities/influence-area.entity';
import { MapRegion } from './entities/map-region.entity';
import { RegionDiscovery } from './entities/region-discovery.entity';
import { SpaceLocation } from './entities/space-location.entity';
import { SystemExploration } from './entities/system-exploration.entity';

const unique = (values: Array<number | null | undefined>) => [
  ...new Set(values.filter((value): value is number => value != null)),
];

/**
 * Loads the STU field-info details (territory, trade post, region, effects)
 * for the fields of one layer with one batched query per source.
 */
@Injectable()
export class GalaxyFieldDetailsQuery {
  constructor(
    @InjectRepository(InfluenceArea)
    private readonly influenceRepo: Repository<InfluenceArea>,
    @InjectRepository(Spacecraft)
    private readonly spacecraftRepo: Repository<Spacecraft>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(AllianceMembership)
    private readonly membershipRepo: Repository<AllianceMembership>,
    @InjectRepository(TradePost)
    private readonly tradePostRepo: Repository<TradePost>,
    @InjectRepository(TradeLicenseCondition)
    private readonly licenseConditionRepo: Repository<TradeLicenseCondition>,
    @InjectRepository(SpaceLocation)
    private readonly locationRepo: Repository<SpaceLocation>,
    @InjectRepository(MapRegion)
    private readonly regionRepo: Repository<MapRegion>,
    @InjectRepository(RegionDiscovery)
    private readonly regionDiscoveryRepo: Repository<RegionDiscovery>,
    @InjectRepository(SystemExploration)
    private readonly systemExplorationRepo: Repository<SystemExploration>,
    private readonly gameData: GameDataService,
  ) {}

  /** `fields` must all lie on `layerId`; region and system knowledge is the viewer's own. */
  async load(
    viewerId: number,
    layerId: number,
    fields: GalaxyField[],
  ): Promise<Map<number, StarmapGalaxyFieldDetailsDto>> {
    if (fields.length === 0) return new Map();
    const regionIds = unique(fields.map((field) => field.regionId));
    const systemIds = unique(fields.map((field) => field.starSystemId));
    const [owners, tradePosts, regions, knownSystemIds] = await Promise.all([
      this.loadTerritoryOwners(layerId),
      this.loadTradePosts(fields),
      this.loadKnownRegions(viewerId, regionIds),
      this.loadKnownSystemIds(viewerId, systemIds),
    ]);

    return new Map(
      fields.map((field) => [
        field.id,
        {
          territoryOwner: field.adminRegionKey
            ? null
            : owners.get(`${field.cx}:${field.cy}`) ?? null,
          tradePost: tradePosts.get(field.id) ?? null,
          region: (field.regionId && regions.get(field.regionId)) || null,
          effectTexts: knownFieldEffects([
            ...new Set([...(field.effects ?? []), ...(field.fieldType?.effects ?? [])]),
          ]).map((effect) => fieldEffectDefinition(effect).description),
          isImpassable: !(field.passableOverride ?? field.isPassable),
          databaseSystemId:
            field.starSystemId && knownSystemIds.has(field.starSystemId)
              ? field.starSystemId
              : null,
        },
      ]),
    );
  }

  /** STU `getTerritoryOwnerTitle`: the station owning the strongest station influence on the cell. */
  private async loadTerritoryOwners(
    layerId: number,
  ): Promise<Map<string, StarmapTerritoryOwnerDto>> {
    const areas = await this.influenceRepo.find({
      where: { layerId, sourceType: InfluenceSourceType.STATION },
      order: { strength: 'DESC', id: 'ASC' },
    });
    const stationByCell = new Map<string, number>();
    for (const area of areas) {
      const cell = `${area.cx}:${area.cy}`;
      if (!stationByCell.has(cell)) stationByCell.set(cell, area.sourceId);
    }
    const stationIds = unique([...stationByCell.values()]);
    const stations = stationIds.length
      ? await this.spacecraftRepo.find({
          where: { id: In(stationIds) },
          select: ['id', 'userId'],
        })
      : [];
    const userIds = unique(stations.map((station) => station.userId));
    const [users, memberships] = userIds.length
      ? await Promise.all([
          this.userRepo.find({ where: { id: In(userIds) }, select: ['id', 'username'] }),
          this.membershipRepo.find({ where: { userId: In(userIds) }, relations: ['alliance'] }),
        ])
      : [[], []];
    const userById = new Map(users.map((user) => [user.id, user]));
    const allianceByUser = new Map(
      memberships.map((membership) => [membership.userId, membership.alliance]),
    );
    const ownerByStation = new Map<number, StarmapTerritoryOwnerDto>();
    for (const station of stations) {
      const user = userById.get(station.userId);
      if (!user) continue;
      const alliance = allianceByUser.get(user.id);
      ownerByStation.set(station.id, {
        playerId: user.id,
        playerName: user.username,
        allianceId: alliance?.id ?? null,
        allianceName: alliance?.name ?? null,
      });
    }

    const owners = new Map<string, StarmapTerritoryOwnerDto>();
    for (const [cell, stationId] of stationByCell) {
      const owner = ownerByStation.get(stationId);
      if (owner) owners.set(cell, owner);
    }
    return owners;
  }

  /** Posts on a galaxy field, or inside a system on that system's galaxy field. Abandoned posts keep their name. */
  private async loadTradePosts(
    fields: GalaxyField[],
  ): Promise<Map<number, StarmapFieldTradePostDto>> {
    // shortcut: loads every post (a few dozen), filter by layer in SQL once posts number in the thousands.
    const posts = await this.tradePostRepo.find({ order: { id: 'ASC' } });
    if (posts.length === 0) return new Map();
    const [locations, conditions] = await Promise.all([
      this.locationRepo.find({
        where: { id: In(unique(posts.map((post) => post.locationId))) },
        relations: ['systemField'],
      }),
      this.licenseConditionRepo.find({
        where: { tradePostId: In(posts.map((post) => post.id)) },
      }),
    ]);
    const fieldIds = new Set(fields.map((field) => field.id));
    const fieldIdBySystem = new Map(
      fields.flatMap((field) =>
        field.starSystemId ? [[field.starSystemId, field.id] as const] : [],
      ),
    );
    const locationById = new Map(locations.map((location) => [location.id, location]));
    const conditionByPost = new Map(
      conditions.map((condition) => [condition.tradePostId, condition]),
    );

    const result = new Map<number, StarmapFieldTradePostDto>();
    for (const post of posts) {
      const location = locationById.get(post.locationId);
      const fieldId = location?.galaxyFieldId != null
        ? location.galaxyFieldId
        : location?.systemField
          ? fieldIdBySystem.get(location.systemField.starSystemId)
          : undefined;
      if (fieldId === undefined || !fieldIds.has(fieldId) || result.has(fieldId)) continue;
      const condition = conditionByPost.get(post.id);
      result.set(fieldId, {
        id: post.id,
        name: post.name,
        licenseCondition: condition
          ? {
              commodityId: condition.commodityId,
              commodityName:
                this.gameData.getCommodity(condition.commodityId)?.name ??
                `Ware #${condition.commodityId}`,
              amount: condition.amount,
              durationDays: condition.durationDays,
            }
          : null,
      });
    }
    return result;
  }

  private async loadKnownRegions(
    viewerId: number,
    regionIds: number[],
  ): Promise<Map<number, StarmapRegionInfoDto>> {
    if (regionIds.length === 0) return new Map();
    const discoveries = await this.regionDiscoveryRepo.find({
      where: { userId: viewerId, mapRegionId: In(regionIds) },
    });
    const known = unique(discoveries.map((discovery) => discovery.mapRegionId));
    const regions = known.length
      ? await this.regionRepo.find({ where: { id: In(known) } })
      : [];
    return new Map(
      regions.map((region) => [
        region.id,
        { id: region.id, name: region.name, description: region.description },
      ]),
    );
  }

  private async loadKnownSystemIds(viewerId: number, systemIds: number[]) {
    if (systemIds.length === 0) return new Set<number>();
    const explorations = await this.systemExplorationRepo.find({
      where: { userId: viewerId, starSystemId: In(systemIds) },
      select: ['starSystemId'],
    });
    return new Set(explorations.map((exploration) => exploration.starSystemId));
  }
}
