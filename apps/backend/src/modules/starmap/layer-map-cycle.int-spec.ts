import { DataSource } from 'typeorm';
import { LayerKnowledgeStatus } from '@swuniverse/shared';
import { User } from '../auth/user.entity';
import { AwardService } from '../awards/award.service';
import { Award } from '../awards/entities/award.entity';
import { UserAward } from '../awards/entities/user-award.entity';
import { MessagingService } from '../messaging/messaging.service';
import { PrestigeService } from '../prestige/prestige.service';
import { Layer } from './entities/layer.entity';
import { LayerKnowledge } from './entities/layer-knowledge.entity';
import { LayerExploredEvent } from './entities/layer-explored-event.entity';
import { GalaxyField } from './entities/galaxy-field.entity';
import { GalaxyFieldType } from './entities/galaxy-field-type.entity';
import { ExplorationState } from './entities/exploration-state.entity';
import { connectIntegrationDatabase, resetDatabase } from '../../testing/integration/database';
import { LayerMapCycleService } from './layer-map-cycle.service';

describe('LayerMapCycleService (Postgres)', () => {
  let database: DataSource;
  let awardService: AwardService;

  beforeAll(async () => {
    database = await connectIntegrationDatabase();
    awardService = new AwardService(
      database.getRepository(UserAward),
      { change: jest.fn() } as unknown as PrestigeService,
      { sendSystem: jest.fn() } as unknown as MessagingService,
    );
  }, 120000);

  afterAll(async () => {
    await database?.destroy();
  });

  beforeEach(async () => {
    await resetDatabase(database);
  });

  it('increments an existing award count on a later qualifying layer transition', async () => {
    const user = await database.getRepository(User).save({
      username: 'map-cycle',
      email: 'map-cycle@example.test',
      passwordHash: 'x',
    });
    await database.getRepository(Award).save({
      key: 'LAYER_EXPLORED',
      description: 'Layer explored',
      image: '/favicon.ico',
      prestige: 20,
      isNpc: false,
    });
    const layer = await database.getRepository(Layer).save({
      name: 'Test Galaxy',
      width: 1,
      height: 1,
      awardKey: 'LAYER_EXPLORED',
    });
    await database.getRepository(LayerKnowledge).save({
      userId: user.id,
      layerId: layer.id,
      status: LayerKnowledgeStatus.KNOWN,
      knownAt: new Date(),
      exploredAt: null,
    });
    const fieldType = await database
      .getRepository(GalaxyFieldType)
      .save({ key: 'EMPTY', name: 'Empty' });
    await database.getRepository(GalaxyField).save({
      layerId: layer.id,
      cx: 1,
      cy: 1,
      fieldTypeId: fieldType.id,
    });
    await database.getRepository(ExplorationState).save({
      userId: user.id,
      layerId: layer.id,
      cx: 1,
      cy: 1,
    });
    const service = new LayerMapCycleService(database.manager, awardService);

    await expect(service.run(new Date())).resolves.toBe('1 Ebene vollständig erkundet');

    const repeatedLayer = await database.getRepository(Layer).save({
      name: 'Test Galaxy 2',
      width: 1,
      height: 1,
      awardKey: 'LAYER_EXPLORED',
    });
    await database.getRepository(LayerKnowledge).save({
      userId: user.id,
      layerId: repeatedLayer.id,
      status: LayerKnowledgeStatus.KNOWN,
      knownAt: new Date(),
      exploredAt: null,
    });
    await database.getRepository(GalaxyField).save({
      layerId: repeatedLayer.id,
      cx: 1,
      cy: 1,
      fieldTypeId: fieldType.id,
    });
    await database.getRepository(ExplorationState).save({
      userId: user.id,
      layerId: repeatedLayer.id,
      cx: 1,
      cy: 1,
    });

    await expect(service.run(new Date())).resolves.toBe('1 Ebene vollständig erkundet');
    await expect(service.run(new Date())).resolves.toBe('0 Ebenen vollständig erkundet');

    await expect(
      database.getRepository(UserAward).findOneByOrFail({
        userId: user.id,
        awardKey: 'LAYER_EXPLORED',
      }),
    ).resolves.toMatchObject({ count: 2 });
    await expect(
      database.getRepository(LayerKnowledge).findOneByOrFail({
        userId: user.id,
        layerId: layer.id,
      }),
    ).resolves.toMatchObject({ status: LayerKnowledgeStatus.EXPLORED });
    expect(
      await database
        .getRepository(LayerExploredEvent)
        .countBy({ userId: user.id, layerId: layer.id }),
    ).toBe(1);
    expect(
      await database
        .getRepository(ExplorationState)
        .countBy({ userId: user.id, layerId: layer.id }),
    ).toBe(0);
  });
});
