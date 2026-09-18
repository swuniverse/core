import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User } from '../auth/user.entity';
import { Colony } from '../colony/entities/colony.entity';
import { Spacecraft } from '../spacecraft/entities/spacecraft.entity';
import { Research, ResearchStatus } from '../research/entities/research.entity';
import { FactionService } from '../faction/faction.service';
import { GameDataService } from '../game-data/game-data.service';
import { GameGateway } from '../websocket/game.gateway';
import { SystemTypeDiscovery } from '../starmap/entities/system-type-discovery.entity';
import { SYSTEM_TYPE_DEFINITIONS } from '../starmap/starmap-system-types';
import { ShipClassDiscovery } from '../spacecraft/entities/ship-class-discovery.entity';
import { ShipClassDef } from '../spacecraft/entities/ship-class-def.entity';
import { PrestigeHistoryEntry } from '../prestige/entities/prestige-history-entry.entity';
import { CelestialClassDiscovery } from '../starmap/entities/celestial-class-discovery.entity';
import { STU_CELESTIAL_CLASSES } from '@swuniverse/shared';
import { CrewAssignment } from '../colony/entities/crew-assignment.entity';

type RankingKey =
  | 'discoveries'
  | 'research'
  | 'prestige'
  | 'crew-training'
  | 'colony-worth'
  | 'colony-production';
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
  ) {}

  async getOnlinePlayers() {
    const onlineUserIds = this.gameGateway.onlineUserIds;
    if (onlineUserIds.length === 0) return [];
    const users = await this.userRepo.find({
      where: { id: In(onlineUserIds) },
      select: ['id', 'username', 'faction', 'avatar'],
    });
    return users.map((u) => ({
      id: u.id,
      username: u.username,
      faction: u.faction,
      avatar: u.avatar,
    }));
  }

  async getOverview() {
    const [settlers, colonies, ships] = await Promise.all([
      this.userRepo.count(),
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
      this.userRepo.find({ order: { username: 'ASC' } }),
      this.factionService.findAll(),
    ]);
    const factionById = new Map(
      factions.map((faction) => [faction.id, faction]),
    );

    return Promise.all(
      users.map((user) => this.toSettlerEntry(user, factionById)),
    );
  }

  async getSettler(id: number) {
    const [user, factions] = await Promise.all([
      this.userRepo.findOne({ where: { id } }),
      this.factionService.findAll(),
    ]);

    if (!user) {
      throw new NotFoundException('Settler not found');
    }

    const factionById = new Map(
      factions.map((faction) => [faction.id, faction]),
    );

    return this.toSettlerEntry(user, factionById);
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
    };
  }

  async getSystemTypes(userId: number) {
    const discoveries = await this.systemTypeDiscoveryRepo.find({
      where: { userId },
    });
    const discoveredByType = new Map(
      discoveries.map((entry) => [entry.systemTypeId, entry]),
    );
    return {
      discovered: discoveries.length,
      total: SYSTEM_TYPE_DEFINITIONS.length,
      entries: SYSTEM_TYPE_DEFINITIONS.map((definition) => {
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

  async getShipClasses(userId: number) {
    const [definitions, discoveries] = await Promise.all([
      this.shipClassRepo.find({
        where: { isNpc: false },
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

  async getPlanetTypes(userId: number) {
    const discoveries = await this.celestialClassDiscoveryRepo.find({
      where: { userId },
    });
    const discoveredByClass = new Map(
      discoveries.map((entry) => [entry.classId, entry]),
    );
    const definitions = STU_CELESTIAL_CLASSES.filter(
      (definition) => definition.colonization !== 'UNUSED',
    );
    return {
      discovered: discoveries.length,
      total: definitions.length,
      entries: definitions.map((definition) => {
        const discovery = discoveredByClass.get(definition.id);
        return discovery
          ? {
              classId: definition.id,
              discovered: true,
              name: definition.name,
              description: definition.description,
              objectType:
                definition.celestialObjectType === 1
                  ? 'Planet'
                  : definition.celestialObjectType === 2
                    ? 'Mond'
                    : 'Asteroidenfeld',
              discoveredAt: discovery.discoveredAt.toISOString(),
            }
          : {
              classId: definition.id,
              discovered: false,
              name: null,
              description: null,
              objectType: null,
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

  async getRanking(userId: number, key: RankingKey) {
    const ranking = await this.rankingFor(key, false);
    const rankedEntries = ranking.entries.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
    const own = rankedEntries.find((entry) => entry.userId === userId) ?? null;
    return { ...ranking, entries: rankedEntries.slice(0, 10), currentUser: own };
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
      case 'colony-worth':
        return {
          title: 'Die Top 10 der Architekten',
          metricLabel: 'Fertige Gebäude',
          entries: await this.getColonyWorthRanking(topOnly),
        };
      case 'colony-production':
        return {
          title: 'Die Top 10 der Produzenten',
          metricLabel: 'Aktive Produktionsanlagen',
          entries: await this.getColonyProductionWorthRanking(topOnly),
        };
    }
  }

  private async getDiscoveryRanking(topOnly = true) {
    const users = await this.userRepo.find({
      select: { id: true, username: true },
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
      .map((user) => ({ userId: user.id, username: user.username, score: scores.get(user.id) ?? 0 }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.username.localeCompare(b.username))
      .slice(0, topOnly ? 10 : undefined);
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
    const [research, prestige, colonies, colonyWorth, colonyProductionWorth] =
      await Promise.all([
        this.getResearchRanking(),
        this.getPrestigeRanking(),
        this.getColonyRanking(),
        this.getColonyWorthRanking(),
        this.getColonyProductionWorthRanking(),
      ]);

    return { research, prestige, colonies, colonyWorth, colonyProductionWorth };
  }

  private async getResearchRanking(topOnly = true) {
    const query = this.researchRepo
      .createQueryBuilder('research')
      .innerJoin(User, 'user', 'user.id = research.userId')
      .select('user.id', 'userId')
      .addSelect('user.username', 'username')
      .addSelect('COUNT(research.id)', 'score')
      .where('research.status = :status', { status: ResearchStatus.COMPLETED })
      .groupBy('user.id')
      .addGroupBy('user.username')
      .orderBy('COUNT(research.id)', 'DESC')
      .addOrderBy('user.username', 'ASC');
    return topOnly ? query.limit(10).getRawMany() : query.getRawMany();
  }

  private async getPrestigeRanking(topOnly = true) {
    const users = await this.userRepo.find({
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
      .leftJoin('colony.fields', 'field')
      .select('colony.id', 'colonyId')
      .addSelect('colony.name', 'colonyName')
      .addSelect('user.id', 'userId')
      .addSelect('user.username', 'username')
      .addSelect(`SUM(CASE WHEN field.buildingId IS NOT NULL AND field.isBuilding = false THEN 1 ELSE 0 END)`, 'score')
      .groupBy('colony.id')
      .addGroupBy('colony.name')
      .addGroupBy('user.id')
      .addGroupBy('user.username')
      .orderBy('score', 'DESC')
      .addOrderBy('colony.name', 'ASC');
    return topOnly ? query.limit(10).getRawMany() : query.getRawMany();
  }

  private async getColonyProductionWorthRanking(topOnly = true) {
    const query = this.colonyRepo
      .createQueryBuilder('colony')
      .innerJoin(User, 'user', 'user.id = colony.userId')
      .leftJoin('colony.fields', 'field')
      .select('colony.id', 'colonyId')
      .addSelect('colony.name', 'colonyName')
      .addSelect('user.id', 'userId')
      .addSelect('user.username', 'username')
      .addSelect(`SUM(CASE WHEN field.buildingId IS NOT NULL AND field.isBuilding = false AND field.isActive = true THEN 1 ELSE 0 END)`, 'score')
      .groupBy('colony.id')
      .addGroupBy('colony.name')
      .addGroupBy('user.id')
      .addGroupBy('user.username')
      .orderBy('score', 'DESC')
      .addOrderBy('colony.name', 'ASC');
    return topOnly ? query.limit(10).getRawMany() : query.getRawMany();
  }
}
