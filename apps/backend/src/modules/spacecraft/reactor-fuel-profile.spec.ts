import { reactorFuelProfile } from './reactor-fuel-profile';

describe('reactorFuelProfile', () => {
  it('uses the light profile for the starter reactor', () => {
    expect(
      reactorFuelProfile([
        {
          moduleType: 'Leichter Hypermaterie-Reaktor',
          isActive: true,
          integrity: 100,
        } as never,
      ]),
    ).toMatchObject({
      key: 'LIGHT_HYPERMATTER',
      loadUnits: 2,
      capacityMultiplier: 10,
    });
  });

  it('uses the buildable Hypermaterie reactor profile by default', () => {
    expect(reactorFuelProfile()).toMatchObject({
      key: 'HYPERMATTER',
      loadUnits: 30,
      capacityMultiplier: 15,
      costs: [
        { commodityId: 8, amount: 1 },
        { commodityId: 6, amount: 2 },
        { commodityId: 5, amount: 2 },
      ],
    });
  });

  it('uses the same profile for both currently buildable reactor variants', () => {
    expect(
      reactorFuelProfile([
        {
          moduleType: 'Hypermaterie-Reaktor',
          isActive: true,
          integrity: 100,
        } as never,
      ]),
    ).toMatchObject({ key: 'HYPERMATTER' });
    expect(
      reactorFuelProfile([
        {
          moduleType: 'Allianz-Hypermaterie-Reaktor',
          isActive: true,
          integrity: 100,
        } as never,
      ]),
    ).toMatchObject({ key: 'HYPERMATTER' });
  });
});
