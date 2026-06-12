import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User } from '../auth/user.entity';
import { Colony } from '../colony/entities/colony.entity';
import { Spacecraft } from '../spacecraft/entities/spacecraft.entity';
import { Research, ResearchStatus } from '../research/entities/research.entity';
import { FactionService } from '../faction/faction.service';
import { GameDataService } from '../game-data/game-data.service';
import { GameGateway } from '../websocket/game.gateway';

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
    private readonly factionService: FactionService,
    private readonly gameData: GameDataService,
    private readonly gameGateway: GameGateway,
  ) {}

  async getOnlinePlayers() {
    const onlineUserIds = this.gameGateway.onlineUserIds;
    if (onlineUserIds.length === 0) return [];
    const users = await this.userRepo.find({
      where: { id: In(onlineUserIds) },
      select: ['id', 'username', 'faction'],
    });
    return users.map((u) => ({ id: u.id, username: u.username, faction: u.faction }));
  }

  async getOverview() {
    const [settlers, colonies, ships, completedResearch] = await Promise.all([
      this.userRepo.count(),
      this.colonyRepo.count(),
      this.shipRepo.count(),
      this.researchRepo.count({
        where: { status: ResearchStatus.COMPLETED },
      }),
    ]);

    return {
      settlers,
      colonies,
      ships,
      completedResearch,
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
      users.map(async (user) => {
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
      }),
    );
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

  async getRankings() {
    const [research, prestige, colonies] = await Promise.all([
      this.getResearchRanking(),
      this.getPrestigeRanking(),
      this.getColonyRanking(),
    ]);

    return { research, prestige, colonies };
  }

  private async getResearchRanking() {
    return this.researchRepo
      .createQueryBuilder('research')
      .innerJoin(User, 'user', 'user.id = research.userId')
      .select('user.id', 'userId')
      .addSelect('user.username', 'username')
      .addSelect('COUNT(research.id)', 'score')
      .where('research.status = :status', { status: ResearchStatus.COMPLETED })
      .groupBy('user.id')
      .addGroupBy('user.username')
      .orderBy('COUNT(research.id)', 'DESC')
      .addOrderBy('user.username', 'ASC')
      .limit(10)
      .getRawMany();
  }

  private async getPrestigeRanking() {
    const users = await this.userRepo.find({
      order: { prestige: 'DESC', username: 'ASC' },
      take: 10,
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
}
