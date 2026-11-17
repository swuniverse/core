import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not, IsNull } from 'typeorm';
import { TradePost } from '../trade/entities/trade-post.entity';
import { TradePostActivityRanking } from './trade-post-activity.ranking';
import { tradeNetworkName } from '../trade/trade-network';
import { ExplorationState } from '../starmap/entities/exploration-state.entity';
import { SpaceLocation } from '../starmap/entities/space-location.entity';
import { FLIGHT_SIGNATURE_RETENTION_MS } from '../spacecraft/flight-signature.service';
import { FlightSignature } from '../spacecraft/entities/flight-signature.entity';
import { isVacationEffective, type ProfileFriendDto } from '@swuniverse/shared';
import { User } from '../auth/user.entity';
import { NON_NPC_USER_WHERE } from '../auth/non-npc-users';
import { Colony } from '../colony/entities/colony.entity';
import {
  Spacecraft,
  SpacecraftKind,
} from '../spacecraft/entities/spacecraft.entity';
import { Research, ResearchStatus } from '../research/entities/research.entity';
import { FactionService } from '../faction/faction.service';
import { GameDataService } from '../game-data/game-data.service';
import { GameGateway } from '../websocket/game.gateway';
import { SystemTypeDiscovery } from '../starmap/entities/system-type-discovery.entity';
import {
  SYSTEM_TYPE_BY_ID,
  SYSTEM_TYPE_DEFINITIONS,
} from '../starmap/starmap-system-types';
import { ShipClassDiscovery } from '../spacecraft/entities/ship-class-discovery.entity';
import { StationClassDiscovery } from '../spacecraft/entities/station-class-discovery.entity';
import { ShipClassDef } from '../spacecraft/entities/ship-class-def.entity';
import { PrestigeHistoryEntry } from '../prestige/entities/prestige-history-entry.entity';
import { CelestialClassDiscovery } from '../starmap/entities/celestial-class-discovery.entity';
import { CelestialObject } from '../starmap/entities/celestial-object.entity';
import {
  resolveSwuPlanetType,
  type SwuPlanetType,
} from '../starmap/generator/swu-planet-type';
import { CrewAssignment } from '../colony/entities/crew-assignment.entity';
import { AllianceService } from '../alliance/alliance.service';
import { ContactService } from '../contacts/contact.service';
import { Layer } from '../starmap/entities/layer.entity';
import { StarSystem } from '../starmap/entities/star-system.entity';
import { SystemExploration } from '../starmap/entities/system-exploration.entity';
import { SystemField } from '../starmap/entities/system-field.entity';
import {
  CartographyCompletionOutcome,
  CartographyPlan,
  CartographyPlanStatus,
} from '../spacecraft/entities/cartography-plan.entity';
import { ColonyStatsService } from '../colony/colony-stats.service';
import { ColonySocialService } from '../colony/colony-social.service';
import { ColonyScanProjectionService } from '../spacecraft/colony-scan-projection.service';
import { UserAward } from '../awards/entities/user-award.entity';
import { ProfileVisitorService } from '../profile-visitor/profile-visitor.service';
import { HolonetRating } from '../holonet/entities/holonet-rating.entity';
import { HolonetPost } from '../holonet/entities/holonet-post.entity';
import { RpgBehavior } from '@swuniverse/shared';
import { RpgPlotService } from '../rpg/rpg-plot.service';
import { UserSettingsReader } from '../settings/user-settings-reader';
import {
  AURODIUM_RANKING_SOURCES,
  type AurodiumRankingSource,
} from './aurodium-ranking-source';

const AURODIUM_COMMODITY_ID = 50;
const PROFILE_FRIEND_LIMIT = 50;

type TradePostProjection = TradePost & {
  owner?: User;
  location?: SpaceLocation;
};

type RankingKey =
  | 'discoveries'
  | 'research'
  | 'prestige'
  | 'crew-training'
  | 'flights'
  | 'rpg'
  | 'aurodium'
  | 'trade-posts'
  | 'colony-worth'
  | 'colony-production'
  | 'satisfied-workers';
type RankingEntry = {
  userId: number;
  username: string;
  score: number;
  colonyId?: number;
  colonyName?: string;
};
type RankingResult = {
  title: string;
  metricLabel: string;
  entries: RankingEntry[];
};

@Injectable()
export class DatabaseService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Colony)
    private readonly colonyRepo: Repository<Colony>,
    @InjectRepository(Spacecraft)
    private readonly shipRepo: Repository<Spacecraft>,
    @InjectRepository(Research)
    private readonly researchRepo: Repository<Research>,
    @InjectRepository(SystemTypeDiscovery)
    private readonly systemTypeDiscoveryRepo: Repository<SystemTypeDiscovery>,
    @InjectRepository(ShipClassDiscovery)
    private readonly shipClassDiscoveryRepo: Repository<ShipClassDiscovery>,
    @InjectRepository(ShipClassDef)
    private readonly shipClassRepo: Repository<ShipClassDef>,
    @InjectRepository(PrestigeHistoryEntry)
    private readonly prestigeHistoryRepo: Repository<PrestigeHistoryEntry>,
    @InjectRepository(CelestialClassDiscovery)
    private readonly celestialClassDiscoveryRepo: Repository<CelestialClassDiscovery>,
    @InjectRepository(CrewAssignment)
    private readonly crewAssignmentRepo: Repository<CrewAssignment>,
    private readonly factionService: FactionService,
    private readonly gameData: GameDataService,
    private readonly gameGateway: GameGateway,
    @InjectRepository(CelestialObject)
    private readonly celestialObjectRepo: Repository<CelestialObject>,
    private readonly allianceService: AllianceService,
    @InjectRepository(Layer)
    private readonly layerRepo: Repository<Layer>,
    @InjectRepository(StarSystem)
    private readonly systemRepo: Repository<StarSystem>,
    @InjectRepository(SystemExploration)
    private readonly systemExplorationRepo: Repository<SystemExploration>,
    @InjectRepository(SystemField)
    private readonly systemFieldRepo: Repository<SystemField>,
    @InjectRepository(CartographyPlan)
    private readonly cartographyPlanRepo: Repository<CartographyPlan>,
    @InjectRepository(UserAward)
    private readonly userAwardRepo: Repository<UserAward>,
    private readonly colonyScanProjection: ColonyScanProjectionService,
    @InjectRepository(FlightSignature)
    private readonly flightSignatureRepo: Repository<FlightSignature>,
    @InjectRepository(TradePost)
    private readonly tradePostRepo: Repository<TradePost>,
    @InjectRepository(ExplorationState)
    private readonly explorationRepo: Repository<ExplorationState>,
    @InjectRepository(StationClassDiscovery)
    private readonly stationClassDiscoveryRepo: Repository<StationClassDiscovery> =
      {} as Repository<StationClassDiscovery>,
    private readonly profileVisitorService: ProfileVisitorService =
      {} as ProfileVisitorService,
    @InjectRepository(HolonetRating)
    private readonly holonetRatingRepo: Repository<HolonetRating> =
      {} as Repository<HolonetRating>,
    @Inject(AURODIUM_RANKING_SOURCES)
    private readonly aurodiumRankingSources: AurodiumRankingSource[] = [],
    private readonly contacts: ContactService = {} as ContactService,
    private readonly settingsReader: UserSettingsReader = {} as UserSettingsReader,
    private readonly rpgPlotService: RpgPlotService = {} as RpgPlotService,
    private readonly tradePostActivity: TradePostActivityRanking = {} as TradePostActivityRanking,
    private readonly colonyStats: ColonyStatsService = {} as ColonyStatsService,
    private readonly colonySocial: ColonySocialService = {} as ColonySocialService,
  ) {}

  async getTradePosts(userId: number) {
    const [posts, explored] = await Promise.all([
      this.tradePostRepo
        .createQueryBuilder('post')
        .leftJoinAndMapOne('post.owner', User, 'owner', 'owner.id = post.ownerId')
        .leftJoinAndMapOne(
          'post.location',
          SpaceLocation,
          'location',
          'location.id = post.locationId',
        )
        .leftJoinAndSelect('location.galaxyField', 'galaxyField')
        .leftJoinAndSelect('galaxyField.layer', 'galaxyLayer')
        .leftJoinAndSelect('galaxyField.starSystem', 'galaxySystem')
        .leftJoinAndSelect('location.systemField', 'systemField')
        .leftJoinAndSelect('systemField.starSystem', 'system')
        .leftJoinAndSelect('system.layer', 'systemLayer')
        .orderBy('post.networkId', 'ASC')
        .addOrderBy('post.name', 'ASC')
        .addOrderBy('post.id', 'ASC')
        .getMany() as Promise<TradePostProjection[]>,
      this.explorationRepo.find({ where: { userId } }),
    ]);
    const exploredFields = new Set(
      explored.map((field) => `${field.layerId}:${field.cx}:${field.cy}`),
    );

    return posts
      .sort(
        (left, right) =>
          left.networkId - right.networkId ||
          left.name.localeCompare(right.name) ||
          left.id - right.id,
      )
      .map((post) => {
        const galaxyField = post.location?.galaxyField;
        const system = post.location?.systemField?.starSystem;
        const layerId = galaxyField?.layerId ?? system?.layerId;
        const x = galaxyField?.cx ?? system?.cx;
        const y = galaxyField?.cy ?? system?.cy;
        const isExplored =
          layerId != null &&
          x != null &&
          y != null &&
          exploredFields.has(`${layerId}:${x}:${y}`);
        return {
          id: post.id,
          name: post.name,
          description: post.description,
          networkId: post.networkId,
          networkName:
            tradeNetworkName(post.networkId, post.networkId === post.ownerId ? post.owner?.username : null),
          ownerName:
            post.owner?.username ??
            (post.ownerId == null ? 'Verlassen' : `Spieler #${post.ownerId}`),
          location: isExplored
            ? {
                layerId,
                layerName:
                  galaxyField?.layer?.name ?? system?.layer?.name ?? null,
                x,
                y,
                systemName:
                  system?.name ?? galaxyField?.starSystem?.name ?? null,
              }
            : null,
        };
      });
  }

  async getPlayerNames() {
    const users = await this.userRepo.find({ select: ['id', 'username', 'displayName', 'displayNameMarkup'], order: { id: 'ASC' } });
    return users.map(user => ({ id: user.id, username: user.username, displayName: user.displayName, displayNameMarkup: user.displayNameMarkup }));
  }

  async getOnlinePlayers() {
    const onlineUserIds = this.gameGateway.onlineUserIds;
    if (onlineUserIds.length === 0) return [];
    const users = await this.userRepo.find({
      where: { id: In(onlineUserIds), ...NON_NPC_USER_WHERE },
      select: ['id', 'username', 'faction', 'avatar'],
    });
    const visible = await this.settingsReader.getManyBoolean(users.map(u => u.id), 'show_online_status');
    return users.filter(u => visible.get(u.id)).map((u) => ({
      id: u.id,
      username: u.username,
      faction: u.faction,
      avatar: u.avatar,
    }));
  }

  async getOverview() {
    const [settlers, colonies, ships] = await Promise.all([
      this.userRepo.count({ where: { emailVerifiedAt: Not(IsNull()) } }),
      this.colonyRepo.count(),
      this.shipRepo.count(),
    ]);

    const totalTechs = Math.floor(this.gameData.getTechTree().length / 2);
    const shipClasses = this.gameData.getShipClassDefs().length;
    const planetTypes = this.gameData.getColonyClassCount();
    const buildingTypes = new Set(
      this.gameData.getAllBuildings().map((b) => b.name),
    ).size;

    return {
      settlers,
      colonies,
      ships,
      totalTechs,
      shipClasses,
      planetTypes,
      buildingTypes,
      sections: [
        {
          key: 'settlers',
          title: 'Siedler',
          description: 'Alle Commander, Fraktionen und Kolonie-Fortschritt.',
        },
        {
          key: 'rankings',
          title: 'Ranglisten',
          description: 'Top Forscher, Prestige und Kolonieaufbau.',
        },
      ],
    };
  }

  async getSettlers() {
    const [users, factions] = await Promise.all([
      this.userRepo.find({ where: NON_NPC_USER_WHERE, order: { username: 'ASC' } }),
      this.factionService.findAll(),
    ]);
    const factionById = new Map(
      factions.map((faction) => [faction.id, faction]),
    );

    return Promise.all(
      users.map((user) => this.toSettlerEntry(user, factionById)),
    );
  }

  async getNpcsAndAdmins() {
    const [users, factions] = await Promise.all([
      this.userRepo.find({
        where: [{ isNpc: true }, { isAdmin: true }],
        order: { username: 'ASC' },
      }),
      this.factionService.findAll(),
    ]);
    const factionById = new Map(
      factions.map((faction) => [faction.id, faction.name]),
    );
    const toEntry = (user: User) => ({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatar,
      faction: user.faction,
      factionName: user.factionId ? (factionById.get(user.factionId) ?? null) : null,
    });

    return {
      npcs: users.filter((user) => user.isNpc).map(toEntry),
      administrators: users.filter((user) => user.isAdmin).map(toEntry),
    };
  }

  async getSettler(viewerId: number, id: number) {
    const [user, factions] = await Promise.all([
      this.userRepo.findOne({ where: { id } }),
      this.factionService.findAll(),
    ]);

    if (!user) {
      throw new NotFoundException('Settler not found');
    }

    await this.profileVisitorService.registerVisit(viewerId, user.id);

    const factionById = new Map(
      factions.map((faction) => [faction.id, faction]),
    );

    const [entry, alliance, awards, colonyScans, friends, settings, plots] = await Promise.all([
      this.toSettlerEntry(user, factionById),
      this.allianceService.getRef(user.id),
      this.userAwardRepo.find({
        where: { userId: user.id },
        relations: ['award'],
        order: { firstGrantedAt: 'ASC' },
      }),
      viewerId === user.id
        ? Promise.resolve(undefined)
        : this.colonyScanProjection.newestAccessibleForColonies(
            viewerId,
            user.id,
          ),
      this.getProfileFriends(user.id),
      this.settingsReader.getSettings(user.id),
      this.getSettlerPlots(user.id),
    ]);
    const scansWithSystemContext =
      colonyScans === undefined
        ? undefined
        : await this.withDiscoveredSystemContext(viewerId, colonyScans);
    return {
      ...entry,
      rpgBehavior: Number(settings.rpg_behavior ?? RpgBehavior.NOT_SET),
      plots,
      alliance,
      friends,
      awards: awards.map(({ award, count }) => ({
        key: award.key,
        description: award.description,
        image: award.image,
        count,
      })),
      ...(scansWithSystemContext === undefined
        ? {}
        : { colonyScans: scansWithSystemContext }),
    };
  }

  private async getSettlerPlots(userId: number) {
    return this.rpgPlotService.membershipsForUser(userId);
  }

  private async getProfileFriends(userId: number): Promise<ProfileFriendDto[]> {
    const [members, contacts] = await Promise.all([
      this.allianceService.getMemberIds(userId),
      this.contacts.incomingFriendIds(userId, PROFILE_FRIEND_LIMIT + 1),
    ]);
    const ids = [...new Set([...members, ...contacts])]
      .filter((id) => id !== userId)
      .sort((a, b) => a - b)
      .slice(0, PROFILE_FRIEND_LIMIT);
    if (ids.length === 0) return [];
    const users = await this.userRepo.find({
      where: { id: In(ids) },
      select: ['id', 'username', 'displayName', 'avatar'],
      order: { id: 'ASC' },
    });
    return users
      .sort((a, b) => a.id - b.id)
      .map(({ id, username, displayName, avatar }) => ({
        id,
        name: displayName || username,
        avatar,
      }));
  }

  private async withDiscoveredSystemContext<
    T extends { systemId: number | null },
  >(
    viewerId: number,
    scans: T[],
  ): Promise<
    Array<
      Omit<T, 'systemId'> & {
        system: { id: number | null; discovered: boolean; name: string | null };
      }
    >
  > {
    const systemIds = [
      ...new Set(
        scans
          .map((scan) => scan.systemId)
          .filter((id): id is number => id != null),
      ),
    ];
    const discoveries = systemIds.length
      ? await this.systemExplorationRepo.find({
          where: { userId: viewerId, starSystemId: In(systemIds) },
        })
      : [];
    const discoveredSystemIds = discoveries.map(
      (discovery) => discovery.starSystemId,
    );
    const systems = discoveredSystemIds.length
      ? await this.systemRepo.find({
          where: { id: In(discoveredSystemIds) },
          select: ['id', 'name'],
        })
      : [];
    const systemNameById = new Map(
      systems.map((system) => [system.id, system.name]),
    );
    return scans.map(({ systemId, ...scan }) => {
      const name = systemId == null ? undefined : systemNameById.get(systemId);
      return {
        ...scan,
        system: {
          id: name === undefined ? null : systemId,
          discovered: name !== undefined,
          name: name ?? null,
        },
      };
    });
  }

  private async toSettlerEntry(
    user: User,
    factionById: Map<number, { name: string }>,
  ) {
    const [colonies, ships, completedResearch] = await Promise.all([
      this.colonyRepo.count({ where: { userId: user.id } }),
      this.shipRepo.count({ where: { userId: user.id } }),
      this.researchRepo.count({
        where: { userId: user.id, status: ResearchStatus.COMPLETED },
      }),
    ]);

    const faction = user.factionId ? factionById.get(user.factionId) : null;
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatar,
      description: user.description,
      faction: user.faction,
      factionName: faction?.name ?? user.faction ?? 'Unbekannt',
      prestige: user.prestige,
      colonies,
      ships,
      completedResearch,
      onboardingCompleted: user.onboardingCompleted,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
      onVacation: isVacationEffective(user),
    };
  }

  async getSystemTypes(userId: number, layerIds?: number[]) {
    const discoveries = await this.systemTypeDiscoveryRepo.find({
      where: { userId },
    });
    const discoveredByType = new Map(
      discoveries.map((entry) => [entry.systemTypeId, entry]),
    );
    const systems = layerIds ? await this.systemRepo.find({ where: { layerId: In(layerIds) } }) : null;
    const definitions = SYSTEM_TYPE_DEFINITIONS.filter((definition) => !systems || systems.some((system) => system.systemTypeId === definition.id));
    return {
      discovered: definitions.filter((definition) => discoveredByType.has(definition.id)).length,
      total: definitions.length,
      entries: definitions.map((definition) => {
        const discovery = discoveredByType.get(definition.id);
        return discovery
          ? {
              systemTypeId: definition.id,
              discovered: true,
              name: definition.name,
              rarity: definition.rarity,
              discoveredAt: discovery.discoveredAt.toISOString(),
            }
          : {
              systemTypeId: definition.id,
              discovered: false,
              name: null,
              rarity: null,
              discoveredAt: null,
            };
      }),
    };
  }

  async getSystems(userId: number, layerIds?: number[]) {
    const [layers, systems, discoveries] = await Promise.all([
      this.layerRepo.find({
        where: { isHidden: false, ...(layerIds ? { id: In(layerIds) } : {}) },
        order: { id: 'ASC' },
      }),
      // Only the explicitly maintained catalog counts (tmw-D5c).
      this.systemRepo.find({
        where: { inDatabaseCatalog: true, ...(layerIds ? { layerId: In(layerIds) } : {}) },
        order: { layerId: 'ASC', cx: 'ASC', cy: 'ASC', id: 'ASC' },
      }),
      this.systemExplorationRepo.find({ where: { userId } }),
    ]);
    const discoveredBySystemId = new Map(
      discoveries.map((discovery) => [discovery.starSystemId, discovery]),
    );
    const visibleLayerIds = new Set(layers.map((layer) => layer.id));
    const systemsByLayer = new Map<number, StarSystem[]>();
    for (const system of systems
      .filter((system) => visibleLayerIds.has(system.layerId))
      .sort(
        (left, right) =>
          left.layerId - right.layerId ||
          left.cx - right.cx ||
          left.cy - right.cy ||
          left.id - right.id,
      )) {
      const entries = systemsByLayer.get(system.layerId) ?? [];
      entries.push(system);
      systemsByLayer.set(system.layerId, entries);
    }

    return {
      layers: layers.map((layer) => ({
        id: layer.id,
        name: layer.name,
        entries: (systemsByLayer.get(layer.id) ?? []).map((system) => {
          const discovery = discoveredBySystemId.get(system.id);
          if (!discovery) return { discovered: false, name: '???' };
          return {
            discovered: true,
            systemId: system.id,
            name: system.name,
            cx: system.cx,
            cy: system.cy,
            systemTypeName:
              SYSTEM_TYPE_BY_ID[system.systemTypeId]?.name ??
              `Typ ${system.systemTypeId}`,
            discoveredAt: discovery.discoveredAt.toISOString(),
          };
        }),
      })),
    };
  }

  async getSystemDetail(userId: number, systemId: number) {
    const [system, discovery] = await Promise.all([
      this.systemRepo.findOneBy({ id: systemId }),
      this.systemExplorationRepo.findOne({
        where: { userId, starSystemId: systemId },
      }),
    ]);
    if (!system || !discovery)
      throw new NotFoundException('System nicht gefunden');

    const plan = await this.cartographyPlanRepo.findOne({
      where: { userId, starSystemId: systemId },
    });
    if (
      plan?.status !== CartographyPlanStatus.DONE ||
      plan.completionOutcome !== CartographyCompletionOutcome.SUCCESS
    ) {
      return { availability: 'ASTROMETRY_REQUIRED' as const };
    }

    const [fields, colonies, scans] = await Promise.all([
      this.systemFieldRepo.find({
        where: { starSystemId: systemId },
        relations: ['fieldType', 'celestialObject'],
        order: { sy: 'ASC', sx: 'ASC' },
      }),
      this.colonyRepo.find({
        where: { starSystemId: systemId },
        relations: ['user'],
        order: { id: 'ASC' },
      }),
      this.colonyScanProjection.newestAccessibleForSystem(userId, systemId),
    ]);
    const hasOwnCurrentColony = colonies.some(
      (colony) => colony.userId === userId && !colony.isAbandoned,
    );

    return {
      availability: 'AVAILABLE' as const,
      id: system.id,
      name: system.name,
      layerId: system.layerId,
      cx: system.cx,
      cy: system.cy,
      systemTypeId: system.systemTypeId,
      systemTypeName:
        SYSTEM_TYPE_BY_ID[system.systemTypeId]?.name ??
        `Typ ${system.systemTypeId}`,
      maxX: system.maxX,
      maxY: system.maxY,
      fields: fields.map((field) => ({
        id: field.id,
        sx: field.sx,
        sy: field.sy,
        fieldType: {
          id: field.fieldType.id,
          key: field.fieldType.key,
          name: field.fieldType.name,
        },
        celestialObject: field.celestialObject
          ? {
              id: field.celestialObject.id,
              objectType: field.celestialObject.objectType,
              name: field.celestialObject.name,
              description: field.celestialObject.description,
              posX: field.celestialObject.posX,
              posY: field.celestialObject.posY,
              classId: field.celestialObject.classId,
              isColonizable: field.celestialObject.isColonizable,
            }
          : null,
      })),
      colonies: colonies.map((colony) => {
        const isOwn = colony.userId === userId && !colony.isAbandoned;
        const owner =
          colony.userId != null && !colony.isAbandoned && colony.user
            ? { id: colony.user.id, username: colony.user.username }
            : null;
        return {
          id: colony.id,
          name: colony.name,
          owner: isOwn ? null : owner,
          isOwn,
          isAbandoned: colony.isAbandoned,
          posX: colony.posX,
          posY: colony.posY,
          celestialObjectId: colony.celestialObjectId,
          canMessageOwner: hasOwnCurrentColony && owner != null && !isOwn,
        };
      }),
      scans,
    };
  }

  async getShipClasses(userId: number) {
    const [definitions, discoveries] = await Promise.all([
      this.shipClassRepo.find({
        where: NON_NPC_USER_WHERE,
        order: { id: 'ASC' },
      }),
      this.shipClassDiscoveryRepo.find({ where: { userId } }),
    ]);
    const discoveredByClass = new Map(
      discoveries.map((entry) => [entry.shipClassId, entry]),
    );
    return {
      discovered: discoveries.length,
      total: definitions.length,
      entries: definitions.map((definition) => {
        const discovery = discoveredByClass.get(definition.id);
        return discovery
          ? {
              key: definition.key,
              discovered: true,
              name: definition.name,
              discoveredAt: discovery.discoveredAt.toISOString(),
            }
          : {
              key: definition.key,
              discovered: false,
              name: null,
              discoveredAt: null,
            };
      }),
    };
  }

  async getShipClassDetail(userId: number, key: string) {
    const definition = await this.shipClassRepo.findOne({
      where: { key, isNpc: false },
    });
    if (
      !definition ||
      !(await this.shipClassDiscoveryRepo.exists({
        where: { userId, shipClassId: definition.id },
      }))
    ) {
      throw new NotFoundException('Schiffsrumpf nicht katalogisiert');
    }
    return definition;
  }

  async getStationClasses(userId: number) {
    const stationClassIds = await this.shipRepo
      .createQueryBuilder('station')
      .select('DISTINCT station.shipClassId', 'shipClassId')
      .where('station.kind = :kind', { kind: SpacecraftKind.STATION })
      .getRawMany<{ shipClassId: number }>();
    const ids = stationClassIds.map(({ shipClassId }) => shipClassId);
    const [definitions, discoveries] = await Promise.all([
      ids.length
        ? this.shipClassRepo.find({
            where: { id: In(ids), isNpc: false },
            order: { id: 'ASC' },
          })
        : Promise.resolve([]),
      this.stationClassDiscoveryRepo.find({ where: { userId } }),
    ]);
    const discoveredByClass = new Map(
      discoveries.map((entry) => [entry.shipClassId, entry]),
    );
    return {
      discovered: definitions.filter((definition) =>
        discoveredByClass.has(definition.id),
      ).length,
      total: definitions.length,
      entries: definitions.map((definition) => {
        const discovery = discoveredByClass.get(definition.id);
        return discovery
          ? {
              key: definition.key,
              discovered: true,
              name: definition.name,
              discoveredAt: discovery.discoveredAt.toISOString(),
            }
          : {
              key: definition.key,
              discovered: false,
              name: null,
              discoveredAt: null,
            };
      }),
    };
  }

  async getStationClassDetail(userId: number, key: string) {
    const definition = await this.shipClassRepo.findOne({
      where: { key, isNpc: false },
    });
    if (!definition) {
      throw new NotFoundException('Stationsrumpf nicht katalogisiert');
    }
    const [isStationClass, isDiscovered] = await Promise.all([
      this.shipRepo.exists({
        where: { shipClassId: definition.id, kind: SpacecraftKind.STATION },
      }),
      this.stationClassDiscoveryRepo.exists({
        where: { userId, shipClassId: definition.id },
      }),
    ]);
    if (!isStationClass || !isDiscovered) {
      throw new NotFoundException('Stationsrumpf nicht katalogisiert');
    }
    return definition;
  }

  getModules() {
    return this.gameData.getAllModules().map((module) => ({
      name: module.name,
      category: module.category,
      description: module.description,
      maxLevel: module.maxLevel,
    }));
  }

  getCommodities() {
    return this.gameData.getAllCommodities().map((commodity) => ({
      id: commodity.id,
      name: commodity.name,
      nameShort: commodity.nameShort,
      description: commodity.description,
      isTradeOnly: commodity.isTradeOnly,
      density: commodity.density,
    }));
  }

  async getPlanetTypes(userId: number, layerIds?: number[]) {
    const discoveries = await this.celestialClassDiscoveryRepo.find({
      where: { userId },
    });
    const discoveredByKey = new Map(
      discoveries.map((entry) => [entry.swuTypeKey, entry]),
    );
    // Nur Typen, die im Spiel tatsaechlich vorkommen. Ein Typ ist SWU-Archetyp
    // + Rotation + Ring/Mond (Schild zaehlt nicht). STU-Objekte zaehlen nur
    // ueber ihre SWU-Zuordnung (Fallback).
    const query = this.celestialObjectRepo.createQueryBuilder('object');
    if (layerIds) {
      query.innerJoin('object.starSystem', 'system')
        .andWhere(layerIds.length ? 'system.layerId IN (:...layerIds)' : '1 = 0', { layerIds });
    }
    const rows = await query
      .select('object."classId"', 'classId')
      .addSelect('object."objectType"', 'objectType')
      .addSelect('object."swuRotation"', 'swuRotation')
      .addSelect('object."swuRing"', 'swuRing')
      .addSelect(`substring(object.name from ' \\[P\\d+[GR][RMB]\\]$')`, 'code')
      .andWhere('object."classId" IS NOT NULL')
      .groupBy('object."classId"')
      .addGroupBy('object."objectType"')
      .addGroupBy('object."swuRotation"')
      .addGroupBy('object."swuRing"')
      .addGroupBy('code')
      .getRawMany<{
        classId: number;
        objectType: number;
        swuRotation: 'rotating' | 'tidal-locked' | null;
        swuRing: boolean;
        code: string | null;
      }>();
    const types = new Map<string, SwuPlanetType>();
    for (const row of rows) {
      const type = resolveSwuPlanetType({
        classId: Number(row.classId),
        objectType: Number(row.objectType),
        name: row.code,
        swuRotation: row.swuRotation,
        swuRing: row.swuRing,
      });
      if (type) types.set(type.key, type);
    }
    const definitions = [...types.values()].sort(
      (a, b) =>
        a.classId - b.classId ||
        a.rotation.localeCompare(b.rotation) ||
        a.bodyFeature.localeCompare(b.bodyFeature),
    );
    const objectTypeLabel = (type: SwuPlanetType) =>
      type.bodyFeature === 'moon' ? 'Mond' : 'Planet';
    return {
      discovered: definitions.filter((d) => discoveredByKey.has(d.key)).length,
      total: definitions.length,
      entries: definitions.map((definition) => {
        const discovery = discoveredByKey.get(definition.key);
        return discovery
          ? {
              key: definition.key,
              classId: definition.classId,
              discovered: true,
              name: definition.name,
              description: definition.description,
              objectType: objectTypeLabel(definition),
              objectTypeId: definition.objectType,
              imageName: definition.imageName,
              discoveredAt: discovery.discoveredAt.toISOString(),
            }
          : {
              key: definition.key,
              classId: definition.classId,
              discovered: false,
              name: null,
              description: null,
              objectType: null,
              objectTypeId: definition.objectType,
              imageName: definition.imageName,
              discoveredAt: null,
            };
      }),
    };
  }

  async getPrestigeHistory(userId: number, limit = 50) {
    const user = await this.userRepo.findOneByOrFail({ id: userId });
    const entries = await this.prestigeHistoryRepo.find({
      where: { userId },
      order: { createdAt: 'DESC', id: 'DESC' },
      take: Math.min(Math.max(limit, 1), 200),
    });
    return { prestige: user.prestige, entries };
  }

  async getRanking(userId: number, key: RankingKey, now = new Date()) {
    if (key === 'flights') {
      const entries = await this.getFlightRanking(false, now);
      return {
        title: 'Die Top 10 der Vielflieger',
        metricLabel: 'Geflogene Felder',
        anonymous: true,
        entries: entries.slice(0, 10).map(({ faction, score, shipCount }, index) => ({
          rank: index + 1,
          faction,
          score,
          shipCount,
        })),
        currentUser: null,
      };
    }
    if (key === 'trade-posts') {
      const posts = await this.tradePostActivity.top(now);
      return {
        title: 'Die 10 aktivsten Handelsposten',
        metricLabel: 'Transaktionen (7 Tage)',
        kind: 'trade-posts' as const,
        entries: posts.map(({ tradePostId, postName, networkId, score }, index) => ({
          rank: index + 1,
          tradePostId,
          postName,
          networkName: tradeNetworkName(networkId),
          score,
        })),
        currentUser: null,
      };
    }
    const ranking = await this.rankingFor(key, false);
    const rankedEntries = ranking.entries.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
    const own = rankedEntries.find((entry) => entry.userId === userId) ?? null;
    return {
      ...ranking,
      entries: rankedEntries.slice(0, 10),
      currentUser: own,
    };
  }

  private async rankingFor(
    key: RankingKey,
    topOnly = true,
  ): Promise<RankingResult> {
    switch (key) {
      case 'discoveries':
        return {
          title: 'Die 10 besten Entdecker',
          metricLabel: 'Entdeckungen',
          entries: await this.getDiscoveryRanking(topOnly),
        };
      case 'research':
        return {
          title: 'Die 10 besten Forscher',
          metricLabel: 'Abgeschlossene Forschungen',
          entries: await this.getResearchRanking(topOnly),
        };
      case 'prestige':
        return {
          title: 'Höchstes Prestige',
          metricLabel: 'Prestige',
          entries: await this.getPrestigeRanking(topOnly),
        };
      case 'crew-training':
        return {
          title: 'Die 10 besten Ausbilder',
          metricLabel: 'Crew auf Schiffen',
          entries: await this.getCrewTrainingRanking(topOnly),
        };
      case 'flights':
      case 'trade-posts':
        throw new Error('Anonymous rankings use getRanking directly');
      case 'rpg':
        return {
          title: 'Die 10 bestbewerteten RPG-Schreiber',
          metricLabel: 'Positive Bewertungen',
          entries: await this.getRpgRanking(),
        };
      case 'aurodium':
        return {
          title: 'Die 10 Günstlinge der Hutten',
          metricLabel: 'Aurodium',
          entries: await this.getAurodiumRanking(),
        };
      case 'colony-worth':
        return {
          title: 'Die Top 10 der Architekten',
          metricLabel: 'Fertige Gebäude',
          entries: await this.getColonyWorthRanking(topOnly),
        };
      case 'satisfied-workers':
        return {
          title: 'Die Top 10 der besten Arbeitgeber',
          metricLabel: 'Zufriedene Arbeiter',
          entries: await this.getSatisfiedWorkerRanking(topOnly),
        };
      case 'colony-production':
        return {
          title: 'Die Top 10 der Produzenten',
          metricLabel: 'Aktive Produktionsanlagen',
          entries: await this.getColonyProductionWorthRanking(topOnly),
        };
    }
  }

  private async getRpgRanking() {
    const rows = await this.holonetRatingRepo
      .createQueryBuilder('rating')
      .innerJoin(HolonetPost, 'post', 'post.id = rating.postId')
      .innerJoin(User, 'author', 'author.id = post.authorId')
      .select('author.id', 'userId')
      .addSelect('author.username', 'username')
      .addSelect('SUM(rating.value)', 'score')
      .where('rating.value > 0')
      .andWhere('post.deletedAt IS NULL')
      .andWhere('author.isNpc = false')
      .groupBy('author.id')
      .addGroupBy('author.username')
      .orderBy('SUM(rating.value)', 'DESC')
      .addOrderBy('author.username', 'ASC')
      .getRawMany();
    return rows.map((row) => ({ ...row, score: Number(row.score) }));
  }

  private async getAurodiumRanking() {
    const totals = new Map<number, RankingEntry>();
    for (const source of this.aurodiumRankingSources) {
      for (const entry of await source.totals(AURODIUM_COMMODITY_ID)) {
        const existing = totals.get(entry.userId);
        totals.set(entry.userId, {
          userId: entry.userId,
          username: entry.username,
          score: (existing?.score ?? 0) + Number(entry.amount),
        });
      }
    }
    return [...totals.values()].sort(
      (left, right) =>
        right.score - left.score || left.username.localeCompare(right.username),
    );
  }

  private async getDiscoveryRanking(topOnly = true) {
    const users = await this.userRepo.find({
      select: { id: true, username: true },
      where: NON_NPC_USER_WHERE,
      order: { username: 'ASC' },
    });
    const [systems, ships, planets] = await Promise.all([
      this.systemTypeDiscoveryRepo.find(),
      this.shipClassDiscoveryRepo.find(),
      this.celestialClassDiscoveryRepo.find(),
    ]);
    const scores = new Map<number, number>();
    for (const entry of [...systems, ...ships, ...planets]) {
      scores.set(entry.userId, (scores.get(entry.userId) ?? 0) + 1);
    }
    return users
      .map((user) => ({
        userId: user.id,
        username: user.username,
        score: scores.get(user.id) ?? 0,
      }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.username.localeCompare(b.username))
      .slice(0, topOnly ? 10 : undefined);
  }

  async getFlightRankingForRewards(now = new Date()) {
    return this.getFlightRanking(true, now);
  }

  private async getFlightRanking(topOnly: boolean, now: Date) {
    const query = this.flightSignatureRepo
      .createQueryBuilder('signature')
      .innerJoin(User, 'user', 'user.id = signature.userId')
      .select('user.id', 'userId')
      .addSelect('user.faction', 'faction')
      .addSelect('COUNT(signature.id)', 'score')
      .addSelect('COUNT(DISTINCT signature.spacecraftId)', 'shipCount')
      .where('signature.toDirection IS NOT NULL')
      .andWhere('signature.createdAt > :visibleSince')
      .andWhere('user.isNpc = false')
      .groupBy('user.id')
      .addGroupBy('user.faction')
      .orderBy('COUNT(signature.id)', 'DESC')
      .addOrderBy('user.id', 'ASC')
      .setParameters({
        visibleSince: new Date(now.getTime() - FLIGHT_SIGNATURE_RETENTION_MS),
      });
    const rows = await (topOnly ? query.limit(10) : query).getRawMany<{
      userId: string | number;
      faction: string | null;
      score: string | number;
      shipCount: string | number;
    }>();
    return rows.map((row) => ({
      userId: Number(row.userId),
      faction: row.faction,
      score: Number(row.score),
      shipCount: Number(row.shipCount),
    }));
  }

  private async getCrewTrainingRanking(topOnly = true) {
    const query = this.crewAssignmentRepo
      .createQueryBuilder('assignment')
      .innerJoin(User, 'user', 'user.id = assignment.userId')
      .select('user.id', 'userId')
      .addSelect('user.username', 'username')
      .addSelect('COUNT(assignment.crewId)', 'score')
      .where('assignment.spacecraftId IS NOT NULL')
      .groupBy('user.id')
      .addGroupBy('user.username')
      .orderBy('COUNT(assignment.crewId)', 'DESC')
      .addOrderBy('user.username', 'ASC');
    return topOnly ? query.limit(10).getRawMany() : query.getRawMany();
  }

  async getRankings() {
    const [
      research,
      prestige,
      colonies,
      colonyWorth,
      colonyProductionWorth,
      satisfiedWorkers,
    ] = await Promise.all([
      this.getResearchRanking(),
      this.getPrestigeRanking(),
      this.getColonyRanking(),
      this.getColonyWorthRanking(),
      this.getColonyProductionWorthRanking(),
      this.getSatisfiedWorkerRanking(),
    ]);

    return {
      research,
      prestige,
      colonies,
      colonyWorth,
      colonyProductionWorth,
      satisfiedWorkers,
    };
  }

  private async getResearchRanking(topOnly = true) {
    const query = this.researchRepo
      .createQueryBuilder('research')
      .innerJoin(User, 'user', 'user.id = research.userId')
      .select('user.id', 'userId')
      .addSelect('user.username', 'username')
      .addSelect('COUNT(research.id)', 'score')
      .where('research.status = :status', { status: ResearchStatus.COMPLETED })
      .andWhere('user.isNpc = false')
      .groupBy('user.id')
      .addGroupBy('user.username')
      .orderBy('COUNT(research.id)', 'DESC')
      .addOrderBy('user.username', 'ASC');
    return topOnly ? query.limit(10).getRawMany() : query.getRawMany();
  }

  private async getPrestigeRanking(topOnly = true) {
    const users = await this.userRepo.find({
      where: NON_NPC_USER_WHERE,
      order: { prestige: 'DESC', username: 'ASC' },
      ...(topOnly ? { take: 10 } : {}),
    });

    return users.map((user) => ({
      userId: user.id,
      username: user.username,
      score: user.prestige,
    }));
  }

  private async getColonyRanking() {
    return this.colonyRepo
      .createQueryBuilder('colony')
      .innerJoin(User, 'user', 'user.id = colony.userId')
      .andWhere('user.isNpc = false')
      .select('user.id', 'userId')
      .addSelect('user.username', 'username')
      .addSelect('COUNT(colony.id)', 'score')
      .groupBy('user.id')
      .addGroupBy('user.username')
      .orderBy('COUNT(colony.id)', 'DESC')
      .addOrderBy('user.username', 'ASC')
      .limit(10)
      .getRawMany();
  }

  private async getColonyWorthRanking(topOnly = true) {
    const query = this.colonyRepo
      .createQueryBuilder('colony')
      .innerJoin(User, 'user', 'user.id = colony.userId')
      .andWhere('user.isNpc = false')
      .leftJoin('colony.fields', 'field')
      .select('colony.id', 'colonyId')
      .addSelect('colony.name', 'colonyName')
      .addSelect('user.id', 'userId')
      .addSelect('user.username', 'username')
      .addSelect(
        `SUM(CASE WHEN field.buildingId IS NOT NULL AND field.isBuilding = false THEN 1 ELSE 0 END)`,
        'score',
      )
      .groupBy('colony.id')
      .addGroupBy('colony.name')
      .addGroupBy('user.id')
      .addGroupBy('user.username')
      .orderBy('score', 'DESC')
      .addOrderBy('colony.name', 'ASC');
    return topOnly ? query.limit(10).getRawMany() : query.getRawMany();
  }

  private async getSatisfiedWorkerRanking(
    topOnly = true,
  ): Promise<RankingEntry[]> {
    const colonies = await this.colonyRepo.find({
      where: { isAbandoned: false, user: { isNpc: false } },
      relations: ['user', 'stats', 'fields'],
    });
    const totals = new Map<number, RankingEntry>();
    for (const colony of colonies) {
      if (colony.userId == null || !colony.user) continue;
      const summary = this.colonyStats.calculateSummary(colony);
      const score = this.colonySocial.getSatisfiedWorkerCount(colony, summary);
      const previous = totals.get(colony.userId);
      totals.set(colony.userId, {
        userId: colony.userId,
        username: colony.user.username,
        score: (previous?.score ?? 0) + score,
      });
    }
    return [...totals.values()]
      .sort(
        (left, right) =>
          right.score - left.score ||
          left.username.localeCompare(right.username) ||
          left.userId - right.userId,
      )
      .slice(0, topOnly ? 10 : undefined);
  }

  private async getColonyProductionWorthRanking(topOnly = true) {
    const query = this.colonyRepo
      .createQueryBuilder('colony')
      .innerJoin(User, 'user', 'user.id = colony.userId')
      .andWhere('user.isNpc = false')
      .leftJoin('colony.fields', 'field')
      .select('colony.id', 'colonyId')
      .addSelect('colony.name', 'colonyName')
      .addSelect('user.id', 'userId')
      .addSelect('user.username', 'username')
      .addSelect(
        `SUM(CASE WHEN field.buildingId IS NOT NULL AND field.isBuilding = false AND field.isActive = true THEN 1 ELSE 0 END)`,
        'score',
      )
      .groupBy('colony.id')
      .addGroupBy('colony.name')
      .addGroupBy('user.id')
      .addGroupBy('user.username')
      .orderBy('score', 'DESC')
      .addOrderBy('colony.name', 'ASC');
    return topOnly ? query.limit(10).getRawMany() : query.getRawMany();
  }
}
