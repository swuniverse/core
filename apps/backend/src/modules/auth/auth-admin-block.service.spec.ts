import { BadRequestException, ConflictException } from '@nestjs/common';
import { AccountDeletionMark, Faction } from '@swuniverse/shared';
import { EmailBlocklistService } from '../settings/email-blocklist.service';
import { AuthService } from './auth.service';

function createService() {
  const users = [
    { id: 1, username: 'Admin', email: 'admin@swu.test', isAdmin: true, refreshToken: 'admin', deletionMark: 0 },
    { id: 2, username: 'Leia', email: 'leia@alderaan.org', isAdmin: false, refreshToken: 'player', deletionMark: 0 },
  ];
  const userRepo = {
    findOneBy: jest.fn(async ({ id }) => users.find((user) => user.id === id) ?? null),
    update: jest.fn(async (id, values) => Object.assign(users.find((user) => user.id === id) ?? {}, values)),
  };
  const blocked: Array<{ userId: number; emailHash: string }> = [];
  const blockedRepo = {
    existsBy: jest.fn(async (where: Record<string, unknown>) =>
      blocked.some((row) => Object.entries(where).every(([key, value]) => row[key as keyof typeof row] === value)),
    ),
    insert: jest.fn(async (row: (typeof blocked)[number]) => { blocked.push(row); }),
  };
  const manager = {
    getRepository: (entity: { name: string }) => entity.name === 'User' ? userRepo : blockedRepo,
  };
  const dataSource = { transaction: jest.fn(async (work) => work(manager)) };
  const blocklist = new EmailBlocklistService(
    blockedRepo as never,
    { get: (key: string) => key === 'EMAIL_BLOCKLIST_PEPPER' ? 'pepper' : undefined } as never,
  );
  const service = new AuthService(
    userRepo as never, dataSource as never, {} as never,
    {} as never, {} as never, {} as never, { get: jest.fn() } as never,
    {} as never, [], undefined, undefined, blocklist,
  );
  return { service, users, blocked, dataSource };
}

describe('admin player blocking', () => {
  it('blocks the email hash, confirms deletion and revokes the refresh token', async () => {
    const { service, users, blocked } = createService();

    await service.blockUser(2);

    expect(blocked).toEqual([{ userId: 2, emailHash: expect.stringMatching(/^[0-9a-f]{64}$/) }]);
    expect(blocked[0].emailHash).not.toContain('leia');
    expect(users[1]).toMatchObject({ deletionMark: AccountDeletionMark.Confirmed, refreshToken: null });
  });

  it('rejects blocking twice and blocking admins', async () => {
    const { service } = createService();
    await service.blockUser(2);

    await expect(service.blockUser(2)).rejects.toThrow(new ConflictException('Dieser Spieler ist bereits blockiert'));
    await expect(service.blockUser(1)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuses registration with a blocked address in any letter case', async () => {
    const { service, dataSource } = createService();
    await service.blockUser(2);

    await expect(
      service.register({
        username: 'Leia2',
        email: ' LEIA@Alderaan.ORG ',
        password: 'secret-password',
        faction: Faction.REBEL_ALLIANCE,
        factionId: 1,
      } as never),
    ).rejects.toThrow(new BadRequestException('Die E-Mail-Adresse ist blockiert'));
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
  });

  it('sets and lifts the deletion ban', async () => {
    const { service, users } = createService();

    await expect(service.setDeletionForbidden(2, true)).resolves.toEqual({ deletionMark: AccountDeletionMark.Forbidden });
    expect(users[1].deletionMark).toBe(AccountDeletionMark.Forbidden);
    await expect(service.setDeletionForbidden(2, false)).resolves.toEqual({ deletionMark: AccountDeletionMark.None });
    await expect(service.setDeletionForbidden(2, 'yes')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('keeps other deletion marks when the ban is lifted', async () => {
    const { service, users } = createService();
    users[1].deletionMark = AccountDeletionMark.Requested;

    await expect(service.setDeletionForbidden(2, false)).resolves.toEqual({ deletionMark: AccountDeletionMark.Requested });
  });
});
