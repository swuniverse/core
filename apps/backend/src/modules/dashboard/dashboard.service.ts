import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { User } from '../auth/user.entity';
import { Colony } from '../colony/entities/colony.entity';
import {
  Spacecraft,
  SpacecraftStatus,
} from '../spacecraft/entities/spacecraft.entity';
import { HolonetPost } from '../holonet/entities/holonet-post.entity';
import { GameGateway } from '../websocket/game.gateway';
import { DashboardSnapshot } from './entities/dashboard-snapshot.entity';
import { Message } from '../messaging/entities/message.entity';
import { Research, ResearchStatus } from '../research/entities/research.entity';
import { GameDataService } from '../game-data/game-data.service';
import type {
  DashboardForumTopicDto,
  GlobalHeaderStatusDto,
} from '@swuniverse/shared';
import { AllianceService } from '../alliance/alliance.service';
import { ForumService } from '../alliance/forum.service';
import { ColonyStatsService } from '../colony/colony-stats.service';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Colony) private readonly colonyRepo: Repository<Colony>,
    @InjectRepository(Spacecraft)
    private readonly shipRepo: Repository<Spacecraft>,
    @InjectRepository(HolonetPost)
    private readonly postRepo: Repository<HolonetPost>,
    @InjectRepository(DashboardSnapshot)
    private readonly snapshotRepo: Repository<DashboardSnapshot>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @InjectRepository(Research)
    private readonly researchRepo: Repository<Research>,
    private readonly gateway: GameGateway,
    private readonly gameData: GameDataService,
    private readonly allianceService: AllianceService,
    private readonly forumService: ForumService,
    private readonly colonyStatsService: ColonyStatsService,
  ) {}

  /** Latest forum topics of the player's alliance; empty without membership. */
  getForumTopics(userId: number): Promise<DashboardForumTopicDto[]> {
    return this.forumService.listRecentTopics(userId);
  }

  async getHeader(userId: number): Promise<GlobalHeaderStatusDto> {
    const [user, colonies, messages, system, research, queued, alliance] =
      await Promise.all([
      this.userRepo.findOneByOrFail({ id: userId }),
      this.colonyRepo.find({
        where: { userId, isAbandoned: false },
        relations: { fields: true, changeable: true, celestialObject: true },
        order: { id: 'ASC' },
      }),
      this.messageRepo.count({
        where: {
          recipientId: userId,
          isRead: false,
          isSystem: false,
          deletedByRecipient: false,
        },
      }),
      this.messageRepo.count({
        where: {
          recipientId: userId,
          isRead: false,
          isSystem: true,
          deletedByRecipient: false,
        },
      }),
      this.researchRepo.findOne({
        where: { userId, status: ResearchStatus.IN_PROGRESS },
        order: { id: 'ASC' },
      }),
      this.researchRepo.findOne({
        where: { userId, status: ResearchStatus.QUEUED },
        order: { queuePosition: 'ASC' },
      }),
      this.allianceService.getRef(userId),
    ]);
    const tech = research ? this.gameData.getTech(research.techId) : undefined;
    const commodityId = tech?.mappedCommodityId ?? tech?.commodityId ?? null;
    const productionPerTick =
      commodityId == null
        ? 0
        : colonies.reduce((total, colony) => {
            const production =
              this.colonyStatsService.calculateSummary(colony).productionDelta.get(
                commodityId,
              ) ?? 0;
            return total + Math.max(0, production);
          }, 0);
    const queuedTech = queued ? this.gameData.getTech(queued.techId) : undefined;
    const pointsRequired = research
      ? Math.max(
          research.progress,
          research.progress + (research.remainingPoints ?? 0),
        )
      : 0;
    return {
      user: {
        id: user.id,
        name: user.displayName || user.username,
        faction: user.faction,
        prestige: user.prestige,
        avatar: user.avatar,
      },
      alliance,
      notifications: { messages, system },
      research: research
        ? {
            techId: research.techId,
            imageId: research.techId,
            name: tech?.name ?? `Forschung #${research.techId}`,
            commodityId,
            progress: research.progress,
            pointsRequired,
            productionPerTick,
            queuedCount: queued ? 1 : 0,
            nextQueuedName: queued
              ? (queuedTech?.name ?? `Forschung #${queued.techId}`)
              : null,
            blockedReason: research.blockedReason,
          }
        : null,
      colonies,
    };
  }

  async recordSnapshot(): Promise<DashboardSnapshot> {
    const [
      playerCount,
      colonyCount,
      shipCount,
      inFlightShipCount,
      holonetPostCount,
    ] = await Promise.all([
      this.userRepo.count(),
      this.colonyRepo.count({ where: { isAbandoned: false } }),
      this.shipRepo.count(),
      this.shipRepo.count({ where: { status: SpacecraftStatus.IN_FLIGHT } }),
      this.postRepo.count({ where: { deletedAt: IsNull() } }),
    ]);
    const snapshot = this.snapshotRepo.create({
      playerCount,
      activePlayerCount: this.gateway.onlineUserIds.length,
      colonyCount,
      shipCount,
      inFlightShipCount,
      holonetPostCount,
    });
    return this.snapshotRepo.save(snapshot);
  }

  async getOperations(userId: number) {
    const [colonies, ships, universe, snapshots] = await Promise.all([
      this.colonyRepo.find({
        where: { userId, isAbandoned: false },
        select: [
          'id',
          'name',
          'energy',
          'energyMax',
          'storageUsed',
          'storageMax',
        ],
      }),
      this.shipRepo.find({
        where: { userId },
        select: [
          'id',
          'name',
          'status',
          'alertState',
          'hull',
          'hullMax',
          'arrivalAt',
        ],
      }),
      Promise.all([
        this.userRepo.count(),
        this.colonyRepo.count({ where: { isAbandoned: false } }),
        this.shipRepo.count(),
      ]),
      this.snapshotRepo.find({ order: { recordedAt: 'DESC' }, take: 1 }),
    ]);
    const attention = ships
      .filter(
        (ship) =>
          ship.alertState === 'RED' ||
          (ship.hullMax > 0 && ship.hull < ship.hullMax * 0.25),
      )
      .map((ship) => ({
        id: `ship-${ship.id}`,
        severity: ship.alertState === 'RED' ? 'CRITICAL' : 'WARNING',
        title: ship.name,
        detail:
          ship.alertState === 'RED'
            ? 'Alarmstufe Rot'
            : 'Niedrige Hüllenintegrität',
        linkTo: `/spacecraft/${ship.id}`,
      }));
    return {
      attention,
      fleet: ships,
      colonies,
      universe: {
        settlers: universe[0],
        colonies: universe[1],
        ships: universe[2],
      },
      latestSnapshot: snapshots[0] ?? null,
    };
  }

  async getSnapshots(period = 1) {
    const take = period === 7 ? 168 : period === 30 ? 720 : 48;
    return this.snapshotRepo.find({ order: { recordedAt: 'DESC' }, take });
  }
}
