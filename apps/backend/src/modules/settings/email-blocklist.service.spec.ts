import { ConflictException } from '@nestjs/common';
import { EmailBlocklistService } from './email-blocklist.service';

function createService(env: Record<string, string> = { EMAIL_BLOCKLIST_PEPPER: 'pepper' }) {
  const rows: Array<{ userId: number; emailHash: string }> = [];
  const repo = {
    existsBy: jest.fn(async (where: Partial<(typeof rows)[number]>) =>
      rows.some((row) => Object.entries(where).every(([key, value]) => row[key as keyof typeof row] === value)),
    ),
    insert: jest.fn(async (row: (typeof rows)[number]) => { rows.push(row); }),
    find: jest.fn(async () => rows),
  };
  const config = { get: (key: string) => env[key] };
  const service = new EmailBlocklistService(repo as never, config as never);
  const manager = { getRepository: () => repo };
  return { service, rows, manager };
}

describe('EmailBlocklistService', () => {
  it('stores a peppered SHA-256 hash instead of the address', async () => {
    const { service, rows, manager } = createService();

    await service.block(manager as never, 7, 'Leia@Alderaan.org');

    expect(rows).toEqual([{ userId: 7, emailHash: expect.stringMatching(/^[0-9a-f]{64}$/) }]);
    expect(JSON.stringify(rows)).not.toContain('alderaan');
    expect(rows[0].emailHash).not.toBe(createService({ EMAIL_BLOCKLIST_PEPPER: 'other' }).service.hash('leia@alderaan.org'));
  });

  it('matches blocked addresses regardless of case and surrounding spaces', async () => {
    const { service, manager } = createService();
    await service.block(manager as never, 7, 'leia@alderaan.org');

    await expect(service.isBlocked('  LEIA@Alderaan.ORG ')).resolves.toBe(true);
    await expect(service.isBlocked('han@corellia.org')).resolves.toBe(false);
    await expect(service.blockedUserIds()).resolves.toEqual(new Set([7]));
  });

  it('refuses to block the same player twice', async () => {
    const { service, manager } = createService();
    await service.block(manager as never, 7, 'leia@alderaan.org');

    await expect(service.block(manager as never, 7, 'leia@alderaan.org')).rejects.toBeInstanceOf(ConflictException);
  });

  it('requires a configured pepper in production', () => {
    expect(() => createService({ NODE_ENV: 'production' })).toThrow('EMAIL_BLOCKLIST_PEPPER');
  });
});
