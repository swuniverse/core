import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { User } from '../auth/user.entity';
import { PrestigeHistoryEntry } from './entities/prestige-history-entry.entity';

@Injectable()
export class PrestigeService {
  constructor(
    @InjectRepository(PrestigeHistoryEntry)
    private readonly historyRepo: Repository<PrestigeHistoryEntry>,
  ) {}

  async change(
    userId: number,
    amount: number,
    description: string,
    manager?: EntityManager,
  ): Promise<void> {
    if (amount === 0) return;

    const repository = manager?.getRepository(PrestigeHistoryEntry) ?? this.historyRepo;
    await repository.save(repository.create({ userId, amount, description }));
    await (manager ?? this.historyRepo.manager).increment(
      User,
      { id: userId },
      'prestige',
      amount,
    );
  }
}
