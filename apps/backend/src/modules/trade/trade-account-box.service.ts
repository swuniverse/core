import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { TradeAccountBoxDto } from '@swuniverse/shared';
import { DataSource, In, MoreThan } from 'typeorm';
import { User } from '../auth/user.entity';
import { TradeAccountStorage } from './entities/trade-account-storage.entity';
import { TradeLicenseCondition } from './entities/trade-license-condition.entity';
import { TradeLicense } from './entities/trade-license.entity';
import { TradeOffer } from './entities/trade-offer.entity';
import { tradeNetworkName } from './trade-network';
import { TradeNetworkTransferService } from './trade-network-transfer.service';
import { TradeQueryService } from './trade-query.service';
import { TradeStorageService } from './trade-storage.service';

/** STU `ShowAccounts`: one box per post where the player holds stock or offers. */
@Injectable()
export class TradeAccountBoxService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly query: TradeQueryService,
    private readonly storage: TradeStorageService,
    private readonly transfers: TradeNetworkTransferService,
  ) {}

  async list(userId: number, now = new Date()): Promise<TradeAccountBoxDto[]> {
    const manager = this.dataSource.manager;
    const [stock, offers] = await Promise.all([
      manager.find(TradeAccountStorage, { where: { userId, amount: MoreThan(0) }, order: { commodityId: 'ASC' } }),
      manager.find(TradeOffer, { where: { userId, reservedAmount: MoreThan(0) }, order: { offeredCommodityId: 'ASC' } }),
    ]);
    const postIds = [...new Set([...stock, ...offers].map((row) => row.tradePostId))];
    if (!postIds.length) return [];
    const posts = (await this.query.listPosts(userId)).filter((post) => postIds.includes(post.id));
    const ownerIds = [...new Set(posts.flatMap((post) => (post.owner ? [post.owner.id] : [])))];
    const [npcOwners, licenses, conditions, transfers, capacities] = await Promise.all([
      manager.find(User, { select: { id: true }, where: { id: In(ownerIds), isNpc: true } }),
      manager.find(TradeLicense, { select: { tradePostId: true }, where: { tradePostId: In(postIds), expiresAt: MoreThan(now) } }),
      manager.find(TradeLicenseCondition, { where: { tradePostId: In(postIds) } }),
      this.transfers.capacities(postIds, userId, now),
      Promise.all(postIds.map((id) => this.storage.getCapacity(id, userId))),
    ]);
    const npcOwnerIds = new Set(npcOwners.map((owner) => owner.id));

    return posts.map((post) => {
      const isNpcPost = post.owner != null && npcOwnerIds.has(post.owner.id);
      const capacity = capacities[postIds.indexOf(post.id)];
      const condition = conditions.find((row) => row.tradePostId === post.id);
      const transfer = transfers.find((row) => row.tradePostId === post.id);
      const offerStock = new Map<number, number>();
      for (const offer of offers.filter((row) => row.tradePostId === post.id)) {
        offerStock.set(offer.offeredCommodityId, (offerStock.get(offer.offeredCommodityId) ?? 0) + offer.reservedAmount);
      }
      return {
        tradePostId: post.id,
        name: post.name,
        isNpcPost,
        location: post.location,
        networkId: post.networkId,
        networkName: tradeNetworkName(post.networkId, post.networkId === post.owner?.id ? post.owner.name : null),
        stock: stock
          .filter((row) => row.tradePostId === post.id)
          .map((row) => ({ commodityId: row.commodityId, amount: row.amount })),
        offerStock: [...offerStock].map(([commodityId, amount]) => ({ commodityId, amount })),
        storage: { occupied: capacity.occupied, limit: capacity.capacity, isOverStorage: capacity.isOverStorage },
        issuedLicenseCount: licenses.filter((row) => row.tradePostId === post.id).length,
        licenseCondition: condition
          ? { commodityId: condition.commodityId, amount: condition.amount, durationDays: condition.durationDays }
          : null,
        isOwner: post.owner?.id === userId,
        transferCapacity: isNpcPost && transfer ? { free: transfer.free, capacity: transfer.capacity } : null,
      };
    });
  }
}
