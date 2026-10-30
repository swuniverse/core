import { LayerKnowledgeStatus } from '@swuniverse/shared';
import type { Repository } from 'typeorm';
import { LayerKnowledge } from './entities/layer-knowledge.entity';
import { LayerKnowledgeService } from './layer-knowledge.service';

describe('LayerKnowledgeService', () => {
  let rows: Map<string, LayerKnowledge>;
  let repository: {
    findOneBy: jest.Mock;
    upsert: jest.Mock;
  };
  let service: LayerKnowledgeService;

  const key = (userId: number, layerId: number) => `${userId}:${layerId}`;

  beforeEach(() => {
    rows = new Map();
    repository = {
      findOneBy: jest.fn(async ({ userId, layerId }) =>
        rows.get(key(userId as number, layerId as number)) ?? null,
      ),
      upsert: jest.fn(async (value) => {
        const row = value as LayerKnowledge;
        const rowKey = key(row.userId, row.layerId);
        const current = rows.get(rowKey);
        rows.set(rowKey, { ...current, ...row });
        return {} as never;
      }),
    };
    service = new LayerKnowledgeService(
      repository as unknown as Repository<LayerKnowledge>,
    );
  });

  it('creates knowledge once and preserves the original known timestamp', async () => {
    const firstKnownAt = new Date('2026-01-01T00:00:00.000Z');
    const later = new Date('2026-02-01T00:00:00.000Z');

    await service.markKnown(7, 3, firstKnownAt);
    await service.markKnown(7, 3, later);

    expect(await service.get(7, 3)).toEqual(
      expect.objectContaining({
        userId: 7,
        layerId: 3,
        status: LayerKnowledgeStatus.KNOWN,
        knownAt: firstKnownAt.toISOString(),
        exploredAt: null,
      }),
    );
  });

  it('only advances knowledge from known to explored', async () => {
    const knownAt = new Date('2026-01-01T00:00:00.000Z');
    const exploredAt = new Date('2026-02-01T00:00:00.000Z');

    await service.markKnown(7, 3, knownAt);
    await service.markExplored(7, 3, exploredAt);
    await service.markKnown(7, 3, new Date('2026-03-01T00:00:00.000Z'));

    expect(await service.get(7, 3)).toEqual(
      expect.objectContaining({
        status: LayerKnowledgeStatus.EXPLORED,
        knownAt: knownAt.toISOString(),
        exploredAt: exploredAt.toISOString(),
      }),
    );
  });
});
