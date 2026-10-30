import { DataSource } from 'typeorm';
import {
  connectIntegrationDatabase,
  createUser,
  resetDatabase,
} from '../../testing/integration/database';
import { Crew, CrewType } from '../colony/entities/crew.entity';
import { CrewAssignment } from '../colony/entities/crew-assignment.entity';
import { EscapePod, EscapePodLaunchReason } from './entities/escape-pod.entity';
import { GalaxyField } from '../starmap/entities/galaxy-field.entity';
import { GalaxyFieldType } from '../starmap/entities/galaxy-field-type.entity';
import { Layer } from '../starmap/entities/layer.entity';
import { SpaceLocation } from '../starmap/entities/space-location.entity';

describe('crew assignment location integrity', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = await connectIntegrationDatabase();
  });
  afterAll(() => dataSource.destroy());
  beforeEach(() => resetDatabase(dataSource));

  async function podAndCrew() {
    const user = await createUser(dataSource);
    const save = async <T extends { id: number }>(
      entity: new () => T,
      value: Record<string, unknown>,
    ): Promise<T> =>
      (await dataSource.getRepository(entity).save(value as never)) as unknown as T;
    const layer = await save(Layer, { name: 'L', width: 5, height: 5 });
    const type = await save(GalaxyFieldType, { key: 'empty', name: 'Leer' });
    const field = await save(GalaxyField, {
      layerId: layer.id,
      cx: 1,
      cy: 1,
      fieldTypeId: type.id,
    });
    const location = await save(SpaceLocation, {
      kind: 'GALAXY_FIELD',
      galaxyFieldId: field.id,
    });
    const pod = await dataSource.getRepository(EscapePod).save(
      dataSource.getRepository(EscapePod).create({
        locationId: location.id,
        originSpacecraftId: 1,
        originShipName: 'X',
        originShipClassId: 1,
        originFaction: null,
        presentationKey: 'REBEL_ESCAPE_PODS',
        launchReason: EscapePodLaunchReason.COMBAT_DESTRUCTION,
      }),
    );
    const crew = await dataSource.getRepository(Crew).save(
      dataSource.getRepository(Crew).create({ userId: user.id, name: 'A', type: CrewType.CREWMAN }),
    );
    return { user, pod, crew };
  }

  it('accepts exactly one location', async () => {
    const { user, pod, crew } = await podAndCrew();
    await expect(
      dataSource.getRepository(CrewAssignment).insert({
        crewId: crew.id,
        userId: user.id,
        colonyId: null,
        spacecraftId: null,
        escapePodId: pod.id,
        slot: null,
      }),
    ).resolves.toBeDefined();
  });

  it('rejects an assignment without a location', async () => {
    const { user, crew } = await podAndCrew();
    await expect(
      dataSource.getRepository(CrewAssignment).insert({
        crewId: crew.id,
        userId: user.id,
        colonyId: null,
        spacecraftId: null,
        escapePodId: null,
        slot: null,
      }),
    ).rejects.toThrow(/CHK_crew_assignments_single_location/);
  });

  it('rejects an assignment with two locations', async () => {
    const { user, pod, crew } = await podAndCrew();
    await expect(
      dataSource.getRepository(CrewAssignment).insert({
        crewId: crew.id,
        userId: user.id,
        colonyId: 1,
        spacecraftId: null,
        escapePodId: pod.id,
        slot: null,
      }),
    ).rejects.toThrow();
  });
});
