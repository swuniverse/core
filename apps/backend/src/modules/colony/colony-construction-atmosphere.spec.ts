jest.mock('./entities/colony.entity', () => ({ Colony: class Colony {} }));
jest.mock('./entities/colony-field.entity', () => ({
  ColonyField: class ColonyField {},
}));
jest.mock('./entities/colony-storage.entity', () => ({
  ColonyStorage: class ColonyStorage {},
}));

import { BadRequestException } from '@nestjs/common';
import { ColonyConstructionService } from './colony-construction.service';

const HOUSING_ID = 11010100;
const MOON_CLASS_ID = 90120;
const EARTH_CLASS_ID = 90010;

function setup(classId: number, hasDome = false) {
  const field = {
    id: 1,
    fieldIndex: 5,
    fieldType: 649,
    terrainTileId: 'G649',
    buildingId: null,
    isBuilding: false,
    hasDome,
    terraformingId: null,
  };
  const colony = {
    id: 1,
    fields: [field],
    celestialObject: { classId },
    stats: null,
  };
  const colonyRepo = {
    findOne: jest.fn().mockImplementation(({ relations, lock }) =>
      Promise.resolve(
        lock
          ? { id: 1 }
          : {
              ...colony,
              // Ohne die Relation ist die Planetenklasse unbekannt.
              celestialObject: relations.includes('celestialObject')
                ? colony.celestialObject
                : undefined,
            },
      ),
    ),
    save: jest.fn(),
  };
  const manager = { getRepository: () => colonyRepo };
  const dataSource = {
    transaction: (fn: (m: unknown) => unknown) => fn(manager),
  };
  const gameData = {
    getBuilding: () => ({
      id: HOUSING_ID,
      requiresAtmosphere: true,
      allowedFieldTypes: ['standard'],
      researchId: null,
      costs: { buildTime: 60 },
    }),
    getCategoriesForTerrainTile: () => ['standard'],
    isCategoryOpenToAnyBuilding: () => false,
    getFieldBuildRuleForFieldTypes: () => undefined,
  };
  const service = new ColonyConstructionService(
    colonyRepo as never,
    {} as never,
    {} as never,
    gameData as never,
    {} as never,
    {} as never,
    {} as never,
    { prepareBuildJob: jest.fn() } as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    undefined,
    dataSource as never,
  );
  return { service, colonyRepo };
}

describe('ColonyConstructionService atmosphere check', () => {
  it('rejects housing on a planet without atmosphere', async () => {
    const { service } = setup(MOON_CLASS_ID);
    await expect(service.build(1, 1, 5, HOUSING_ID)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('allows housing on a domed field of a planet without atmosphere', async () => {
    const { service } = setup(MOON_CLASS_ID, true);
    // Weiter als bis zur Atmosphaeren-Pruefung: spaetere (nicht gemockte)
    // Schritte duerfen scheitern, aber nicht mit der Atmosphaeren-Meldung.
    await expect(service.build(1, 1, 5, HOUSING_ID)).rejects.not.toThrow(
      /requires an atmosphere/,
    );
  });

  it('does not block housing on a planet with atmosphere', async () => {
    const { service } = setup(EARTH_CLASS_ID);
    await expect(service.build(1, 1, 5, HOUSING_ID)).rejects.not.toThrow(
      /requires an atmosphere/,
    );
  });
});
