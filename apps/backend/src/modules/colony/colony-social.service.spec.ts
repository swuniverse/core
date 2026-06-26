import { ColonySocialService } from './colony-social.service';

function createService() {
  const gameData = {
    getSocialEffects: jest.fn(() => ({
      lifeStandardCommodityId: 1300,
      fallback: {
        primaryEffectCommodityId: 1001,
        secondaryEffectCommodityId: 1601,
      },
      factions: {},
    })),
    getCommodity: jest.fn((id: number) => ({ id, name: `Commodity ${id}` })),
  };
  return new ColonySocialService(gameData as any);
}

describe('ColonySocialService', () => {
  it('calculates life standard percentage like STU', () => {
    const service = createService();
    expect(service.getLifeStandardPercent(100, 0)).toBe(0);
    expect(service.getLifeStandardPercent(100, 50)).toBe(50);
    expect(service.getLifeStandardPercent(100, 100)).toBe(100);
    expect(service.getLifeStandardPercent(100, 150)).toBe(100);
  });

  it('calculates negative effect as ceil population / 70', () => {
    const service = createService();
    expect(service.getNegativeEffect(0)).toBe(0);
    expect(service.getNegativeEffect(1)).toBe(1);
    expect(service.getNegativeEffect(70)).toBe(1);
    expect(service.getNegativeEffect(71)).toBe(2);
  });

  it('calculates generated crew from the STU wiki formula', () => {
    const service = createService();
    expect(
      service.calculateGeneratedCrew({
        primaryEffect: 40,
        secondaryEffect: 1,
        negativeEffect: 9,
        workers: 100,
        lifeStandardPercent: 13,
      }),
    ).toBe(10);
    expect(
      service.calculateGeneratedCrew({
        primaryEffect: 100,
        secondaryEffect: 20,
        negativeEffect: 5,
        workers: 50,
        lifeStandardPercent: 100,
      }),
    ).toBe(20);
  });

  it('builds local social summary values from production deltas', () => {
    const service = createService();
    const colony = { population: 100, stats: { workers: 50 } } as any;
    const summary = {
      productionDelta: new Map([
        [1001, 100],
        [1601, 20],
        [1300, 100],
      ]),
      workersUsed: 50,
    } as any;

    const result = service.buildSocialSummary(colony, summary, {
      globalCrewLimit: 20,
      crewOnShips: 2,
      availableCrewOnColony: 4,
      inTraining: 1,
      trainableRemaining: 13,
    });

    expect(result.local.primaryEffect.value).toBe(100);
    expect(result.local.secondaryEffect.value).toBe(20);
    expect(result.local.lifeStandard.percent).toBe(100);
    expect(result.global.globalCrewLimit).toBe(20);
  });
});
