import type { QueryRunner } from 'typeorm';
import { AddLayerAwardKey20261105130000 } from './20261105130000-add-layer-award-key';

describe('AddLayerAwardKey20261105130000', () => {
  it('adds a nullable configured award key to layers and can remove it', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    const migration = new AddLayerAwardKey20261105130000();
    const runner = { query } as unknown as QueryRunner;

    await migration.up(runner);
    await migration.down(runner);

    expect(query.mock.calls).toEqual([
      ['ALTER TABLE "layers" ADD COLUMN "awardKey" varchar(64) NULL'],
      ['ALTER TABLE "layers" DROP COLUMN "awardKey"'],
    ]);
  });
});
