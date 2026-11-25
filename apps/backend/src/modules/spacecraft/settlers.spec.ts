import { settlersLimits } from './settlers';

const base = {
  cargoMax: 35,
  cargoUsed: 0,
  onShip: 0,
  workless: 100,
  population: 200,
  populationMax: 300,
};

describe('settlersLimits', () => {
  it('fills the whole cargo hold one to one', () => {
    expect(settlersLimits(base).maxLoad).toBe(35);
  });

  it('respects free cargo space and settlers already aboard', () => {
    expect(settlersLimits({ ...base, cargoUsed: 30 }).maxLoad).toBe(5);
    expect(settlersLimits({ ...base, onShip: 15, cargoUsed: 30 }).maxLoad).toBe(5);
  });

  it('only takes the unemployed of the colony', () => {
    expect(settlersLimits({ ...base, workless: 7 }).maxLoad).toBe(7);
  });

  it('limits unloading to the free housing of the target', () => {
    expect(settlersLimits({ ...base, onShip: 12, population: 295 }).maxUnload).toBe(5);
    expect(settlersLimits({ ...base, onShip: 12 }).maxUnload).toBe(12);
  });
});
