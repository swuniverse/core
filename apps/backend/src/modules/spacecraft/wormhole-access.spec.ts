import { allowsWormholeAccess } from './wormhole-access';
import type { DockingActor } from './docking-access';
import type {
  WormholeRestrictionDto,
  WormholeRestrictionTargetType,
} from '@swuniverse/shared';

const actor: DockingActor = {
  shipId: 5,
  userId: 2,
  allianceId: 7,
  factionId: 3,
};
const rule = (
  targetType: WormholeRestrictionTargetType,
  targetId: number,
  mode: 'ALLOW' | 'DENY',
): WormholeRestrictionDto => ({ id: 1, targetType, targetId, mode });

describe('explicit wormhole access', () => {
  it('allows without rules and denies when configured rules do not grant access', () => {
    expect(allowsWormholeAccess(actor, [])).toBe(true);
    expect(allowsWormholeAccess(actor, [rule('USER', 9, 'ALLOW')])).toBe(false);
  });

  it.each<[WormholeRestrictionTargetType, number]>([
    ['USER', 2],
    ['ALLIANCE', 7],
    ['FACTION', 3],
    ['SHIP', 5],
  ])('matches %s for both allow and deny', (type, id) => {
    expect(allowsWormholeAccess(actor, [rule(type, id, 'ALLOW')])).toBe(true);
    expect(allowsWormholeAccess(actor, [rule(type, id, 'DENY')])).toBe(false);
  });

  it.each<[WormholeRestrictionTargetType, number]>([
    ['USER', 2],
    ['ALLIANCE', 7],
    ['FACTION', 3],
    ['SHIP', 5],
  ])(
    'lets a matching %s deny beat every allow regardless of order',
    (type, id) => {
      const deny = rule(type, id, 'DENY');
      const allow = rule('USER', 2, 'ALLOW');
      expect(allowsWormholeAccess(actor, [allow, deny])).toBe(false);
      expect(allowsWormholeAccess(actor, [deny, allow])).toBe(false);
    },
  );

  it('does not let an unrelated deny override a matching allow', () => {
    expect(
      allowsWormholeAccess(actor, [
        rule('USER', 9, 'DENY'),
        rule('SHIP', 5, 'ALLOW'),
      ]),
    ).toBe(true);
  });

  it('does not match alliance privileges after membership ends', () => {
    expect(
      allowsWormholeAccess({ ...actor, allianceId: null }, [
        rule('ALLIANCE', 7, 'ALLOW'),
      ]),
    ).toBe(false);
  });

  it('fails closed for unavailable identity resolution', () => {
    expect(allowsWormholeAccess(null, [rule('SHIP', 5, 'ALLOW')])).toBe(false);
    expect(
      allowsWormholeAccess({ ...actor, factionId: null }, [
        rule('USER', 2, 'ALLOW'),
      ]),
    ).toBe(false);
  });
});
