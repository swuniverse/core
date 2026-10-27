import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { UserLock } from './user-lock.entity';

@Injectable()
export class UserLockService {
  constructor(
    @InjectRepository(UserLock)
    private readonly lockRepo: Repository<UserLock>,
  ) {}

  async reduceActiveLocks(): Promise<void> {
    const locks = await this.lockRepo.find({
      where: { remainingTicks: MoreThan(0) },
      order: { id: 'ASC' },
    });
    for (const lock of locks) {
      lock.remainingTicks -= 1;
      if (lock.remainingTicks === 0) {
        await this.lockRepo.delete(lock.id);
      } else {
        await this.lockRepo.save(lock);
      }
    }
  }
}
