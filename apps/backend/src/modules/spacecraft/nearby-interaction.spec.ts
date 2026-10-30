jest.mock('./spacecraft-field', () => ({
  resolveSpacecraftLocation: (ship: { scope: string }) => ({
    scope: ship.scope,
  }),
  sameSpacecraftLocation: (a: { pos: number }, b: { pos: number }) =>
    a.pos === b.pos,
}));

import type { Spacecraft } from './entities/spacecraft.entity';
import type { SpacecraftRuntimeSystems } from './spacecraft-runtime-state.service';
import {
  buildNearbyInteractionContext,
  decideNearbyInteraction,
  INTERACTION_HOOKS,
} from './nearby-interaction';

const ship = (pos: number, scope = 'GALAXY') =>
  ({ pos, scope }) as unknown as Spacecraft;
const systems = (warp = false, shields = false) =>
  ({
    WARPDRIVE: { active: warp },
    SHIELDS: { active: shields },
  }) as unknown as SpacecraftRuntimeSystems;

describe('nearby interaction decisions', () => {
  afterEach(() => (INTERACTION_HOOKS.length = 0));

  it('rejects scan and intercept on different positions', () => {
    const context = buildNearbyInteractionContext(
      ship(1),
      systems(),
      ship(2),
      systems(),
    );
    expect(decideNearbyInteraction('SCAN', context)).toEqual({
      allowed: false,
      reason: null,
    });
    expect(decideNearbyInteraction('INTERCEPT', context).allowed).toBe(false);
  });

  it('blocks attack with a German reason when the target is in hyperspace', () => {
    const context = buildNearbyInteractionContext(
      ship(1),
      systems(),
      ship(1),
      systems(true),
    );
    expect(decideNearbyInteraction('ATTACK', context)).toEqual({
      allowed: false,
      reason: 'Das Ziel hat den Warpantrieb aktiviert',
    });
    expect(decideNearbyInteraction('SCAN', context).allowed).toBe(true);
  });

  it('ignores hyperdrive state in a system', () => {
    const context = buildNearbyInteractionContext(
      ship(1, 'SYSTEM'),
      systems(true),
      ship(1, 'SYSTEM'),
      systems(true),
    );
    expect(decideNearbyInteraction('CONTACT', context).allowed).toBe(true);
  });

  it('lets registered hooks reject after the rules pass', () => {
    INTERACTION_HOOKS.push(() => ({ allowed: false, reason: 'Ionensturm' }));
    const context = buildNearbyInteractionContext(
      ship(1),
      systems(),
      ship(1),
      systems(),
    );
    expect(decideNearbyInteraction('SCAN', context)).toEqual({
      allowed: false,
      reason: 'Ionensturm',
    });
  });

  it('applies communication and salvage rules', () => {
    const apart = buildNearbyInteractionContext(
      ship(1),
      systems(),
      ship(2),
      systems(),
    );
    expect(decideNearbyInteraction('MESSAGE', apart).allowed).toBe(false);
    expect(decideNearbyInteraction('SALVAGE', apart).allowed).toBe(false);

    const shielded = buildNearbyInteractionContext(
      ship(1),
      systems(false, true),
      ship(1),
      {},
    );
    expect(decideNearbyInteraction('SALVAGE', shielded)).toEqual({
      allowed: false,
      reason: 'Die Schilde sind aktiviert',
    });
    expect(decideNearbyInteraction('MESSAGE', shielded).allowed).toBe(true);
  });

  it('lets a tractor hook veto messages and salvage', () => {
    INTERACTION_HOOKS.push((interaction) =>
      interaction === 'SALVAGE' || interaction === 'MESSAGE'
        ? { allowed: false, reason: 'Traktorstrahl aktiv' }
        : null,
    );
    const context = buildNearbyInteractionContext(
      ship(1),
      systems(),
      ship(1),
      systems(),
    );
    expect(decideNearbyInteraction('MESSAGE', context).reason).toBe(
      'Traktorstrahl aktiv',
    );
    expect(decideNearbyInteraction('SALVAGE', context).allowed).toBe(false);
    expect(decideNearbyInteraction('SCAN', context).allowed).toBe(true);
  });
});
