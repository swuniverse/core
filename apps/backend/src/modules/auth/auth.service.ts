import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';
import { FactionEntity } from '../faction/entities/faction.entity';
import {
  RegisterDto,
  LoginDto,
  AuthResponse,
  JwtPayload,
} from '@swuniverse/shared';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(FactionEntity)
    private readonly factionRepo: Repository<FactionEntity>,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const exists = await this.userRepo.findOne({
      where: [{ username: dto.username }, { email: dto.email }],
    });
    if (exists) {
      throw new ConflictException('Username or email already taken');
    }

    const faction = await this.factionRepo.findOne({
      where: { id: dto.factionId },
    });
    if (!faction) {
      throw new BadRequestException('Invalid faction');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const userCount = await this.userRepo.count();
    const user = this.userRepo.create({
      username: dto.username,
      email: dto.email,
      passwordHash,
      faction: faction.key as any,
      factionId: faction.id,
      onboardingCompleted: true,
      isAdmin: userCount === 0,
    });
    await this.userRepo.save(user);

    return this.generateTokens(user);
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.userRepo.findOne({
      where: { username: dto.username },
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
