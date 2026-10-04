jest.mock('../auth/user.entity', () => ({ User: class User {} }));
jest.mock('./entities/colony.entity', () => ({ Colony: class Colony {} }));
jest.mock('./entities/colony-field.entity', () => ({ ColonyField: class ColonyField {} }));
jest.mock('./entities/colony-stats.entity', () => ({ ColonyStats: class ColonyStats {} }));
jest.mock('./entities/crew.entity', () => ({ Crew: class Crew {} }));
jest.mock('./entities/crew-assignment.entity', () => ({ CrewAssignment: class CrewAssignment {} }));
jest.mock('./entities/colony-storage.entity', () => ({ ColonyStorage: class ColonyStorage {} }));
jest.mock('./entities/colony-fabrication-queue.entity', () => ({ ColonyFabricationQueue: class A {} }));
jest.mock('./entities/colony-crew-training-queue.entity', () => ({ ColonyCrewTrainingQueue: class B {} }));
jest.mock('./entities/colony-ship-build-queue.entity', () => ({ ColonyShipBuildQueue: class C {} }));
jest.mock('./entities/colony-orbit-assignment.entity', () => ({ ColonyOrbitAssignment: class D {} }));
jest.mock('./colony-event.service', () => ({ ColonyEventService: class E {} }));
jest.mock('./entities/colony-event.entity', () => ({
  ColonyEventSeverity: { WARNING: 'WARNING' },
  ColonyEventType: { COLONY_ABANDONED: 'COLONY_ABANDONED' },
}));
jest.mock('../starmap/entities/celestial-object.entity', () => ({
  CelestialObjectType: { PLANET: 1, MOON: 2, ASTEROID: 3 },
}));

import { ColonyAbandonmentService } from './colony-abandonment.service';
import { CelestialObjectType } from '../starmap/entities/celestial-object.entity';
import { getMappedStuClassIds } from '../starmap/generator/swu-stu-class-mapping';

function setup(object: Record<string, unknown>) {
  const queries: string[] = [];
  const manager = {
    query: jest.fn(async (sql: string) => {
      queries.push(sql);
      return [];
    }),
    save: jest.fn(async (o: unknown) => o),
    transaction: jest.fn(async (fn: (m: unknown) => unknown) => fn(manager)),
  };
  const colony = {
    id: 5,
    name: 'Testkolonie',
    userId: 1,
    isAbandoned: false,
    fields: [],
    changeable: null,
    celestialObject: object,
  };
  const colonyRepo = { findOne: jest.fn(async () => colony), save: jest.fn(), manager };
  const service = new ColonyAbandonmentService(
    colonyRepo as never,
    { save: jest.fn() } as never,
    {} as never,
    { delete: jest.fn() } as never,
    { delete: jest.fn() } as never,
    { delete: jest.fn() } as never,
    { delete: jest.fn() } as never,
    { find: jest.fn(async () => []), delete: jest.fn() } as never,
    { delete: jest.fn() } as never,
    { findOneBy: jest.fn(async () => ({ id: 1, starterColonyId: null })) } as never,
    { createActionEvent: jest.fn() } as never,
  );
  return { service, colony, colonyRepo, manager, queries };
}

describe('giveUpColony on a still-STU planet/moon', () => {
  const stuClassId = getMappedStuClassIds()[0];

  it('purges the colony and converts the body to SWU instead of leaving ruins', async () => {
    const object = {
      id: 9,
      objectType: CelestialObjectType.PLANET,
      classId: stuClassId,
      originalClassId: null,
      name: 'Coruscant',
    };
    const { service, colonyRepo, manager, queries } = setup(object);

    await expect(service.giveUpColony(5, 1, 'Testkolonie')).resolves.toEqual({
      abandoned: true,
      colonyId: 5,
    });

    expect(queries.some((q) => q.startsWith('DELETE FROM "colonies"'))).toBe(true);
    expect(object.originalClassId).toBe(stuClassId);
    expect(object.classId).not.toBe(stuClassId);
    expect(manager.save).toHaveBeenCalledWith(object);
    expect(colonyRepo.save).not.toHaveBeenCalled();
  });

  it('keeps ruins for bodies that are already SWU', async () => {
    const object = {
      id: 9,
      objectType: CelestialObjectType.PLANET,
      classId: 90010,
      originalClassId: stuClassId,
      name: 'Coruscant',
    };
    const { service, colony, colonyRepo, queries } = setup(object);

    await service.giveUpColony(5, 1, 'Testkolonie');

    expect(queries).toHaveLength(0);
    expect(colony.isAbandoned).toBe(true);
    expect(colonyRepo.save).toHaveBeenCalled();
  });
});
