import {
  Injectable,
  Inject,
  Optional,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Raw, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
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
  LostPasswordDto,
  ResetPasswordDto,
  AuthFeaturesDto,
  AuthMessageDto,
  VerifyEmailDto,
  AccountDeletionMark,
  UpdateVerificationEmailDto,
} from '@swuniverse/shared';
import { MailService } from '../mail/mail.service';
import { GameStatusService } from '../game-status/game-status.service';
import { GAME_MAINTENANCE_ERROR_CODE } from '../game-status/game-status.guard';
import { AccountTokenPurpose } from './account-token.entity';
import { AccountTokenService } from './account-token.service';
import {
  ACCOUNT_ACCESS_CHECKS,
  AccountAccessCheck,
} from './account-access-check';
import { UserSettingsReader } from '../settings/user-settings-reader';
import { UserLock } from './user-lock.entity';
import { EmailBlocklistService } from '../settings/email-blocklist.service';
import { PlayerDeletionService } from '../account-deletion/player-deletion.service';

const INITIAL_INVITE_QUOTA = 2;
const PASSWORD_RESET_LIFETIME_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_RATE_LIMIT_MS = 5 * 60 * 1000;
const EMAIL_VERIFICATION_LIFETIME_MS = 72 * 60 * 60 * 1000;
const EMAIL_VERIFICATION_RATE_LIMIT_MS = 5 * 60 * 1000;
const LOST_PASSWORD_MESSAGE =
  'Falls ein Konto existiert, wurde eine E-Mail verschickt';
const INVALID_RESET_LINK_MESSAGE = 'Der Link ist ungültig oder abgelaufen';
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
    private readonly gameStatusService: GameStatusService,
    private readonly accountTokenService: AccountTokenService,
    private readonly config: ConfigService,
    private readonly userSettings: UserSettingsReader,
    @Optional()
    @Inject(ACCOUNT_ACCESS_CHECKS)
    private readonly accountAccessChecks: AccountAccessCheck[] = [],
    @Optional()
    @InjectRepository(UserLock)
    private readonly userLockRepo?: Repository<UserLock>,
    @Optional()
    private readonly playerDeletionService?: PlayerDeletionService,
    @Optional()
    private readonly emailBlocklist?: EmailBlocklistService,
  ) {}

  features(): AuthFeaturesDto {
    return {
      passwordReset: this.isPasswordResetEnabled(),
      emailVerification: this.isEmailVerificationEnabled(),
      accountDeletion: this.isAccountDeletionEnabled(),
    };
  }

  async confirmDeletion(token: string): Promise<AuthMessageDto> {
    this.assertAccountDeletionEnabled();
    const confirmed = await this.dataSource.transaction(async (manager) => {
      const accountToken = await this.accountTokenService.consume(
        token,
        AccountTokenPurpose.AccountDeletion,
        manager,
      );
      if (!accountToken) return false;
      const repository = manager.getRepository(User);
      const user = await repository.findOneBy({ id: accountToken.userId });
      if (!user || user.deletionMark !== AccountDeletionMark.Requested) return false;
      await repository.update(user.id, {
        deletionMark: AccountDeletionMark.Confirmed,
        refreshToken: null,
      });
      return true;
    });
    if (!confirmed) throw new BadRequestException(INVALID_RESET_LINK_MESSAGE);
    return { message: 'Kontolöschung bestätigt' };
  }

  async deleteUserNow(userId: number): Promise<void> {
    this.assertAccountDeletionEnabled();
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) return;
    if (user.isAdmin) throw new BadRequestException('Admins können nicht gelöscht werden');
    if (user.deletionMark === AccountDeletionMark.Forbidden) {
      throw new ForbiddenException('Account deletion has been forbidden by admin');
    }
    await this.playerDeletionService!.delete(userId);
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<AuthMessageDto> {
    this.assertEmailVerificationEnabled();
    const user = await this.dataSource.transaction(async (manager) => {
      const accountToken = await this.accountTokenService.consume(
        dto.token,
        AccountTokenPurpose.EmailVerification,
        manager,
      );
      if (!accountToken) return null;
      const repository = manager.getRepository(User);
      const verified = await repository.findOneBy({ id: accountToken.userId });
      if (!verified) return null;
      verified.emailVerifiedAt = new Date();
      await repository.save(verified);
      return verified;
    });
    if (!user) throw new BadRequestException('Der Link ist ungültig oder abgelaufen');
    void this.mailService.sendWelcomeMail(user.email, user.username);
    return { message: 'E-Mail-Adresse bestätigt' };
  }

  async resendEmailVerification(userId: number): Promise<AuthMessageDto> {
    this.assertEmailVerificationEnabled();
    const user = await this.requireUnverifiedUser(userId);
    const since = new Date(Date.now() - EMAIL_VERIFICATION_RATE_LIMIT_MS);
    if (
      !(await this.accountTokenService.hasRecentToken(
        user.id,
        AccountTokenPurpose.EmailVerification,
        since,
      ))
    ) {
      await this.sendEmailVerification(user);
    }
    return { message: 'Falls möglich, wurde eine E-Mail verschickt' };
  }

  async updateVerificationEmail(
    userId: number,
    dto: UpdateVerificationEmailDto,
  ): Promise<AuthMessageDto> {
    this.assertEmailVerificationEnabled();
    const email = dto.email.trim().toLowerCase();
    const user = await this.requireUnverifiedUser(userId);
    await this.assertEmailNotBlocked(email);
    const duplicate = await this.userRepo.findOne({
      where: { email: Raw((column) => `LOWER(${column}) = LOWER(:email)`, { email }) },
    });
    if (duplicate && duplicate.id !== user.id) {
      throw new ConflictException('E-Mail-Adresse wird bereits verwendet');
    }
    await this.userRepo.update(user.id, { email });
    user.email = email;
    await this.sendEmailVerification(user);
    return { message: 'E-Mail-Adresse aktualisiert' };
  }

  async lostPassword(dto: LostPasswordDto): Promise<AuthMessageDto> {
    this.assertPasswordResetEnabled();
    const user = await this.userRepo.findOne({
      where: [
        {
          username: Raw((column) => `LOWER(${column}) = LOWER(:login)`, {
            login: dto.login,
          }),
        },
        {
          email: Raw((column) => `LOWER(${column}) = LOWER(:login)`, {
            login: dto.login,
          }),
        },
      ],
    });
    if (!user) return { message: LOST_PASSWORD_MESSAGE };

    const rateLimitSince = new Date(Date.now() - PASSWORD_RESET_RATE_LIMIT_MS);
    if (
      await this.accountTokenService.hasRecentToken(
        user.id,
        AccountTokenPurpose.PasswordReset,
        rateLimitSince,
      )
    ) {
      return { message: LOST_PASSWORD_MESSAGE };
    }

    const { token } = await this.accountTokenService.create(
      user.id,
      AccountTokenPurpose.PasswordReset,
      PASSWORD_RESET_LIFETIME_MS,
    );
    const baseUrl = (this.config.get<string>('APP_BASE_URL') ?? '').replace(
      /\/$/,
      '',
    );
    void this.mailService.sendPasswordResetMail(
      user.email,
      user.username,
      `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`,
    );
    return { message: LOST_PASSWORD_MESSAGE };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<AuthMessageDto> {
    this.assertPasswordResetEnabled();
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const updated = await this.dataSource.transaction(async (manager) => {
      const accountToken = await this.accountTokenService.consume(
        dto.token,
        AccountTokenPurpose.PasswordReset,
        manager,
      );
      if (!accountToken) return false;
      await manager.getRepository(User).update(accountToken.userId, {
        passwordHash,
        refreshToken: null,
      });
      return true;
    });
    if (!updated) {
      throw new BadRequestException(INVALID_RESET_LINK_MESSAGE);
    }
    return { message: 'Das Passwort wurde geändert' };
  }

  private isPasswordResetEnabled(): boolean {
    return (
      this.config.get<string>('PASSWORD_RESET_ENABLED') === 'true' &&
      this.mailService.isEnabled()
    );
  }

  private assertPasswordResetEnabled(): void {
    if (!this.isPasswordResetEnabled()) throw new NotFoundException();
  }

  private isAccountDeletionEnabled(): boolean {
    return this.config.get<string>('ACCOUNT_DELETION_ENABLED') === 'true';
  }

  private assertAccountDeletionEnabled(): void {
    if (!this.isAccountDeletionEnabled()) throw new NotFoundException();
  }

  private isEmailVerificationEnabled(): boolean {
    return this.config.get<string>('EMAIL_VERIFICATION_ENABLED') === 'true';
  }

  private assertEmailVerificationEnabled(): void {
    if (!this.isEmailVerificationEnabled()) throw new NotFoundException();
  }

  private async requireUnverifiedUser(userId: number): Promise<User> {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new UnauthorizedException();
    if (user.emailVerifiedAt) {
      throw new BadRequestException('E-Mail-Adresse ist bereits bestätigt');
    }
    return user;
  }

  private async sendEmailVerification(user: User): Promise<void> {
    const { token } = await this.accountTokenService.create(
      user.id,
      AccountTokenPurpose.EmailVerification,
      EMAIL_VERIFICATION_LIFETIME_MS,
    );
    const baseUrl = (this.config.get<string>('APP_BASE_URL') ?? '').replace(/\/$/, '');
    await this.mailService.sendEmailVerificationMail(
      user.email,
      user.username,
      `${baseUrl}/verify-email?token=${encodeURIComponent(token)}`,
    );
  }

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const email = dto.email.trim().toLowerCase();
    await this.assertEmailNotBlocked(email);

    const user = await this.dataSource.transaction(async (manager) => {
      await this.acquireRegistrationLock(manager);

      const userRepo = manager.getRepository(User);
      const factionRepo = manager.getRepository(FactionEntity);
      const inviteKeyRepo = manager.getRepository(InviteKey);
      const inviteQuotaRepo = manager.getRepository(InviteQuota);

      const exists = await userRepo.findOne({
        where: [
          {
            username: Raw((col) => `LOWER(${col}) = LOWER(:username)`, {
              username: dto.username,
            }),
          },
          {
            displayName: Raw((col) => `LOWER(${col}) = LOWER(:username)`, { username: dto.username }),
          },
          {
            email: Raw((col) => `LOWER(${col}) = :email`, { email }),
          },
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
        email,
        passwordHash,
        faction: faction.key as any,
        factionId: faction.id,
        onboardingCompleted: false,
        emailVerifiedAt: this.isEmailVerificationEnabled() ? null : new Date(),
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

    if (this.isEmailVerificationEnabled() && !user.isAdmin) {
      await this.sendEmailVerification(user);
    } else {
      void this.mailService.sendWelcomeMail(user.email, user.username);
    }

    return this.generateTokens(user);
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    let user = await this.userRepo.findOne({
      where: {
        username: Raw((col) => `LOWER(${col}) = LOWER(:username)`, {
          username: dto.username,
        }),
      },
    });
    if (!user && /^\d+$/.test(dto.username)) {
      user = await this.userRepo.findOneBy({ id: Number(dto.username) });
    }
    if (!user || user.isNpc) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.assertAccountAccess(user);
    await this.assertGameAccess(user);
    const vacationEnded = user.vacationMode;
    if (vacationEnded) {
      user.vacationMode = false;
      user.vacationEndedAt = new Date();
    }
    const response = await this.generateTokens(user);
    if (vacationEnded) {
      await this.userRepo.update(user.id, {
        vacationMode: false,
        vacationEndedAt: user.vacationEndedAt,
      });
    }
    const settings = await this.userSettings.getSettings(user.id);
    return {
      ...response,
      vacationEnded,
      defaultView: settings.default_view,
    };
  }

  async refresh(refreshToken: string): Promise<AuthResponse> {
    const user = await this.userRepo.findOne({
      where: { refreshToken },
    });
    if (!user || user.isNpc) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.assertAccountAccess(user);
    await this.assertGameAccess(user);
    return this.generateTokens(user);
  }

  async logout(userId: number): Promise<void> {
    await this.userRepo.update(userId, { refreshToken: null });
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

  async listUsers(query?: string) {
    const users = await this.userRepo.find({ order: { id: 'ASC' } });
    const locks = this.userLockRepo ? await this.userLockRepo.find() : [];
    const blocked = (await this.emailBlocklist?.blockedUserIds()) ?? new Set<number>();
    const locksByUser = new Map(locks.map((lock) => [lock.userId, lock]));
    const normalizedQuery = query?.trim().toLowerCase();
    return users
      .filter(
        (user) =>
          !normalizedQuery ||
          String(user.id) === normalizedQuery ||
          user.username.toLowerCase().includes(normalizedQuery),
      )
      .map((user) => {
        const lock = locksByUser.get(user.id);
        return {
          id: user.id,
          username: user.username,
          description: user.description,
          isAdmin: user.isAdmin,
          isNpc: user.isNpc,
          permissions: user.permissions ?? [],
          faction: user.faction,
          createdAt: user.createdAt.toISOString(),
          lastActiveAt: user.lastActiveAt?.toISOString() ?? null,
          vacationMode: user.vacationMode,
          deletionMark: user.deletionMark,
          blocked: blocked.has(user.id),
          lock: lock
            ? { remainingTicks: lock.remainingTicks, reason: lock.reason }
            : null,
        };
      });
  }

  async updateUser(
    userId: number,
    input: { username: string; description: string | null },
  ) {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user?.isNpc) throw new NotFoundException('NPC account not found');
    await this.userRepo.update(userId, {
      username: input.username.trim(),
      displayName: input.username.trim(),
      description: input.description?.trim() || null,
    });
  }

  async updatePermissions(userId: number, permissions: string[]) {
    await this.userRepo.update(userId, { permissions });
  }

  async lockUser(
    userId: number,
    input: { ticks: number; reason: string },
  ): Promise<UserLock> {
    if (!Number.isInteger(input.ticks) || input.ticks < 1) {
      throw new BadRequestException('Ticks müssen mindestens 1 sein');
    }
    const reason = input.reason?.trim();
    if (!reason || reason.length > 500) {
      throw new BadRequestException('Grund muss 1 bis 500 Zeichen lang sein');
    }
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('Spieler nicht gefunden');
    if (user.isAdmin) {
      throw new BadRequestException('Admins können nicht gesperrt werden');
    }
    let lock = await this.userLockRepo?.findOne({ where: { userId } });
    lock ??= this.userLockRepo!.create({ userId });
    lock.remainingTicks = input.ticks;
    lock.reason = reason;
    await this.userRepo.update(userId, { refreshToken: null });
    return this.userLockRepo!.save(lock);
  }

  async unlockUser(userId: number): Promise<void> {
    await this.userLockRepo?.delete({ userId });
  }

  /** Blocks the email address and releases the account for deletion. */
  async blockUser(userId: number): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(User);
      const user = await repository.findOneBy({ id: userId });
      if (!user) throw new NotFoundException('Spieler nicht gefunden');
      if (user.isAdmin) {
        throw new BadRequestException('Admins können nicht blockiert werden');
      }
      if (!this.emailBlocklist) throw new Error('Email blocklist is not available');
      await this.emailBlocklist.block(manager, user.id, user.email);
      await repository.update(user.id, {
        deletionMark: AccountDeletionMark.Confirmed,
        refreshToken: null,
      });
    });
  }

  async setDeletionForbidden(
    userId: number,
    forbidden: unknown,
  ): Promise<{ deletionMark: AccountDeletionMark }> {
    if (typeof forbidden !== 'boolean') {
      throw new BadRequestException('forbidden muss true oder false sein');
    }
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('Spieler nicht gefunden');
    let deletionMark = user.deletionMark;
    if (forbidden) deletionMark = AccountDeletionMark.Forbidden;
    else if (deletionMark === AccountDeletionMark.Forbidden) {
      deletionMark = AccountDeletionMark.None;
    }
    await this.userRepo.update(user.id, { deletionMark });
    return { deletionMark };
  }

  private async assertEmailNotBlocked(email: string): Promise<void> {
    if (await this.emailBlocklist?.isBlocked(email)) {
      throw new BadRequestException('Die E-Mail-Adresse ist blockiert');
    }
  }

  private async assertAccountAccess(user: User): Promise<void> {
    if (user.deletionMark === AccountDeletionMark.Confirmed) {
      throw new ForbiddenException('Dein Spieleraccount ist zur Löschung vorgesehen');
    }
    const lock = await this.userLockRepo?.findOne({ where: { userId: user.id } });
    if (lock && lock.remainingTicks > 0) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'ACCOUNT_LOCKED',
        message: `Dein Spieleraccount ist noch für ${lock.remainingTicks} Ticks gesperrt. Begründung: ${lock.reason}`,
        remainingTicks: lock.remainingTicks,
        reason: lock.reason,
      });
    }
    for (const check of this.accountAccessChecks) {
      await check.assertAccountAccess(user);
    }
  }

  private async assertGameAccess(user: User): Promise<void> {
    if (user.isAdmin || !(await this.gameStatusService.isMaintenance())) {
      return;
    }

    const status = await this.gameStatusService.getPublicStatus();
    throw new ForbiddenException({
      code: GAME_MAINTENANCE_ERROR_CODE,
      message: status.message,
    });
  }

  private async generateTokens(user: User): Promise<AuthResponse> {
    const payload: JwtPayload & { isAdmin: boolean } = {
      sub: user.id,
      username: user.username,
      faction: user.faction ?? undefined,
      isAdmin: user.isAdmin,
      permissions: user.permissions ?? [],
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
        displayName: user.displayName ?? null,
        displayNameMarkup: user.displayNameMarkup ?? null,
        avatar: user.avatar ?? null,
        email: user.email,
        emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
        faction: user.faction ?? null,
        prestige: user.prestige,
        onboardingCompleted: user.onboardingCompleted,
        starterColonyId: user.starterColonyId,
        isAdmin: user.isAdmin,
        permissions: user.permissions ?? [],
        createdAt: user.createdAt.toISOString(),
        deletionMark: user.deletionMark,
      },
    };
  }
}
