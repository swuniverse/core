import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHmac } from 'crypto';
import { EntityManager, Repository } from 'typeorm';
import { BlockedUser } from './entities/blocked-user.entity';
import type { EmailBlocklistPort } from './email-blocklist.port';

const DEVELOPMENT_PEPPER = 'swu-development-email-blocklist-pepper';

@Injectable()
export class EmailBlocklistService implements EmailBlocklistPort {
  private readonly pepper: string;

  constructor(
    @InjectRepository(BlockedUser)
    private readonly blockedRepo: Repository<BlockedUser>,
    config: ConfigService,
  ) {
    this.pepper = resolvePepper(config);
  }

  /** SHA-256 HMAC of the trimmed, lower-cased address keyed with the pepper. */
  hash(email: string): string {
    return createHmac('sha256', this.pepper)
      .update(email.trim().toLowerCase())
      .digest('hex');
  }

  isBlocked(email: string): Promise<boolean> {
    return this.blockedRepo.existsBy({ emailHash: this.hash(email) });
  }

  async blockedUserIds(): Promise<Set<number>> {
    const rows = await this.blockedRepo.find({ select: { userId: true } });
    return new Set(rows.map((row) => row.userId));
  }

  async block(manager: EntityManager, userId: number, email: string): Promise<void> {
    const repository = manager.getRepository(BlockedUser);
    if (await repository.existsBy({ userId })) {
      throw new ConflictException('Dieser Spieler ist bereits blockiert');
    }
    await repository.insert({ userId, emailHash: this.hash(email) });
  }
}

function resolvePepper(config: ConfigService): string {
  const pepper = config.get<string>('EMAIL_BLOCKLIST_PEPPER');
  if (pepper) return pepper;
  if (config.get<string>('NODE_ENV') === 'production') {
    throw new Error('EMAIL_BLOCKLIST_PEPPER is required when NODE_ENV=production');
  }
  Logger.warn(
    'EMAIL_BLOCKLIST_PEPPER is not configured; using the development default',
    'EmailBlocklist',
  );
  return DEVELOPMENT_PEPPER;
}
