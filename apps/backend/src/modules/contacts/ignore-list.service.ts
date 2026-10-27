import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type {
  IgnoredByEntryDto,
  IgnoreListEntryDto,
} from '@swuniverse/shared';
import { In, Repository } from 'typeorm';
import { User } from '../auth/user.entity';
import { IgnoreList } from './entities/ignore-list.entity';

@Injectable()
export class IgnoreListService {
  constructor(
    @InjectRepository(IgnoreList)
    private readonly entries: Repository<IgnoreList>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  async list(ownerId: number): Promise<IgnoreListEntryDto[]> {
    const entries = await this.entries.find({
      where: { ownerId },
      relations: { ignoredUser: true },
      order: { ignoredUserId: 'ASC' },
    });
    return entries.map((entry) => this.toDto(entry));
  }

  async listIgnoredBy(ignoredUserId: number): Promise<IgnoredByEntryDto[]> {
    const entries = await this.entries.find({
      where: { ignoredUserId },
      relations: { owner: true },
      order: { ownerId: 'ASC' },
    });
    return entries.map((entry) => ({
      id: entry.id,
      ownerId: entry.ownerId,
      ownerUsername: entry.owner.username,
      createdAt: entry.createdAt.toISOString(),
    }));
  }

  async create(ownerId: number, ignoredUserId: number): Promise<IgnoreListEntryDto> {
    if (ownerId === ignoredUserId) {
      throw new BadRequestException('Du kannst Dich nicht selbst ignorieren');
    }
    const ignoredUser = await this.users.findOneBy({ id: ignoredUserId });
    if (!ignoredUser) throw new NotFoundException('Dieser Spieler existiert nicht');
    if (await this.isIgnored(ownerId, ignoredUserId)) {
      throw new BadRequestException(
        'Dieser Spieler befindet sich bereits auf Deiner Ignorierliste',
      );
    }
    const entry = await this.entries.save(
      this.entries.create({ ownerId, ignoredUserId, ignoredUser }),
    );
    return this.toDto(entry);
  }

  async removeSelected(ownerId: number, ids: number[]): Promise<{ deleted: number }> {
    const uniqueIds = [...new Set(ids.filter(Number.isInteger))];
    if (uniqueIds.length === 0) return { deleted: 0 };
    const entries = await this.entries.find({
      where: { id: In(uniqueIds), ownerId },
    });
    if (entries.length > 0) await this.entries.remove(entries);
    return { deleted: entries.length };
  }

  async removeAll(ownerId: number): Promise<{ deleted: number }> {
    const result = await this.entries.delete({ ownerId });
    return { deleted: result.affected ?? 0 };
  }

  async isIgnored(ownerId: number, ignoredUserId: number): Promise<boolean> {
    return Boolean(
      await this.entries.findOne({
        where: { ownerId, ignoredUserId },
        select: { id: true },
      }),
    );
  }

  private toDto(entry: IgnoreList): IgnoreListEntryDto {
    return {
      id: entry.id,
      ignoredUserId: entry.ignoredUserId,
      ignoredUsername: entry.ignoredUser.username,
      createdAt: entry.createdAt.toISOString(),
    };
  }
}
