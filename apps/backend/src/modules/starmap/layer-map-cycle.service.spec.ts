import { LayerKnowledgeStatus } from '@swuniverse/shared';
import type { EntityManager } from 'typeorm';

jest.mock('./entities/galaxy-field.entity', () => ({
  GalaxyField: class GalaxyField {},
}));

import { LayerMapCycleService } from './layer-map-cycle.service';

function createManager(options: {
  known?: Array<{ userId: number; layerId: number }>;
  fieldCount?: number;
  exploredCount?: number;
  failDelete?: boolean;
}) {
  const knowledgeRows = options.known ?? [{ userId: 7, layerId: 3 }];
  const knowledgeRepo = {
    find: jest.fn(async () => knowledgeRows),
    findOne: jest.fn(async () => ({
      ...knowledgeRows[0],
      status: LayerKnowledgeStatus.KNOWN,
      exploredAt: null,
    })),
    update: jest.fn(async () => ({ affected: 1 })),
  };
  const fieldRepo = {
    count: jest.fn(async () => options.fieldCount ?? 2),
  };
  const explorationRepo = {
    createQueryBuilder: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn(async () => ({ count: String(options.exploredCount ?? 2) })),
    })),
    delete: jest.fn(async () => {
      if (options.failDelete) throw new Error('delete failed');
      return { affected: 2 };
    }),
  };
  const eventRepo = {
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => value),
  };
  const manager = {
    transaction: jest.fn(async (work) => work(manager)),
    getRepository: jest.fn((entity: { name: string }) => {
      if (entity.name === 'LayerKnowledge') return knowledgeRepo;
      if (entity.name === 'GalaxyField') return fieldRepo;
      if (entity.name === 'ExplorationState') return explorationRepo;
      return eventRepo;
    }),
  } as unknown as EntityManager;
  return { manager, knowledgeRepo, fieldRepo, explorationRepo, eventRepo };
}

describe('LayerMapCycleService', () => {
  it('leaves an incomplete known layer unchanged', async () => {
    const setup = createManager({ fieldCount: 3, exploredCount: 2 });
    const service = new LayerMapCycleService(setup.manager);

    expect(await service.run(new Date('2026-10-30T03:00:00Z'))).toBe(
      '0 Ebenen vollständig erkundet',
    );
    expect(setup.knowledgeRepo.update).not.toHaveBeenCalled();
    expect(setup.explorationRepo.delete).not.toHaveBeenCalled();
    expect(setup.eventRepo.save).not.toHaveBeenCalled();
  });

  it('atomically explores a complete known layer, clears fog and records one event', async () => {
    const setup = createManager({ fieldCount: 2, exploredCount: 3 });
    const service = new LayerMapCycleService(setup.manager);
    const now = new Date('2026-10-30T03:00:00Z');

    expect(await service.run(now)).toBe('1 Ebene vollständig erkundet');
    expect(setup.knowledgeRepo.findOne).toHaveBeenCalledWith({
      where: { userId: 7, layerId: 3 },
      lock: { mode: 'pessimistic_write' },
    });
    expect(setup.knowledgeRepo.update).toHaveBeenCalledWith(
      { userId: 7, layerId: 3, status: LayerKnowledgeStatus.KNOWN },
      { status: LayerKnowledgeStatus.EXPLORED, exploredAt: now },
    );
    expect(setup.explorationRepo.delete).toHaveBeenCalledWith({ userId: 7, layerId: 3 });
    expect(setup.eventRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 7, layerId: 3, completedAt: now }),
    );
  });

  it('rolls the transition back when fog removal fails', async () => {
    const setup = createManager({ failDelete: true });
    const service = new LayerMapCycleService(setup.manager);

    await expect(service.run(new Date())).rejects.toThrow('delete failed');
    expect(setup.eventRepo.save).not.toHaveBeenCalled();
  });

  it('does not publish again when a concurrent run has already explored the layer', async () => {
    const setup = createManager({});
    setup.knowledgeRepo.findOne.mockResolvedValue({
      userId: 7,
      layerId: 3,
      status: LayerKnowledgeStatus.EXPLORED,
      exploredAt: null,
    });
    const service = new LayerMapCycleService(setup.manager);

    expect(await service.run(new Date())).toBe('0 Ebenen vollständig erkundet');
    expect(setup.knowledgeRepo.update).not.toHaveBeenCalled();
    expect(setup.eventRepo.save).not.toHaveBeenCalled();
  });
});
