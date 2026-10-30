import { QueryRunner } from 'typeorm';
import { AddFactionSelectability20261030180000 } from '../migrations/20261030180000-add-faction-selectability';

const compact = (sql: string) => sql.replace(/\s+/g, ' ').trim();

describe('AddFactionSelectability20261030180000', () => {
  it('adds selectability as true for existing and new factions', async () => {
    const queryRunner = { query: jest.fn() } as unknown as QueryRunner;

    await new AddFactionSelectability20261030180000().up(queryRunner);

    expect(compact((queryRunner.query as jest.Mock).mock.calls[0][0])).toBe(
      'ALTER TABLE "factions" ADD COLUMN "isSelectable" boolean NOT NULL DEFAULT true',
    );
  });

  it('removes selectability on rollback', async () => {
    const queryRunner = { query: jest.fn() } as unknown as QueryRunner;

    await new AddFactionSelectability20261030180000().down(queryRunner);

    expect(compact((queryRunner.query as jest.Mock).mock.calls[0][0])).toBe(
      'ALTER TABLE "factions" DROP COLUMN "isSelectable"',
    );
  });
});
