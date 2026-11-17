import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type {
  TradeOverviewDto,
  TradePostListItemDto,
} from '@swuniverse/shared';
import { In, Repository } from 'typeorm';
import { User } from '../auth/user.entity';
import { Spacecraft } from '../spacecraft/entities/spacecraft.entity';
import { resolveSpaceLocation } from '../spacecraft/spacecraft-field';
import { SpaceLocation } from '../starmap/entities/space-location.entity';
import { TradeAccountStorage } from './entities/trade-account-storage.entity';
import { TradePost } from './entities/trade-post.entity';

@Injectable()
export class TradeQueryService {
  constructor(
    @InjectRepository(TradePost)
    private readonly postRepo: Repository<TradePost>,
    @InjectRepository(TradeAccountStorage)
    private readonly accountRepo: Repository<TradeAccountStorage>,
    @InjectRepository(Spacecraft)
    private readonly spacecraftRepo: Repository<Spacecraft>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(SpaceLocation)
    private readonly locationRepo: Repository<SpaceLocation>,
  ) {}

  async listPosts(userId: number): Promise<TradePostListItemDto[]> {
    const [posts, accounts, ownSpacecraft] = await Promise.all([
      this.postRepo.find({
        order: { networkId: 'ASC', name: 'ASC', id: 'ASC' },
      }),
      this.accountRepo.find({ where: { userId } }),
      this.spacecraftRepo.find({
        where: { userId, rpgHidden: false },
        select: ['locationId'],
      }),
    ]);
    const knownLocationIds = new Set(
      ownSpacecraft.map((ship) => ship.locationId),
    );
    const [owners, locations] = await Promise.all([
      this.userRepo.findBy({
        id: In([...new Set(posts.flatMap((post) => (post.ownerId == null ? [] : [post.ownerId])))]),
      }),
      knownLocationIds.size
        ? this.locationRepo.find({
            where: { id: In([...knownLocationIds]) },
            relations: ['galaxyField', 'systemField'],
          })
        : Promise.resolve([]),
    ]);
    const ownerById = new Map(owners.map((owner) => [owner.id, owner]));
    const locationById = new Map(locations.map((location) => [location.id, location]));
    const accountPostIds = new Set(accounts.map((account) => account.tradePostId));

    return posts.map((post) => ({
      id: post.id,
      name: post.name,
      description: post.description,
      networkId: post.networkId,
      owner:
        post.ownerId == null
          ? null
          : { id: post.ownerId, name: ownerById.get(post.ownerId)?.username ?? `Spieler #${post.ownerId}` },
      licenseStatus: accountPostIds.has(post.id) ? 'ACCOUNT' : 'NONE',
      location: resolveSpaceLocation(locationById.get(post.locationId)),
      level: post.level,
      storageLimit: post.storageLimit,
      transferCapacity: post.transferCapacity,
    }));
  }

  async getOverview(userId: number): Promise<Omit<TradeOverviewDto, 'transferCapacities'>> {
    const [posts, accounts, spacecraft] = await Promise.all([
      this.postRepo.find({ select: ['id', 'locationId'] }),
      this.accountRepo.find({ where: { userId } }),
      this.spacecraftRepo.find({
        where: { userId, rpgHidden: false },
        select: ['id', 'name', 'shipClassId', 'kind', 'locationId'],
      }),
    ]);
    const postByLocationId = new Map(
      posts.map((post) => [post.locationId, post.id]),
    );

    return {
      accounts: accounts.map((account) => ({
        tradePostId: account.tradePostId,
        commodityId: account.commodityId,
        amount: account.amount,
      })),
      spacecraft: spacecraft.flatMap((ship) => {
        const tradePostId = postByLocationId.get(ship.locationId);
        return tradePostId === undefined
          ? []
          : [
              {
                tradePostId,
                spacecraftId: ship.id,
                spacecraftName: ship.name,
                shipClassId: ship.shipClassId,
                kind: ship.kind,
              },
            ];
      }),
    };
  }
}
