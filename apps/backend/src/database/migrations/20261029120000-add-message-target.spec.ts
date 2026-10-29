import { QueryRunner } from 'typeorm';
import { AddMessageTarget20261029120000 } from './20261029120000-add-message-target';

describe('AddMessageTarget20261029120000', () => {
  it('adds, backfills, and removes message target columns', async () => {
    const existing = new Set<string>();
    const queryRunner = {
      hasColumn: jest.fn(async (_table: string, column: string) => existing.has(column)),
      addColumn: jest.fn(async (_table: string, column: { name: string }) => {
        existing.add(column.name);
      }),
      dropColumn: jest.fn(async (_table: string, column: string) => {
        existing.delete(column);
      }),
      query: jest.fn().mockResolvedValue(undefined),
    } as unknown as QueryRunner;
    const migration = new AddMessageTarget20261029120000();

    await migration.up(queryRunner);

    expect(queryRunner.addColumn).toHaveBeenCalledTimes(2);
    expect(queryRunner.query).toHaveBeenCalledWith(
      expect.stringContaining('"targetKind" = \'COLONY\''),
    );

    await migration.down(queryRunner);

    expect(queryRunner.dropColumn).toHaveBeenNthCalledWith(1, 'messages', 'targetId');
    expect(queryRunner.dropColumn).toHaveBeenNthCalledWith(2, 'messages', 'targetKind');
  });
});
