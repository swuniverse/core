import {
  ConflictException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import { DataSource, EntityManager, QueryRunner } from 'typeorm';

const NAMESPACE = 'swu_rpg_spacecraft';

/** Coordinates HTTP actions with scene changes across backend processes. */
@Injectable()
export class RpgActionLockService {
  private activeRequests = 0;
  private readonly waiting: Array<() => void> = [];
  private readonly request = new AsyncLocalStorage<QueryRunner>();

  constructor(private readonly db: DataSource) {}

  async acquirePlayer(ids: number[]): Promise<() => Promise<void>> {
    return (await this.acquire(ids)).release;
  }

  async runPlayer<T>(
    ids: number[],
    work: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    const current = this.request.getStore();
    if (current) {
      await this.lockPlayer(current, ids);
      return work(current.manager);
    }
    const { runner, release } = await this.acquire(ids);
    try {
      return await this.request.run(runner, () => work(runner.manager));
    } finally {
      await release();
    }
  }

  private async acquire(ids: number[]) {
    // Handler services use their own connections. Never fill the pool with guards
    // waiting for handlers, and never wait for an administrative exclusive lock.
    const poolSize =
      this.db.options.poolSize ?? this.db.options.extra?.max ?? 10;
    const limit = Math.floor((poolSize - 1) / 2);
    if (limit < 1 || this.waiting.length >= 100)
      throw new ServiceUnavailableException(
        'Schiffsanfragen ausgelastet; bitte erneut versuchen',
      );
    if (this.activeRequests >= limit)
      await new Promise<void>((resolve) => this.waiting.push(resolve));
    else this.activeRequests++;
    const runner = this.db.createQueryRunner();
    const release = async () => {
      try {
        if (runner.isTransactionActive) await runner.rollbackTransaction();
      } finally {
        try {
          await runner.release();
        } finally {
          const next = this.waiting.shift();
          if (next) next();
          else this.activeRequests--;
        }
      }
    };
    try {
      await runner.startTransaction();
      await this.lockPlayer(runner, ids);
      return { runner, release };
    } catch (error) {
      await release();
      throw error;
    }
  }

  private async lockPlayer(runner: QueryRunner, ids: number[]) {
    for (const id of [...new Set(ids)].sort((a, b) => a - b)) {
      const [result] = await runner.query(
        'SELECT pg_try_advisory_xact_lock_shared(hashtext($1), $2) AS acquired',
        [NAMESPACE, id],
      );
      if (!result.acquired)
        throw new ConflictException('Szenenschiff wird gerade verwaltet');
    }
  }

  async acquireAdmin(manager: EntityManager, id: number) {
    const [result] = await manager.query(
      'SELECT pg_try_advisory_xact_lock(hashtext($1), $2) AS acquired',
      [NAMESPACE, id],
    );
    if (!result.acquired)
      throw new ConflictException(
        'Schiff wird gerade verwendet; bitte erneut versuchen',
      );
  }
}
