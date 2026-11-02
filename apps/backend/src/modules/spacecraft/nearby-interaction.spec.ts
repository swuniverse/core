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

  it('allows boarding without a stance check but rejects shields and vacation', () => {
    const available = buildNearbyInteractionContext(
      ship(1),
      systems(),
      ship(1),
      systems(),
    );
    available.stanceAllowed = false;
    expect(decideNearbyInteraction('BOARDING', available).allowed).toBe(true);

    const shielded = buildNearbyInteractionContext(
      ship(1),
      systems(),
      ship(1),
      systems(false, true),
    );
    expect(decideNearbyInteraction('BOARDING', shielded)).toEqual({
      allowed: false,
      reason: 'Das Ziel hat die Schilde aktiviert',
    });

    const vacation = buildNearbyInteractionContext(
      ship(1),
      systems(),
      ship(1),
      systems(),
      true,
    );
    expect(decideNearbyInteraction('BOARDING', vacation).allowed).toBe(false);
  });

  it('rejects attacks and intercepts against effective vacation targets', () => {
    const context = buildNearbyInteractionContext(
      ship(1),
      systems(),
      ship(1),
      systems(),
      true,
    );
    for (const interaction of ['ATTACK', 'INTERCEPT'] as const) {
      expect(decideNearbyInteraction(interaction, context)).toEqual({
        allowed: false,
        reason:
          'Aktion nicht möglich, der Spieler befindet sich im Urlaubsmodus!',
      });
    }
    expect(decideNearbyInteraction('TRANSFER', context).allowed).toBe(true);
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

  it('applies STU\'s uncloaked expectations to cloaked sources and targets', () => {
    const cloaked = { CLOAK: { active: true } } as unknown as SpacecraftRuntimeSystems;
    const cloakedTarget = buildNearbyInteractionContext(
      ship(1),
      systems(),
      ship(1),
      cloaked,
    );
    for (const interaction of ['ATTACK', 'SCAN', 'TRANSFER', 'MESSAGE'] as const) {
      expect(decideNearbyInteraction(interaction, cloakedTarget).allowed).toBe(
        false,
      );
    }
    const cloakedSource = buildNearbyInteractionContext(
      ship(1),
      cloaked,
      ship(1),
      systems(),
    );
    expect(decideNearbyInteraction('ATTACK', cloakedSource)).toEqual({
      allowed: false,
      reason: 'Die Tarnung ist aktiviert',
    });
    expect(decideNearbyInteraction('SCAN', cloakedSource).allowed).toBe(true);
  });
});

describe('dock interaction', () => {
  afterEach(() => (INTERACTION_HOOKS.length = 0));

  it('rejects a shielded station and a cloaked ship, and allows a plain dock', () => {
    const base = buildNearbyInteractionContext(ship(1), systems(), ship(1), systems());
    expect(decideNearbyInteraction('DOCK', base).allowed).toBe(true);
    const shielded = buildNearbyInteractionContext(ship(1), systems(), ship(1), systems(false, true));
    expect(decideNearbyInteraction('DOCK', shielded).reason).toBe('Das Ziel hat die Schilde aktiviert');
    const cloaked = buildNearbyInteractionContext(
      ship(1),
      { CLOAK: { active: true } } as unknown as SpacecraftRuntimeSystems,
      ship(1),
      systems(),
    );
    expect(decideNearbyInteraction('DOCK', cloaked).reason).toBe('Die Tarnung ist aktiviert');
  });

  it('exposes docked state so ion storm hooks can exempt docked ships', () => {
    const docked = { ...ship(1), dockedAtId: 9 } as unknown as Spacecraft;
    const context = buildNearbyInteractionContext(docked, systems(), ship(1), systems());
    expect(context.sourceDocked).toBe(true);
    expect(context.targetDocked).toBe(false);
    INTERACTION_HOOKS.push((_interaction, ctx) =>
      ctx.sourceDocked ? null : { allowed: false, reason: 'Ionensturm' },
    );
    expect(decideNearbyInteraction('SCAN', context).allowed).toBe(true);
    const free = buildNearbyInteractionContext(ship(1), systems(), ship(1), systems());
    expect(decideNearbyInteraction('SCAN', free).allowed).toBe(false);
  });
});
