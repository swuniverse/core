import { QueryRunner } from 'typeorm';
import { AddTradeLicenses20261030190000 } from '../migrations/20261030190000-add-trade-licenses';

describe('AddTradeLicenses20261030190000', () => {
  const migration = new AddTradeLicenses20261030190000();
  const query = jest.fn();
  const runner = { query } as unknown as QueryRunner;

  beforeEach(() => query.mockClear());

  it('creates constrained conditions and unique player licenses', async () => {
    await migration.up(runner);
    const sql = query.mock.calls.map(([statement]) => statement).join('\n');

    expect(sql).toContain('CREATE TABLE "trade_license_conditions"');
    expect(sql).toContain('"amount" >= 1');
    expect(sql).toContain('"durationDays" >= 1 AND "durationDays" <= 365');
    expect(sql).toContain('UNIQUE ("tradePostId")');
    expect(sql).toContain('CREATE TABLE "trade_licenses"');
    expect(sql).toContain('UNIQUE ("tradePostId", "userId")');
    expect(sql).toContain('"warningSentAt" TIMESTAMP');
    expect(sql).toContain('"expiresAt" > "startsAt"');
  });

  it('drops licenses before their conditions', async () => {
    await migration.down(runner);

    expect(query.mock.calls.map(([statement]) => statement)).toEqual([
      'DROP TABLE "trade_licenses"',
      'DROP TABLE "trade_license_conditions"',
    ]);
  });
});
