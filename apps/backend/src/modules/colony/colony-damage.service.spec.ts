jest.mock('./entities/colony.entity', () => ({ Colony: class Colony {} }));
jest.mock('./entities/colony-field.entity', () => ({
  ColonyField: class ColonyField {},
}));

import { ColonyDamageService } from './colony-damage.service';

function createService() {
  const gameData = {
    getBuildingFunctions: jest.fn((buildingId: number) => {
      if (buildingId === 100030100) return [26];
      if (buildingId === 100010100) return [24];
      return [];
    }),
  };
  return { service: new ColonyDamageService(gameData as any), gameData };
}

describe('ColonyDamageService', () => {
  it('prefers active defense fields as damage targets', () => {
    const { service } = createService();
    const colony = {
      fields: [
        { fieldIndex: 1, buildingId: 400, isBuilding: false, isActive: true },
        {
          fieldIndex: 2,
          buildingId: 100030100,
          isBuilding: false,
          isActive: true,
        },
      ],
    } as any;

    expect(service.selectDamageTargets(colony)[0]).toMatchObject({
      fieldIndex: 2,
    });
  });

  it('reduces integrity when damage is non-lethal', () => {
    const { service } = createService();
    const field = {
      fieldIndex: 2,
      buildingId: 100030100,
      integrity: 1000,
      maxIntegrity: 1000,
      isActive: true,
    } as any;

    const result = service.damageField(field, 100);

    expect(field.integrity).toBe(900);
    expect(field.isActive).toBe(true);
    expect(result.status).toBe('DAMAGED');
  });

  it('disables highly damaged fields', () => {
    const { service } = createService();
    const field = {
      fieldIndex: 2,
      buildingId: 100030100,
      integrity: 550,
      maxIntegrity: 1000,
      isActive: true,
    } as any;

    const result = service.damageField(field, 100);

    expect(field.integrity).toBe(450);
    expect(field.isActive).toBe(false);
    expect(result.status).toBe('DISABLED_BY_DAMAGE');
  });

  it('destroys fields on lethal damage', () => {
    const { service } = createService();
    const field = {
      fieldIndex: 2,
      buildingId: 100030100,
      integrity: 50,
      maxIntegrity: 1000,
      isActive: true,
    } as any;

    const result = service.damageField(field, 100);

    expect(field.integrity).toBe(0);
    expect(field.isActive).toBe(false);
    expect(result.status).toBe('DESTROYED');
  });

  it('protects headquarters when other targets do not exist in MVP', () => {
    const { service } = createService();
    const colony = {
      fields: [
        {
          fieldIndex: 1,
          buildingId: 82010100,
          isBuilding: false,
          isActive: true,
        },
      ],
    } as any;

    expect(service.selectDamageTargets(colony)).toEqual([]);
    expect(service.applyIncomingDamage(colony, 1000)).toEqual([]);
  });
});
