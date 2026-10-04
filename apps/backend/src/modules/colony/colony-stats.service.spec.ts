import { BadRequestException } from '@nestjs/common';
import {
  adjustColonyEnergy,
  adjustColonyPopulationParts,
  ColonyStatsService,
  deductColonyEnergy,
  getColonyChangeable,
  setColonyMaxPopulation,
  setColonyEnergy,
  setColonyPopulationParts,
} from './colony-stats.service';
import { Colony } from './entities/colony.entity';

function createColony(): Colony {
  return {
    id: 1,
    energy: 25,
    energyMax: 100,
    population: 7,
    populationMax: 20,
    storageMax: 300,
    stats: {
      colonyId: 1,
      workers: 3,
      workless: 4,
      maxPopulation: 20,
      maxEnergy: 100,
      maxStorage: 300,
    },
  } as Colony;
}

describe('colony state helpers', () => {
  it('sets changeable energy and syncs legacy snapshot', () => {
    const colony = createColony();

    expect(setColonyEnergy(colony, 12)).toBe(12);

    expect(getColonyChangeable(colony).energy).toBe(12);
    expect(colony.energy).toBe(12);
    expect(colony.energyMax).toBe(100);
    expect(colony.population).toBe(7);
    expect(colony.populationMax).toBe(20);
    expect(colony.storageMax).toBe(300);
  });

  it('adjusts energy relative to current changeable state', () => {
    const colony = createColony();

    expect(adjustColonyEnergy(colony, -5)).toBe(20);

    expect(getColonyChangeable(colony).energy).toBe(20);
    expect(colony.energy).toBe(20);
  });

  it('deducts energy or throws without mutating when insufficient', () => {
    const colony = createColony();

    expect(deductColonyEnergy(colony, 10)).toBe(15);
    expect(() => deductColonyEnergy(colony, 20)).toThrow(BadRequestException);
    expect(getColonyChangeable(colony).energy).toBe(15);
    expect(colony.energy).toBe(15);
  });

  it('sets and adjusts population parts while syncing legacy population', () => {
    const colony = createColony();

    expect(setColonyPopulationParts(colony, 5, 6)).toEqual({
      workers: 5,
      workless: 6,
    });
    expect(colony.population).toBe(11);

    expect(adjustColonyPopulationParts(colony, -2, 3)).toEqual({
      workers: 3,
      workless: 9,
    });
    expect(colony.population).toBe(12);
  });

  it('sets max population and syncs legacy population max', () => {
    const colony = createColony();

    expect(setColonyMaxPopulation(colony, 42)).toBe(42);

    expect(getColonyChangeable(colony).maxPopulation).toBe(42);
    expect(colony.populationMax).toBe(42);
  });
});

describe('bonus marker yield', () => {
  const definitions: Record<number, unknown> = {
    1: { epsProc: 10, bevUse: 0, bevPro: 5, lager: 0, bonuses: { storage: 0, energy: 0 }, production: [{ commodityId: 1, amount: 4 }, { commodityId: 2, amount: -3 }], researchPoints: 0 },
  };
  const service = new ColonyStatsService({
    getBuildingFunctions: () => [],
    getBuilding: (id: number) => definitions[id],
    getColonyClass: () => undefined,
    getCategoriesForTerrainTile: (tile: string) =>
      ({ W: ['wasser_alles'], S: ['standard'], G: ['geothermal'] })[tile] ?? [],
    getCommodity: () => ({ isDeposit: false, isSaveable: true }),
  } as never);
  const summaryFor = (bonusMarker: string | null, terrainTileId = 'W') =>
    service.calculateSummary({
      ...createColony(),
      fields: [{ id: 1, buildingId: 1, isBuilding: false, isActive: true, bonusMarker, terrainTileId }],
    } as unknown as Colony);

  it('doubles only the matching positive output', () => {
    const plain = summaryFor(null);
    expect(plain.energyDelta).toBe(10);
    expect(plain.housingBonus).toBe(5);
    expect(plain.productionDelta.get(1)).toBe(4);

    expect(summaryFor('ENERGY').energyDelta).toBe(20);
    expect(summaryFor('ATTRACTIVE', 'S').housingBonus).toBe(10);
    const fertile = summaryFor('FERTILE_WATER');
    expect(fertile.productionDelta.get(1)).toBe(8);
    expect(fertile.productionDelta.get(2)).toBe(-3);
    expect(summaryFor('PHRIK', 'S').productionDelta.get(1)).toBe(4);
  });

  it('gives no bonus once the tile no longer fits the marker (landfill under a jellyfish)', () => {
    expect(summaryFor('FERTILE_WATER', 'W').productionDelta.get(1)).toBe(8);
    expect(summaryFor('FERTILE_WATER', 'S').productionDelta.get(1)).toBe(4);
    expect(summaryFor('ATTRACTIVE', 'W').housingBonus).toBe(5);
    expect(summaryFor('ENERGY', 'S').energyDelta).toBe(10);
  });
});
