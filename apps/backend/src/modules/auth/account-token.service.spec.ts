import { createHash } from 'node:crypto';
import { AccountTokenPurpose } from './account-token.entity';
import { AccountTokenService } from './account-token.service';

describe('AccountTokenService', () => {
  const rows: any[] = [];
  const repository: any = {
    manager: { transaction: jest.fn((work) => work(repository.manager)) },
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => {
      const saved = { id: rows.length + 1, createdAt: new Date(), ...value };
      rows.push(saved);
      return saved;
    }),
    update: jest.fn(async (where, values) => {
      rows
        .filter(
          (row) =>
            row.userId === where.userId &&
            row.purpose === where.purpose &&
            row.consumedAt === null,
        )
        .forEach((row) => Object.assign(row, values));
    }),
    findOne: jest.fn(
      async ({ where }) =>
        rows.find((row) => row.tokenHash === where.tokenHash) ?? null,
    ),
    existsBy: jest.fn(async () => false),
  };
  repository.manager.getRepository = jest.fn(() => repository);
  repository.manager.query = jest.fn(async () => []);

  beforeEach(() => {
    rows.length = 0;
    jest.clearAllMocks();
  });

  it('stores only a SHA-256 hash and invalidates earlier tokens of the same purpose', async () => {
    const service = new AccountTokenService(repository as never);
    const first = await service.create(
      7,
      AccountTokenPurpose.PasswordReset,
      24 * 60 * 60 * 1000,
    );
    const second = await service.create(
      7,
      AccountTokenPurpose.PasswordReset,
      24 * 60 * 60 * 1000,
    );

    expect(Buffer.from(first.token, 'base64url')).toHaveLength(32);
    expect(rows[0].tokenHash).toBe(
      createHash('sha256').update(first.token).digest('hex'),
    );
    expect(rows[0].tokenHash).not.toContain(first.token);
    expect(rows[0].consumedAt).toBeInstanceOf(Date);
    expect(rows[1].tokenHash).toBe(
      createHash('sha256').update(second.token).digest('hex'),
    );
  });

  it('can consume a valid token exactly once and rejects expired tokens', async () => {
    const service = new AccountTokenService(repository as never);
    const active = await service.create(
      7,
      AccountTokenPurpose.PasswordReset,
      60_000,
    );
    await expect(
      service.consume(active.token, AccountTokenPurpose.PasswordReset),
    ).resolves.toMatchObject({ userId: 7 });
    await expect(
      service.consume(active.token, AccountTokenPurpose.PasswordReset),
    ).resolves.toBeNull();

    const expired = await service.create(
      8,
      AccountTokenPurpose.PasswordReset,
      -1,
    );
    await expect(
      service.consume(expired.token, AccountTokenPurpose.PasswordReset),
    ).resolves.toBeNull();
  });
});
