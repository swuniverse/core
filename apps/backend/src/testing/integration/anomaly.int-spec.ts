import { DataSource } from 'typeorm';
import { connectIntegrationDatabase, resetDatabase } from './database';

describe('persistent anomalies', () => {
  let source: DataSource;

  beforeAll(async () => {
    source = await connectIntegrationDatabase();
  });

  beforeEach(async () => resetDatabase(source));
  afterAll(async () => source?.destroy());

  it('persists a locationless root and a located child with type and JSON data', async () => {
    const types = source.getRepository('AnomalyType');
    const anomalies = source.getRepository('Anomaly');
    const layer = await source
      .getRepository('Layer')
      .save({ name: 'Test', width: 1, height: 1 });
    const fieldType = await source
      .getRepository('GalaxyFieldType')
      .findOneByOrFail({});
    const field = await source.getRepository('GalaxyField').save({
      layerId: layer.id,
      cx: 1,
      cy: 1,
      fieldTypeId: fieldType.id,
    });
    const location = await source
      .getRepository('SpaceLocation')
      .findOneByOrFail({ galaxyFieldId: field.id });
    const type = await types.save({ key: 'TEST' });
    const root = await anomalies.save({
      typeId: type.id,
      locationId: null,
      parentId: null,
      remainingTicks: 2,
      data: { nested: { value: 3 } },
    });
    const child = await anomalies.save({
      typeId: type.id,
      locationId: location.id,
      parentId: root.id,
      remainingTicks: 1,
      data: { list: [1, 2] },
    });

    const loaded = await anomalies.findOneOrFail({
      where: { id: root.id },
      relations: [
        'type',
        'location',
        'children',
        'children.location',
        'children.parent',
      ],
    });
    expect(loaded).toMatchObject({
      location: null,
      remainingTicks: 2,
      data: { nested: { value: 3 } },
      type: { id: type.id, key: 'TEST' },
      children: [
        {
          id: child.id,
          location: { id: location.id },
          parent: { id: root.id },
          data: { list: [1, 2] },
        },
      ],
    });
  });
});
