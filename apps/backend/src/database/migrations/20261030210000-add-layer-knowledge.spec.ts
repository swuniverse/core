import type { QueryRunner } from 'typeorm';
import { AddLayerKnowledge20261030210000 } from './20261030210000-add-layer-knowledge';

describe('AddLayerKnowledge20261030210000', () => {
  it('creates a cascading composite-key table and backfills every knowledge source idempotently', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    const migration = new AddLayerKnowledge20261030210000();

    await migration.up({ query } as unknown as QueryRunner);

    const sql = query.mock.calls.map(([statement]) => statement).join('\n');
    expect(sql).toContain('PRIMARY KEY ("userId", "layerId")');
    expect(sql.match(/ON DELETE CASCADE/g)).toHaveLength(2);
    expect(sql).toContain('FROM "colonies" AS colony');
    expect(sql).toContain('FROM "spacecraft" AS ship');
    expect(sql).toContain('FROM "exploration_states" AS exploration');
    expect(sql).toContain('ON CONFLICT ("userId", "layerId") DO NOTHING');
    expect(sql).toContain("'KNOWN'");
  });
});
