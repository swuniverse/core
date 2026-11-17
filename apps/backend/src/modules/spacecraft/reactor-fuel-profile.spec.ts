import {
  reactorFuelProfile,
  recoverableReactorFuel,
} from './reactor-fuel-profile';

describe('reactorFuelProfile', () => {
  it('preserves the reserve recipe through damage and recovers whole loads only', () => {
    const modules = [
      { moduleType: 'Hypermaterie-Reservekern', isActive: false, integrity: 0 },
    ] as never;
    expect(reactorFuelProfile(modules)).toMatchObject({
      key: 'RESERVE_HYPERMATTER',
      loadUnits: 85,
      capacityMultiplier: 20,
    });
    expect(recoverableReactorFuel(169, modules)).toEqual([
      { commodityId: 8, amount: 2 },
      { commodityId: 6, amount: 3 },
      { commodityId: 7, amount: 2 },
    ]);
  });
  it('rejects simultaneous alternative cores rather than summing their performance', () => {
    expect(() =>
      reactorFuelProfile([
        { moduleType: 'Hypermaterie-Reservekern' },
        { moduleType: 'Hypermaterie-Reaktor' },
      ] as never),
    ).toThrow('Nur ein alternatives Reaktormodul');
  });
  it('rejects an unsupported explicit core instead of falling back to the standard recipe', () => {
    expect(() =>
      reactorFuelProfile([
        { category: 'REACTOR', moduleType: 'Unbekannter Kern' },
      ] as never),
    ).toThrow('Reaktor-Ladeprofil fehlt');
  });
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
