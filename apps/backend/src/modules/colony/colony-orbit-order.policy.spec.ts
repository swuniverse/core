import {
  evaluateOrbitOrderStart,
  evaluateOrbitOrderStop,
  ORBIT_ORDER_REASONS,
  type OrbitOrderStartContext,
} from './colony-orbit-order.policy';
import { ColonyOrbitAssignmentMode } from './entities/colony-orbit-assignment.entity';

const { DEFEND, BLOCKADE } = ColonyOrbitAssignmentMode;

function context(
  overrides: Partial<OrbitOrderStartContext> = {},
): OrbitOrderStartContext {
  return {
    colonyId: 1,
    shipDestroyed: false,
    inColonyOrbit: true,
    isFleetLeader: true,
    shipIdle: true,
    colonyOccupied: true,
    fleetOrder: null,
    colonyDefended: false,
    colonyBlockaded: false,
    ownerOnVacation: false,
    activeOrbitalDefense: false,
    ...overrides,
  };
}

describe('orbit order policy', () => {
  it.each([DEFEND, BLOCKADE])(
    'allows %s for any occupied colony without consulting ownership or stance',
    (mode) => {
      expect(evaluateOrbitOrderStart(mode, context())).toEqual({
        allowed: true,
        reason: null,
      });
    },
  );

  it.each([
    ['a destroyed ship', { shipDestroyed: true }, ORBIT_ORDER_REASONS.shipDestroyed],
    ['a ship outside the colony orbit', { inColonyOrbit: false, colonyId: null }, ORBIT_ORDER_REASONS.notInOrbit],
    ['a fleet member that is not the leader', { isFleetLeader: false }, ORBIT_ORDER_REASONS.notFleetLeader],
    ['a ship that is not idle', { shipIdle: false }, ORBIT_ORDER_REASONS.shipNotIdle],
    ['a free colony', { colonyOccupied: false }, ORBIT_ORDER_REASONS.colonyFree],
    ['a fleet with an order at another colony', { fleetOrder: { colonyId: 2, mode: DEFEND } }, ORBIT_ORDER_REASONS.fleetHasOrder],
    ['an owner in effective vacation', { ownerOnVacation: true }, ORBIT_ORDER_REASONS.ownerOnVacation],
  ] as const)(
    'rejects both orders for %s',
    (_label, overrides, reason) => {
      for (const mode of [DEFEND, BLOCKADE]) {
        expect(
          evaluateOrbitOrderStart(mode, context(overrides)),
        ).toEqual({ allowed: false, reason });
      }
    },
  );

  it('reports an identical running order of the same fleet distinctly', () => {
    expect(
      evaluateOrbitOrderStart(
        DEFEND,
        context({ fleetOrder: { colonyId: 1, mode: DEFEND } }),
      ),
    ).toEqual({ allowed: false, reason: ORBIT_ORDER_REASONS.alreadyDefending });
    expect(
      evaluateOrbitOrderStart(
        BLOCKADE,
        context({ fleetOrder: { colonyId: 1, mode: BLOCKADE } }),
      ),
    ).toEqual({ allowed: false, reason: ORBIT_ORDER_REASONS.alreadyBlockading });
    expect(
      evaluateOrbitOrderStart(
        BLOCKADE,
        context({ fleetOrder: { colonyId: 1, mode: DEFEND } }),
      ),
    ).toEqual({ allowed: false, reason: ORBIT_ORDER_REASONS.fleetHasOrder });
  });

  it('rejects the opposing order of another fleet only', () => {
    expect(
      evaluateOrbitOrderStart(DEFEND, context({ colonyBlockaded: true })),
    ).toEqual({ allowed: false, reason: ORBIT_ORDER_REASONS.colonyBlockaded });
    expect(
      evaluateOrbitOrderStart(BLOCKADE, context({ colonyDefended: true })),
    ).toEqual({ allowed: false, reason: ORBIT_ORDER_REASONS.colonyDefended });
    expect(
      evaluateOrbitOrderStart(DEFEND, context({ colonyDefended: true })).allowed,
    ).toBe(true);
    expect(
      evaluateOrbitOrderStart(BLOCKADE, context({ colonyBlockaded: true }))
        .allowed,
    ).toBe(true);
  });

  it('blocks only blockades on active orbital defense', () => {
    const defended = context({ activeOrbitalDefense: true });
    expect(evaluateOrbitOrderStart(BLOCKADE, defended)).toEqual({
      allowed: false,
      reason: ORBIT_ORDER_REASONS.orbitalDefense,
    });
    expect(evaluateOrbitOrderStart(DEFEND, defended).allowed).toBe(true);
  });

  it('checks in STU order: leadership before vacation before opposing orders', () => {
    expect(
      evaluateOrbitOrderStart(
        BLOCKADE,
        context({
          isFleetLeader: false,
          ownerOnVacation: true,
          colonyDefended: true,
          activeOrbitalDefense: true,
        }),
      ).reason,
    ).toBe(ORBIT_ORDER_REASONS.notFleetLeader);
    expect(
      evaluateOrbitOrderStart(
        BLOCKADE,
        context({
          ownerOnVacation: true,
          colonyDefended: true,
          activeOrbitalDefense: true,
        }),
      ).reason,
    ).toBe(ORBIT_ORDER_REASONS.ownerOnVacation);
    expect(
      evaluateOrbitOrderStart(
        BLOCKADE,
        context({ colonyDefended: true, activeOrbitalDefense: true }),
      ).reason,
    ).toBe(ORBIT_ORDER_REASONS.colonyDefended);
  });

  it('allows stopping only the running order of a fleet leader', () => {
    const order = { colonyId: 1, mode: BLOCKADE };
    expect(
      evaluateOrbitOrderStop({ isFleetLeader: true, fleetOrder: order }),
    ).toEqual({ allowed: true, reason: null });
    expect(
      evaluateOrbitOrderStop({ isFleetLeader: false, fleetOrder: order }),
    ).toEqual({ allowed: false, reason: ORBIT_ORDER_REASONS.notFleetLeader });
    expect(
      evaluateOrbitOrderStop({ isFleetLeader: true, fleetOrder: null }),
    ).toEqual({ allowed: false, reason: ORBIT_ORDER_REASONS.noOrder });
  });
});
