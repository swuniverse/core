import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Raw, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { User } from './user.entity';
import { InviteKey, InviteKeyStatus } from './invite-key.entity';
import { InviteQuota } from './invite-quota.entity';
import { FactionEntity } from '../faction/entities/faction.entity';
import {
  RegisterDto,
  LoginDto,
  AuthResponse,
  JwtPayload,
} from '@swuniverse/shared';
import { MailService } from '../mail/mail.service';

const INITIAL_INVITE_QUOTA = 2;
const INVITE_KEY_BYTES = 15;
const INVITE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export interface InviteUserSummary {
  id: number;
  username: string;
  email?: string;
}

export interface InviteKeyView {
  id: number;
  keyPreview: string;
  status: InviteKeyStatus;
  createdByUserId: number | null;
  ownerUserId: number | null;
  usedByUserId: number | null;
  usedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdByUser?: InviteUserSummary | null;
  ownerUser?: InviteUserSummary | null;
  usedByUser?: InviteUserSummary | null;
}

export interface InviteQuotaView {
  id: number;
  userId: number;
  available: number;
  createdAt: string;
  updatedAt: string;
  user?: InviteUserSummary | null;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(InviteKey)
    private readonly inviteKeyRepo: Repository<InviteKey>,
    @InjectRepository(InviteQuota)
    private readonly inviteQuotaRepo: Repository<InviteQuota>,
    private readonly dataSource: DataSource,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.dataSource.transaction(async (manager) => {
      await this.acquireRegistrationLock(manager);

      const userRepo = manager.getRepository(User);
      const factionRepo = manager.getRepository(FactionEntity);
      const inviteKeyRepo = manager.getRepository(InviteKey);
      const inviteQuotaRepo = manager.getRepository(InviteQuota);

      const exists = await userRepo.findOne({
        where: [
          { username: Raw((col) => `LOWER(${col}) = LOWER(:username)`, { username: dto.username }) },
          { email: dto.email },
        ],
      });
      if (exists) {
        throw new ConflictException('Username or email already taken');
      }

      const faction = await factionRepo.findOne({
        where: { id: dto.factionId },
      });
      if (!faction) {
        throw new BadRequestException('Invalid faction');
      }

      const userCount = await userRepo.count();
      let consumedInvite: InviteKey | null = null;

      if (userCount > 0) {
        const normalizedInviteKey = this.normalizeInviteKey(dto.inviteKey);
        if (!normalizedInviteKey) {
          throw new BadRequestException(
            'Invite key required while the game is in closed alpha',
          );
        }

        consumedInvite = await inviteKeyRepo
          .createQueryBuilder('inviteKey')
          .setLock('pessimistic_write')
          .where('inviteKey.keyHash = :keyHash', {
            keyHash: this.hashInviteKey(normalizedInviteKey),
          })
          .getOne();

        if (
          !consumedInvite ||
          consumedInvite.status !== InviteKeyStatus.Available
        ) {
          throw new BadRequestException(
            'Invite key is invalid or already used',
          );
        }
      }

      const createdUser = userRepo.create({
        username: dto.username,
        email: dto.email,
        passwordHash,
        faction: faction.key as any,
        factionId: faction.id,
        onboardingCompleted: false,
        isAdmin: userCount === 0,
      });
      const savedUser = await userRepo.save(createdUser);

      if (consumedInvite) {
        consumedInvite.status = InviteKeyStatus.Used;
        consumedInvite.usedByUserId = savedUser.id;
        consumedInvite.usedAt = new Date();
        await inviteKeyRepo.save(consumedInvite);
      }

      await inviteQuotaRepo.save(
        inviteQuotaRepo.create({
          userId: savedUser.id,
          available: INITIAL_INVITE_QUOTA,
        }),
      );

      return savedUser;
    });

    void this.mailService.sendWelcomeMail(user.email, user.username);

    return this.generateTokens(user);
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.userRepo.findOne({
      where: { username: Raw((col) => `LOWER(${col}) = LOWER(:username)`, { username: dto.username }) },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateTokens(user);
  }

  async refresh(refreshToken: string): Promise<AuthResponse> {
    const user = await this.userRepo.findOne({
      where: { refreshToken },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return this.generateTokens(user);
  }

  async getProfile(userId: number) {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new UnauthorizedException();
    const { passwordHash, refreshToken, ...profile } = user;
    return profile;
  }

  async getMyInvites(userId: number) {
    const quota = await this.ensureInviteQuota(userId);
    const keys = await this.inviteKeyRepo.find({
      where: { ownerUserId: userId },
      order: { createdAt: 'DESC' },
    });

    return {
      quota: this.mapInviteQuota(quota),
      keys: keys.map((key) => this.mapInviteKey(key)),
    };
  }

  async createMyInvite(userId: number) {
    const result = await this.dataSource.transaction(async (manager) => {
      const quota = await this.lockInviteQuota(manager, userId);
      if (quota.available <= 0) {
        throw new BadRequestException('No invite quota available');
      }

      const generated = await this.createInviteKey(manager, userId, userId);
      quota.available -= 1;
      await manager.getRepository(InviteQuota).save(quota);

      return { quota, generated };
    });

    return {
      quota: this.mapInviteQuota(result.quota),
      inviteKey: this.mapInviteKey(result.generated.entity),
      plainKey: result.generated.plainKey,
    };
  }

  async getAdminInvites() {
    const [keys, quotas] = await Promise.all([
      this.inviteKeyRepo.find({
        relations: ['createdByUser', 'ownerUser', 'usedByUser'],
        order: { createdAt: 'DESC' },
      }),
      this.inviteQuotaRepo.find({
        relations: ['user'],
        order: { updatedAt: 'DESC' },
      }),
    ]);

    return {
      keys: keys.map((key) => this.mapInviteKey(key, true)),
      quotas: quotas.map((quota) => this.mapInviteQuota(quota, true)),
    };
  }

  async adminCreateInvites(
    adminUserId: number,
    body: { ownerUserId?: number; keyCount?: number; additionalQuota?: number },
  ) {
    const ownerUserId = this.normalizeOptionalPositiveInt(body.ownerUserId);
    const keyCount = Math.min(
      this.normalizeOptionalNonNegativeInt(body.keyCount) ?? 1,
      25,
    );
    const additionalQuota = Math.min(
      this.normalizeOptionalNonNegativeInt(body.additionalQuota) ?? 0,
      100,
    );

    if (keyCount === 0 && additionalQuota === 0) {
      throw new BadRequestException('Create at least one key or add quota');
    }

    if (ownerUserId) {
      const owner = await this.userRepo.findOneBy({ id: ownerUserId });
      if (!owner) {
        throw new NotFoundException('Invite owner user not found');
      }
    }

    const result = await this.dataSource.transaction(async (manager) => {
      const generated: Array<{ entity: InviteKey; plainKey: string }> = [];

      for (let index = 0; index < keyCount; index += 1) {
        generated.push(
          await this.createInviteKey(manager, ownerUserId ?? null, adminUserId),
        );
      }

      let quota: InviteQuota | null = null;
      if (ownerUserId && additionalQuota > 0) {
        quota = await this.lockInviteQuota(manager, ownerUserId);
        quota.available += additionalQuota;
        await manager.getRepository(InviteQuota).save(quota);
      }

      return { generated, quota };
    });

    return {
      plainKeys: result.generated.map((generated) => generated.plainKey),
      keys: result.generated.map((generated) =>
        this.mapInviteKey(generated.entity),
      ),
      quota: result.quota ? this.mapInviteQuota(result.quota) : null,
    };
  }

  private async acquireRegistrationLock(manager: EntityManager): Promise<void> {
    await manager.query(
      "SELECT pg_advisory_xact_lock(hashtext('swu_auth_register'))",
    );
  }

  private normalizeOptionalPositiveInt(value: unknown): number | null {
    if (value === undefined || value === null || value === '') return null;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new BadRequestException('Expected a positive integer');
    }
    return parsed;
  }

  private normalizeOptionalNonNegativeInt(value: unknown): number | null {
    if (value === undefined || value === null || value === '') return null;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 0) {
      throw new BadRequestException('Expected a non-negative integer');
    }
    return parsed;
  }

  private normalizeInviteKey(key?: string | null): string | null {
    const normalized = key?.trim().toUpperCase().replace(/\s+/g, '');
    return normalized || null;
  }

  private hashInviteKey(normalizedKey: string): string {
    return createHash('sha256').update(normalizedKey).digest('hex');
  }

  private generateInviteKey(): string {
    const random = randomBytes(INVITE_KEY_BYTES);
    let body = '';
    for (const byte of random) {
      body += INVITE_ALPHABET[byte % INVITE_ALPHABET.length];
    }

    return `SWU-${body.slice(0, 5)}-${body.slice(5, 10)}-${body.slice(10, 15)}`;
  }

  private previewInviteKey(plainKey: string): string {
    const normalized = this.normalizeInviteKey(plainKey) ?? plainKey;
    return `${normalized.slice(0, 4)}…${normalized.slice(-4)}`;
  }

  private async createInviteKey(
    manager: EntityManager,
    ownerUserId: number | null,
    createdByUserId: number | null,
  ): Promise<{ entity: InviteKey; plainKey: string }> {
    const inviteKeyRepo = manager.getRepository(InviteKey);

    for (let attempts = 0; attempts < 5; attempts += 1) {
      const plainKey = this.generateInviteKey();
      const normalizedKey = this.normalizeInviteKey(plainKey);
      if (!normalizedKey) continue;

      const entity = inviteKeyRepo.create({
        keyHash: this.hashInviteKey(normalizedKey),
        keyPreview: this.previewInviteKey(plainKey),
        status: InviteKeyStatus.Available,
        createdByUserId,
        ownerUserId,
      });

      try {
        const saved = await inviteKeyRepo.save(entity);
        return { entity: saved, plainKey };
      } catch (error: any) {
        if (error?.code !== '23505') throw error;
      }
    }

    throw new BadRequestException('Could not generate a unique invite key');
  }

  private async ensureInviteQuota(userId: number): Promise<InviteQuota> {
    let quota = await this.inviteQuotaRepo.findOne({ where: { userId } });
    if (!quota) {
      quota = await this.inviteQuotaRepo.save(
        this.inviteQuotaRepo.create({
          userId,
          available: INITIAL_INVITE_QUOTA,
        }),
      );
    }
    return quota;
  }

  private async lockInviteQuota(
    manager: EntityManager,
    userId: number,
  ): Promise<InviteQuota> {
    const quotaRepo = manager.getRepository(InviteQuota);
    let quota = await quotaRepo
      .createQueryBuilder('quota')
      .setLock('pessimistic_write')
      .where('quota.userId = :userId', { userId })
      .getOne();

    if (!quota) {
      quota = await quotaRepo.save(
        quotaRepo.create({ userId, available: INITIAL_INVITE_QUOTA }),
      );
      quota = await quotaRepo
        .createQueryBuilder('quota')
        .setLock('pessimistic_write')
        .where('quota.userId = :userId', { userId })
        .getOneOrFail();
    }

    return quota;
  }

  private mapInviteKey(key: InviteKey, includeUsers = false): InviteKeyView {
    return {
      id: key.id,
      keyPreview: key.keyPreview,
      status: key.status,
      createdByUserId: key.createdByUserId,
      ownerUserId: key.ownerUserId,
      usedByUserId: key.usedByUserId,
      usedAt: key.usedAt ? key.usedAt.toISOString() : null,
      createdAt: key.createdAt.toISOString(),
      updatedAt: key.updatedAt.toISOString(),
      createdByUser: includeUsers
        ? this.mapInviteUser(key.createdByUser)
        : undefined,
      ownerUser: includeUsers ? this.mapInviteUser(key.ownerUser) : undefined,
      usedByUser: includeUsers ? this.mapInviteUser(key.usedByUser) : undefined,
    };
  }

  private mapInviteQuota(
    quota: InviteQuota,
    includeUser = false,
  ): InviteQuotaView {
    return {
      id: quota.id,
      userId: quota.userId,
      available: quota.available,
      createdAt: quota.createdAt.toISOString(),
      updatedAt: quota.updatedAt.toISOString(),
      user: includeUser ? this.mapInviteUser(quota.user) : undefined,
    };
  }

  private mapInviteUser(user?: User | null): InviteUserSummary | null {
    if (!user) return null;
    return { id: user.id, username: user.username, email: user.email };
  }

  private async generateTokens(user: User): Promise<AuthResponse> {
    const payload: JwtPayload & { isAdmin: boolean } = {
      sub: user.id,
      username: user.username,
      faction: user.faction ?? undefined,
      isAdmin: user.isAdmin,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    await this.userRepo.update(user.id, { refreshToken });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        faction: user.faction ?? null,
        prestige: user.prestige,
        onboardingCompleted: user.onboardingCompleted,
        starterColonyId: user.starterColonyId,
        starterShipId: user.starterShipId,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt.toISOString(),
      },
    };
  }
}
