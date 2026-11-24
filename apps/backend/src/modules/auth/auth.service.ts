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
import { lockJoinableFaction } from '../faction/faction.service';
import {
  RegisterDto,
  LoginDto,
  AuthResponse,
  JwtPayload,
  LostPasswordDto,
  ResetPasswordDto,
  AuthFeaturesDto,
  AuthMessageDto,
  AccountDeletionMark,
  RegisterResponse,
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
import { Permission } from './permissions';
import { EmailBlocklistService } from '../settings/email-blocklist.service';
import { PlayerDeletionService } from '../account-deletion/player-deletion.service';

const PASSWORD_RESET_LIFETIME_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_RATE_LIMIT_MS = 5 * 60 * 1000;
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const EMAIL_VERIFICATION_RESEND_COOLDOWN_MS = 60 * 1000;
const LOST_PASSWORD_MESSAGE =
  'Falls ein Konto existiert, wurde eine E-Mail verschickt';
const INVALID_RESET_LINK_MESSAGE = 'Der Link ist ungültig oder abgelaufen';
export { EMAIL_NOT_VERIFIED_ERROR_CODE } from './email-verification-access-check';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
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
      passwordReset: true,
      emailVerification: true,
      accountDeletion: true,
    };
  }

  async confirmDeletion(token: string): Promise<AuthMessageDto> {
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
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) return;
    if (user.isAdmin) throw new BadRequestException('Admins können nicht gelöscht werden');
    if (user.deletionMark === AccountDeletionMark.Forbidden) {
      throw new ForbiddenException('Account deletion has been forbidden by admin');
    }
    await this.playerDeletionService!.delete(userId);
  }

  async lostPassword(dto: LostPasswordDto): Promise<AuthMessageDto> {
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

  async register(dto: RegisterDto): Promise<RegisterResponse> {
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const email = dto.email.trim().toLowerCase();
    await this.assertEmailNotBlocked(email);
    const verification = this.createVerificationToken();

    const user = await this.dataSource.transaction(async (manager) => {
      await this.acquireRegistrationLock(manager);

      const userRepo = manager.getRepository(User);

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

      const faction = await lockJoinableFaction(manager, { id: dto.factionId });

      const userCount = await userRepo.count();

      const createdUser = userRepo.create({
        username: dto.username,
        email,
        passwordHash,
        faction: faction.key as any,
        factionId: faction.id,
        onboardingCompleted: false,
        isAdmin: userCount === 0,
        emailVerifiedAt: null,
        emailVerificationTokenHash: verification.hash,
        emailVerificationExpiresAt: verification.expiresAt,
        emailVerificationSentAt: new Date(),
      });
      return userRepo.save(createdUser);
    });

    void this.mailService.sendVerificationMail(
      user.email,
      user.username,
      verification.token,
    );

    return {
      message: 'Please confirm your email address to activate your account',
      email: user.email,
    };
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    const user = await this.userRepo.findOne({
      where: { emailVerificationTokenHash: this.hashVerificationToken(token) },
    });
    if (!user) {
      throw new BadRequestException(
        'Verification link is invalid or already used',
      );
    }

    if (
      !user.emailVerificationExpiresAt ||
      user.emailVerificationExpiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException('Verification link has expired');
    }

    await this.userRepo.update(user.id, {
      emailVerifiedAt: new Date(),
      emailVerificationTokenHash: null,
      emailVerificationExpiresAt: null,
    });

    void this.mailService.sendWelcomeMail(user.email, user.username);

    return { message: 'Email address confirmed' };
  }

  async resendVerification(email: string): Promise<{ message: string }> {
    const response = {
      message:
        'If an unconfirmed account exists for this address, a new confirmation email was sent',
    };

    const user = await this.userRepo.findOne({
      where: {
        email: Raw((column) => `LOWER(${column}) = :email`, {
          email: email.trim().toLowerCase(),
        }),
      },
    });
    if (!user || user.emailVerifiedAt) {
      return response;
    }

    const lastSentAt = user.emailVerificationSentAt?.getTime() ?? 0;
    if (Date.now() - lastSentAt < EMAIL_VERIFICATION_RESEND_COOLDOWN_MS) {
      return response;
    }

    const verification = this.createVerificationToken();
    await this.userRepo.update(user.id, {
      emailVerificationTokenHash: verification.hash,
      emailVerificationExpiresAt: verification.expiresAt,
      emailVerificationSentAt: new Date(),
    });

    void this.mailService.sendVerificationMail(
      user.email,
      user.username,
      verification.token,
    );

    return response;
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
    const {
      passwordHash,
      refreshToken,
      emailVerificationTokenHash,
      emailVerificationExpiresAt,
      emailVerificationSentAt,
      ...profile
    } = user;
    return {
      ...profile,
      hasStationsNavigation: await this.hasStationsNavigation(user),
    };
  }

  /**
   * STU GameTwigRenderer::hasStationsNavigation: NPC, station research award
   * (Raumkonstrukt, sc-AUD-28) or crew on a foreign station.
   */
  private async hasStationsNavigation(user: Pick<User, 'id' | 'isNpc'>): Promise<boolean> {
    if (user.isNpc) return true;
    const [row] = (await this.dataSource.query(
      `SELECT (
         EXISTS (SELECT 1 FROM user_awards WHERE "userId" = $1 AND "awardKey" = 'RESEARCH_STATIONS')
         OR EXISTS (
           SELECT 1 FROM crew_assignments crew
           JOIN spacecraft station ON station.id = crew."spacecraftId"
           WHERE crew."userId" = $1 AND station.kind = 'STATION' AND station."userId" <> $1
         )
       ) AS visible`,
      [user.id],
    )) as Array<{ visible: boolean }>;
    return row?.visible === true;
  }

  private async acquireRegistrationLock(manager: EntityManager): Promise<void> {
    await manager.query(
      "SELECT pg_advisory_xact_lock(hashtext('swu_auth_register'))",
    );
  }

  private createVerificationToken(): {
    token: string;
    hash: string;
    expiresAt: Date;
  } {
    const token = randomBytes(32).toString('hex');
    return {
      token,
      hash: this.hashVerificationToken(token),
      expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
    };
  }

  private hashVerificationToken(token: string): string {
    return createHash('sha256').update(token.trim()).digest('hex');
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
    const known: string[] = Object.values(Permission);
    if (
      !Array.isArray(permissions) ||
      permissions.some((permission) => !known.includes(permission))
    ) {
      throw new BadRequestException('Unbekannte Berechtigung');
    }
    await this.userRepo.update(userId, { permissions: [...new Set(permissions)] });
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
