import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'node:crypto';
import { EntityManager, IsNull, MoreThan, Repository } from 'typeorm';
import { AccountToken, AccountTokenPurpose } from './account-token.entity';

@Injectable()
export class AccountTokenService {
  constructor(
    @InjectRepository(AccountToken)
    private readonly repository: Repository<AccountToken>,
  ) {}

  async create(
    userId: number,
    purpose: AccountTokenPurpose,
    lifetimeMs: number,
  ): Promise<{ token: string; expiresAt: Date }> {
    return this.repository.manager.transaction(async (manager) => {
      const repository = manager.getRepository(AccountToken);
      const now = new Date();
      await manager.query('SELECT pg_advisory_xact_lock($1, $2)', [
        userId,
        this.purposeLockKey(purpose),
      ]);
      await repository.update(
        { userId, purpose, consumedAt: IsNull() },
        { consumedAt: now },
      );
      const token = randomBytes(32).toString('base64url');
      const expiresAt = new Date(now.getTime() + lifetimeMs);
      await repository.save(
        repository.create({
          userId,
          purpose,
          tokenHash: this.hash(token),
          expiresAt,
          consumedAt: null,
        }),
      );
      return { token, expiresAt };
    });
  }

  async hasRecentToken(
    userId: number,
    purpose: AccountTokenPurpose,
    since: Date,
  ): Promise<boolean> {
    return this.repository.existsBy({
      userId,
      purpose,
      createdAt: MoreThan(since),
    });
  }

  async consume(
    token: string,
    purpose: AccountTokenPurpose,
    manager?: EntityManager,
  ): Promise<AccountToken | null> {
    const consume = async (transactionManager: EntityManager) => {
      const repository = transactionManager.getRepository(AccountToken);
      const row = await repository.findOne({
        where: { tokenHash: this.hash(token), purpose },
        lock: { mode: 'pessimistic_write' },
      });
      if (!row || row.consumedAt || row.expiresAt.getTime() <= Date.now()) {
        return null;
      }
      row.consumedAt = new Date();
      return repository.save(row);
    };

    return manager
      ? consume(manager)
      : this.repository.manager.transaction(consume);
  }

  private purposeLockKey(purpose: AccountTokenPurpose): number {
    return Object.values(AccountTokenPurpose).indexOf(purpose) + 1;
  }

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
