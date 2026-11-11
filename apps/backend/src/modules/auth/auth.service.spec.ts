import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { AuthService, EMAIL_NOT_VERIFIED_ERROR_CODE } from './auth.service';

const NOW = new Date('2026-11-11T10:00:00Z');
const HOUR = 60 * 60 * 1000;

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    username: 'Tarkin',
    email: 'tarkin@galaxy.net',
    passwordHash: bcrypt.hashSync('correct-horse', 4),
    isAdmin: false,
    permissions: [],
    faction: null,
    prestige: 0,
    createdAt: NOW,
    emailVerifiedAt: null,
    emailVerificationTokenHash: null,
    emailVerificationExpiresAt: null,
    emailVerificationSentAt: null,
    ...overrides,
  };
}

function setup(
  options: {
    users?: ReturnType<typeof makeUser>[];
    existing?: boolean;
    faction?: { id: number; key: string } | null;
    userCount?: number;
  } = {},
) {
  const users = options.users ?? [];
  const faction =
    options.faction === undefined
      ? { id: 1, key: 'GALACTIC_EMPIRE' }
      : options.faction;

  const txUserRepo = {
    findOne: jest.fn(async () => (options.existing ? makeUser() : null)),
    count: jest.fn(async () => options.userCount ?? 5),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => ({ id: 42, createdAt: NOW, ...value })),
  };
  const txFactionRepo = { findOne: jest.fn(async () => faction) };
  const manager = {
    query: jest.fn(),
    getRepository: jest.fn((entity: { name: string }) =>
      entity.name === 'User' ? txUserRepo : txFactionRepo,
    ),
  };
  const dataSource = {
    transaction: jest.fn(async (fn: (m: typeof manager) => unknown) =>
      fn(manager),
    ),
  };

  const userRepo = {
    findOne: jest.fn(async ({ where }: { where: Record<string, unknown> }) => {
      return (
        users.find((u) =>
          Object.entries(where).every(([key, value]) => {
            const actual = (u as Record<string, unknown>)[key];
            if (value !== null && typeof value === 'object') {
              // TypeORM Raw(...) operator used for case-insensitive username lookup
              const params = (
                value as { objectLiteralParameters?: Record<string, string> }
              ).objectLiteralParameters;
              const expected = params?.[key];
              return (
                typeof actual === 'string' &&
                typeof expected === 'string' &&
                actual.toLowerCase() === expected.toLowerCase()
              );
            }
            return actual === value;
          }),
        ) ?? null
      );
    }),
    update: jest.fn(async () => undefined),
  };
  const jwtService = { sign: jest.fn(() => 'signed') };
  const mailService = {
    sendVerificationMail: jest.fn(async () => true),
    sendWelcomeMail: jest.fn(async () => true),
  };
  const gameStatusService = { isMaintenance: jest.fn(async () => false) };

  const service = new AuthService(
    userRepo as never,
    dataSource as never,
    jwtService as never,
    mailService as never,
    gameStatusService as never,
  );

  return { service, userRepo, txUserRepo, mailService };
}

describe('AuthService email verification', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  describe('register', () => {
    const dto = {
      username: 'Tarkin',
      email: 'tarkin@galaxy.net',
      password: 'correct-horse',
      factionId: 1,
    };

    it('creates an unverified user and returns no tokens', async () => {
      const { service, txUserRepo } = setup();

      const result = await service.register(dto);

      expect(result).toEqual({
        message: expect.any(String),
        email: dto.email,
      });
      expect(result).not.toHaveProperty('accessToken');
      const created = txUserRepo.create.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      expect(created.emailVerifiedAt).toBeNull();
      expect(created.emailVerificationTokenHash).toMatch(/^[0-9a-f]{64}$/);
      expect(created.emailVerificationExpiresAt).toEqual(
        new Date(NOW.getTime() + 24 * HOUR),
      );
    });

    it('mails the plain token whose hash is stored', async () => {
      const { service, txUserRepo, mailService } = setup();

      await service.register(dto);

      const [to, username, token] = mailService.sendVerificationMail.mock
        .calls[0] as unknown as [string, string, string];
      expect([to, username]).toEqual([dto.email, dto.username]);
      const created = txUserRepo.create.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      expect(sha256(token)).toBe(created.emailVerificationTokenHash);
    });

    it('makes the very first user an admin', async () => {
      const { service, txUserRepo } = setup({ userCount: 0 });

      await service.register(dto);

      expect(txUserRepo.create.mock.calls[0][0]).toMatchObject({
        isAdmin: true,
      });
    });

    it('does not require an invite key', async () => {
      const { service } = setup({ userCount: 10 });

      await expect(service.register(dto)).resolves.toBeDefined();
    });

    it('rejects duplicate username or email and sends no mail', async () => {
      const { service, mailService } = setup({ existing: true });

      await expect(service.register(dto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(mailService.sendVerificationMail).not.toHaveBeenCalled();
    });

    it('rejects an unknown faction', async () => {
      const { service } = setup({ faction: null });

      await expect(service.register(dto)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('login', () => {
    it('rejects an unverified user with EMAIL_NOT_VERIFIED', async () => {
      const { service } = setup({ users: [makeUser()] });

      const error = await service
        .login({ username: 'Tarkin', password: 'correct-horse' })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ForbiddenException);
      expect((error as ForbiddenException).getResponse()).toMatchObject({
        code: EMAIL_NOT_VERIFIED_ERROR_CODE,
      });
    });

    it('does not reveal verification state for a wrong password', async () => {
      const { service } = setup({ users: [makeUser()] });

      await expect(
        service.login({ username: 'Tarkin', password: 'wrong' }),
      ).rejects.toMatchObject({ status: 401 });
    });

    it('logs in a verified user', async () => {
      const { service } = setup({
        users: [makeUser({ emailVerifiedAt: NOW })],
      });

      const result = await service.login({
        username: 'Tarkin',
        password: 'correct-horse',
      });

      expect(result.accessToken).toBe('signed');
    });
  });

  describe('refresh', () => {
    it('rejects an unverified user', async () => {
      const { service } = setup({
        users: [makeUser({ refreshToken: 'r' })],
      });

      await expect(service.refresh('r')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });

  describe('verifyEmail', () => {
    const token = 'a'.repeat(64);

    it('verifies the user, clears the token and sends the welcome mail', async () => {
      const user = makeUser({
        emailVerificationTokenHash: sha256(token),
        emailVerificationExpiresAt: new Date(NOW.getTime() + HOUR),
      });
      const { service, userRepo, mailService } = setup({ users: [user] });

      await service.verifyEmail(token);

      expect(userRepo.update).toHaveBeenCalledWith(user.id, {
        emailVerifiedAt: NOW,
        emailVerificationTokenHash: null,
        emailVerificationExpiresAt: null,
      });
      expect(mailService.sendWelcomeMail).toHaveBeenCalledWith(
        user.email,
        user.username,
      );
    });

    it('rejects an unknown or already used token', async () => {
      const { service, userRepo } = setup();

      await expect(service.verifyEmail(token)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(userRepo.update).not.toHaveBeenCalled();
    });

    it('rejects an expired token', async () => {
      const user = makeUser({
        emailVerificationTokenHash: sha256(token),
        emailVerificationExpiresAt: new Date(NOW.getTime() - 1),
      });
      const { service, userRepo } = setup({ users: [user] });

      await expect(service.verifyEmail(token)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(userRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('resendVerification', () => {
    it('sends a fresh token to an unverified user', async () => {
      const user = makeUser({
        emailVerificationSentAt: new Date(NOW.getTime() - 5 * 60_000),
      });
      const { service, userRepo, mailService } = setup({ users: [user] });

      await service.resendVerification(user.email);

      expect(userRepo.update).toHaveBeenCalledWith(
        user.id,
        expect.objectContaining({
          emailVerificationTokenHash: expect.stringMatching(/^[0-9a-f]{64}$/),
          emailVerificationSentAt: NOW,
        }),
      );
      expect(mailService.sendVerificationMail).toHaveBeenCalledTimes(1);
    });

    it('respects the cooldown', async () => {
      const user = makeUser({
        emailVerificationSentAt: new Date(NOW.getTime() - 10_000),
      });
      const { service, mailService } = setup({ users: [user] });

      await service.resendVerification(user.email);

      expect(mailService.sendVerificationMail).not.toHaveBeenCalled();
    });

    it('sends nothing for verified or unknown addresses but answers identically', async () => {
      const verified = makeUser({ emailVerifiedAt: NOW });
      const { service, mailService } = setup({ users: [verified] });

      const verifiedResponse = await service.resendVerification(verified.email);
      const unknownResponse = await service.resendVerification('x@y.z');

      expect(verifiedResponse).toEqual(unknownResponse);
      expect(mailService.sendVerificationMail).not.toHaveBeenCalled();
    });
  });
});
