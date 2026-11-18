import type { Spacecraft } from './entities/spacecraft.entity';
import { SpacecraftDamage, splitSpacecraftDamage, type DamageRequest } from './spacecraft-damage';

function scripted(values: number[]) {
  const draws: string[] = [];
  return {
    draws,
    random: {
      integer: (min: number, max: number) => {
        draws.push(`${min}-${max}`);
        if (!values.length) throw new Error(`unexpected draw ${min}-${max}`);
        return values.shift() as number;
      },
    },
  };
}

function ship(overrides: Partial<Spacecraft> = {}): Spacecraft {
  return {
    hull: 100,
    hullMax: 100,
    shields: 0,
    runtimeSystems: {},
    ...overrides,
  } as Spacecraft;
}

const request = (overrides: Partial<DamageRequest> = {}): DamageRequest => ({
  netDamage: 10,
  isCrit: false,
  hullDamageFactor: 100,
  shieldDamageFactor: 100,
  targetSystems: ['WARPDRIVE', 'SUBLIGHT_DRIVE'],
  ...overrides,
});

describe('SpacecraftDamage (STU ApplyDamage)', () => {
  it('shares factor-based net damage splitting with combat, without fixed leakage', () => {
    const target = ship({ shields: 10, runtimeSystems: { SHIELDS: { active: true } } });
    expect(splitSpacecraftDamage(target, request({ netDamage: 40, shieldDamageFactor: 50, hullDamageFactor: 200 }))).toEqual({ shieldDamage: 10, remainingNetDamage: 20, hullDamage: 40 });
    expect(target.shields).toBe(10); // calculation is pure
    expect(splitSpacecraftDamage(target, request({ netDamage: 5 }))).toEqual({ shieldDamage: 5, remainingNetDamage: 0, hullDamage: 0 });
    expect(splitSpacecraftDamage(target, request({ shieldDamageFactor: 0 }))).toEqual({ shieldDamage: 0, remainingNetDamage: 0, hullDamage: 0 });
    (target.runtimeSystems!.SHIELDS as { active: boolean }).active = false;
    expect(splitSpacecraftDamage(target, request())).toEqual({ shieldDamage: 0, remainingNetDamage: 10, hullDamage: 10 });
  });
  it('lets active shields absorb the damage completely', () => {
    const target = ship({ shields: 30, runtimeSystems: { SHIELDS: { active: true } } });
    const info: string[] = [];

    expect(new SpacecraftDamage(scripted([]).random).apply(target, request({ netDamage: 20 }), info)).toEqual({ destroyed: false });

    expect(target).toMatchObject({ shields: 10, hull: 100 });
    expect(info).toEqual(['- Schildschaden: 20 - Status: 10']);
  });

  it('breaks shields through the shield factor and passes the remaining net damage to the hull', () => {
    const target = ship({
      shields: 10,
      runtimeSystems: { SHIELDS: { active: true }, WARPDRIVE: { active: true, integrity: 100 } },
    });
    const info: string[] = [];
    // 50 % shield factor: 20 net damage break 10 shields, 20 reach the hull and cost one sixth.
    const { random, draws } = scripted([0, 35]);

    new SpacecraftDamage(random).apply(target, request({ netDamage: 40, shieldDamageFactor: 50 }), info);

    expect(draws).toEqual(['0-0', '1-70']);
    expect(target).toMatchObject({ shields: 0, hull: 80, runtimeSystems: { SHIELDS: { active: false }, WARPDRIVE: { integrity: 65 } } });
    expect(info).toEqual([
      '- Schildschaden: 10',
      '-- Schilde brechen zusammen!',
      '- Hüllenschaden: 20 - Status: 80',
      '- Folgendes System wurde beschädigt: Hyperantrieb',
    ]);
  });

  it('reduces hull damage by the hull factor and hits a target system proportionally', () => {
    const target = ship({ runtimeSystems: { WARPDRIVE: { integrity: 100 }, SHIELDS: { integrity: 100 } } });
    const info: string[] = [];
    // round(10 × 60 %) = 6, no sixth lost; system share ceil(100 × 6 × 3 / 100) = 18
    const { random } = scripted([3, 0]);

    new SpacecraftDamage(random).apply(target, request({ hullDamageFactor: 60 }), info);

    expect(target).toMatchObject({ hull: 94, runtimeSystems: { WARPDRIVE: { integrity: 82 }, SHIELDS: { integrity: 100 } } });
  });

  it('applies a critical hit above half hull as 30–60 % system damage', () => {
    const target = ship({ runtimeSystems: { SUBLIGHT_DRIVE: { integrity: 100 }, WARPDRIVE: { integrity: 0 } } });
    const info: string[] = [];
    // crit share 45 %, pick (only the impulse drive is intact), then the proportional system share
    const { random } = scripted([45, 0, 1, 0]);

    new SpacecraftDamage(random).apply(target, request({ isCrit: true }), info);

    expect(target.runtimeSystems).toMatchObject({ SUBLIGHT_DRIVE: { integrity: 45 }, WARPDRIVE: { integrity: 0 } });
    expect(info[0]).toBe('- Kritischer Hüllen-Treffer verursacht 45% Systemschaden');
  });

  it('may destroy a system outright on a critical hit at low hull', () => {
    const target = ship({ hull: 20, runtimeSystems: { WARPDRIVE: { active: true, integrity: 90 } } });
    const info: string[] = [];
    // hull 20 %: destruction chance 60 %, roll 10 destroys; the lost sixth then finds no intact system
    const { random, draws } = scripted([10, 0]);

    new SpacecraftDamage(random).apply(target, request({ isCrit: true }), info);

    expect(target.runtimeSystems).toMatchObject({ WARPDRIVE: { active: false, integrity: 0 } });
    expect(draws).toEqual(['1-100', '0-0']);
    expect(info[0]).toBe('- Kritischer Hüllen-Treffer zerstört System: Hyperantrieb');
  });

  it('never hits systems outside the target list', () => {
    const target = ship({ runtimeSystems: { LIFE_SUPPORT: { integrity: 100 } } });

    new SpacecraftDamage(scripted([2]).random).apply(target, request(), []);

    expect(target.runtimeSystems).toEqual({ LIFE_SUPPORT: { integrity: 100 } });
  });

  it('reports a lethal hit as destroyed', () => {
    const target = ship({ hull: 8 });
    const info: string[] = [];

    expect(new SpacecraftDamage(scripted([]).random).apply(target, request(), info)).toEqual({ destroyed: true });

    expect(target.hull).toBe(0);
    expect(info).toEqual(['- Hüllenschaden: 10', '-- Das Schiff wurde zerstört!']);
  });
});
