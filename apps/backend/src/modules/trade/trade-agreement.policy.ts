import { Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { User } from '../auth/user.entity';
import { RelationshipResolverService } from '../alliance/relationship-resolver.service';
import type { TradePost } from './entities/trade-post.entity';

/**
 * SWU extension (tmw-T13): partners of an active trade agreement get licenses
 * at the owner's player post for free. NPC posts are never affected, and any
 * failure falls back to the regular price.
 */
@Injectable()
export class TradeAgreementPolicy {
  constructor(private readonly relationships: RelationshipResolverService) {}

  async licenseIsFree(manager: EntityManager, post: Pick<TradePost, 'ownerId'>, userId: number): Promise<boolean> {
    if (post.ownerId === userId) return false;
    const owner = await manager.findOne(User, { select: { id: true, isNpc: true }, where: { id: post.ownerId } });
    if (!owner || owner.isNpc) return false;
    try {
      return (await this.relationships.resolve(userId, post.ownerId)).mayTradeFavorably === true;
    } catch {
      return false;
    }
  }
}
