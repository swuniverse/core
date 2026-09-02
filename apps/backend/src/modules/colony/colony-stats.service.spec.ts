import { BadRequestException } from '@nestjs/common';
import {
  adjustColonyEnergy,
  adjustColonyPopulationParts,
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
