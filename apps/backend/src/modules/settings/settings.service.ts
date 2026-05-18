import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../auth/user.entity';
import { UserSetting } from './entities/user-setting.entity';

const SETTING_DEFAULTS: Record<string, string> = {
  email_notification: '1',
  storage_notification: '1',
  show_pm_read_receipt: '1',
  default_view: 'maindesk',
};

const VALID_SETTINGS = Object.keys(SETTING_DEFAULTS);

const VACATION_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserSetting)
    private readonly settingRepo: Repository<UserSetting>,
  ) {}

  async getSettings(userId: number): Promise<Record<string, string>> {
    const rows = await this.settingRepo.find({ where: { userId } });
    const result = { ...SETTING_DEFAULTS };
    for (const row of rows) {
      result[row.key] = row.value;
    }
    return result;
  }

  async updateSettings(
    userId: number,
    updates: Record<string, string>,
  ): Promise<Record<string, string>> {
    for (const key of Object.keys(updates)) {
      if (!VALID_SETTINGS.includes(key)) {
        throw new BadRequestException(`Invalid setting key: ${key}`);
      }
    }

    for (const [key, value] of Object.entries(updates)) {
      await this.settingRepo.upsert({ userId, key, value }, ['userId', 'key']);
    }

    return this.getSettings(userId);
  }

  async changePassword(
    userId: number,
    oldPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new UnauthorizedException();

    const valid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!valid) {
      throw new BadRequestException('Current password is incorrect');
    }

    if (newPassword.length < 8 || newPassword.length > 128) {
      throw new BadRequestException(
        'Password must be between 8 and 128 characters',
      );
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await this.userRepo.save(user);
  }

  async changeEmail(
    userId: number,
    password: string,
    newEmail: string,
  ): Promise<void> {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new UnauthorizedException();

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new BadRequestException('Password is incorrect');
    }

    const existing = await this.userRepo.findOneBy({ email: newEmail });
    if (existing && existing.id !== userId) {
      throw new BadRequestException('Email already in use');
    }

    user.email = newEmail;
    await this.userRepo.save(user);
  }

  async updateProfile(userId: number, description: string): Promise<void> {
    await this.userRepo.update(userId, { description });
  }

  async activateVacation(userId: number): Promise<void> {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new UnauthorizedException();

    if (user.vacationMode) {
      throw new BadRequestException('Vacation mode is already active');
    }

    if (user.vacationEndedAt) {
      const elapsed = Date.now() - user.vacationEndedAt.getTime();
      if (elapsed < VACATION_COOLDOWN_MS) {
        const remainingDays = Math.ceil(
          (VACATION_COOLDOWN_MS - elapsed) / (24 * 60 * 60 * 1000),
        );
        throw new BadRequestException(
          `Vacation cooldown active. ${remainingDays} days remaining.`,
        );
      }
    }

    user.vacationMode = true;
    user.vacationStartedAt = new Date();
    await this.userRepo.save(user);
  }

  async deactivateVacation(userId: number): Promise<void> {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new UnauthorizedException();

    if (!user.vacationMode) {
      throw new BadRequestException('Vacation mode is not active');
    }

    user.vacationMode = false;
    user.vacationEndedAt = new Date();
    await this.userRepo.save(user);
  }

  async requestDeletion(userId: number, password: string): Promise<void> {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new UnauthorizedException();

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new BadRequestException('Password is incorrect');
    }

    if (user.deletionMark === 3) {
      throw new ForbiddenException('Account deletion has been forbidden by admin');
    }

    user.deletionMark = 1;
    await this.userRepo.save(user);
  }

  async searchUsers(query: string): Promise<{ id: number; username: string }[]> {
    if (!query || query.length < 2) return [];

    const users = await this.userRepo
      .createQueryBuilder('u')
      .select(['u.id', 'u.username'])
      .where('u.username ILIKE :q', { q: `%${query}%` })
      .limit(10)
      .getMany();

    return users.map((u) => ({ id: u.id, username: u.username }));
  }
}
