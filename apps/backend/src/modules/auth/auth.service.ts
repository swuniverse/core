import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Raw, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { User } from './user.entity';
import { FactionEntity } from '../faction/entities/faction.entity';
import {
  RegisterDto,
  LoginDto,
  AuthResponse,
  JwtPayload,
  RegisterResponse,
} from '@swuniverse/shared';
import { MailService } from '../mail/mail.service';
import { GameStatusService } from '../game-status/game-status.service';
import { GAME_MAINTENANCE_ERROR_CODE } from '../game-status/game-status.guard';

const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const EMAIL_VERIFICATION_RESEND_COOLDOWN_MS = 60 * 1000;
export const EMAIL_NOT_VERIFIED_ERROR_CODE = 'EMAIL_NOT_VERIFIED';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly gameStatusService: GameStatusService,
  ) {}

  async register(dto: RegisterDto): Promise<RegisterResponse> {
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const verification = this.createVerificationToken();

    const user = await this.dataSource.transaction(async (manager) => {
      await this.acquireRegistrationLock(manager);

      const userRepo = manager.getRepository(User);
      const factionRepo = manager.getRepository(FactionEntity);

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

      return userRepo.save(
        userRepo.create({
          username: dto.username,
          email: dto.email,
          passwordHash,
          faction: faction.key as any,
          factionId: faction.id,
          onboardingCompleted: false,
          isAdmin: userCount === 0,
          emailVerifiedAt: null,
          emailVerificationTokenHash: verification.hash,
          emailVerificationExpiresAt: verification.expiresAt,
          emailVerificationSentAt: new Date(),
        }),
      );
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

    const user = await this.userRepo.findOne({ where: { email } });
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

    this.assertEmailVerified(user);
    await this.assertGameAccess(user);
    return this.generateTokens(user);
  }

  async refresh(refreshToken: string): Promise<AuthResponse> {
    const user = await this.userRepo.findOne({
      where: { refreshToken },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    this.assertEmailVerified(user);
    await this.assertGameAccess(user);
    return this.generateTokens(user);
  }

  async getProfile(userId: number) {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new UnauthorizedException();
    const {
      passwordHash,
      refreshToken,
      notes,
      emailVerificationTokenHash,
      emailVerificationExpiresAt,
      emailVerificationSentAt,
      ...profile
    } = user;
    return profile;
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

  private assertEmailVerified(user: User): void {
    if (user.emailVerifiedAt) return;

    throw new ForbiddenException({
      code: EMAIL_NOT_VERIFIED_ERROR_CODE,
      message: 'Please confirm your email address before logging in',
    });
  }

  async listUsers() {
    const users = await this.userRepo.find({
      select: ['id', 'username', 'isAdmin', 'permissions'],
      order: { username: 'ASC' },
    });
    return users.map((u) => ({
      id: u.id,
      username: u.username,
      isAdmin: u.isAdmin,
      permissions: u.permissions ?? [],
    }));
  }

  async updatePermissions(userId: number, permissions: string[]) {
    await this.userRepo.update(userId, { permissions });
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
        avatar: user.avatar ?? null,
        email: user.email,
        faction: user.faction ?? null,
        prestige: user.prestige,
        onboardingCompleted: user.onboardingCompleted,
        starterColonyId: user.starterColonyId,
        isAdmin: user.isAdmin,
        permissions: user.permissions ?? [],
        createdAt: user.createdAt.toISOString(),
      },
    };
  }
}
