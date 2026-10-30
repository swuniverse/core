import { decideDockingAccess, type DockingActor, type DockingRule } from './docking-access';
import {
  DockingPrivilegeMode as Mode,
  DockingPrivilegeType as Type,
} from './docking-privilege.types';

const actor: DockingActor = { shipId: 5, userId: 2, allianceId: 7, factionId: 3 };
const rule = (targetType: Type, targetId: number, mode: Mode): DockingRule => ({
  targetType,
  targetId,
  mode,
});

describe('decideDockingAccess', () => {
  it('always allows the owner, even against a deny rule', () => {
    expect(decideDockingAccess(2, actor, [rule(Type.USER, 2, Mode.DENY)]).allowed).toBe(true);
  });

  it('refuses without a matching allow', () => {
    expect(decideDockingAccess(1, actor, []).allowed).toBe(false);
    expect(decideDockingAccess(1, actor, [rule(Type.USER, 9, Mode.ALLOW)]).allowed).toBe(false);
  });

  it.each([
    [Type.USER, 2],
    [Type.ALLIANCE, 7],
    [Type.FACTION, 3],
    [Type.SHIP, 5],
  ])('allows via a matching %s rule', (type, id) => {
    expect(decideDockingAccess(1, actor, [rule(type, id, Mode.ALLOW)]).allowed).toBe(true);
  });

  it.each([
    [Type.USER, 2],
    [Type.ALLIANCE, 7],
    [Type.FACTION, 3],
    [Type.SHIP, 5],
  ])('lets a %s deny win over every allow', (type, id) => {
    const allows = [Type.USER, Type.ALLIANCE, Type.FACTION, Type.SHIP]
      .filter((other) => other !== type)
      .map((other) => rule(other, { USER: 2, ALLIANCE: 7, FACTION: 3, SHIP: 5 }[other], Mode.ALLOW));
    const rules = [...allows, rule(type, id, Mode.DENY)];
    const decision = decideDockingAccess(1, actor, rules);
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('verweigert');
  });

  it('ignores alliance rules for actors without an alliance', () => {
    const loner = { ...actor, allianceId: null };
    expect(decideDockingAccess(1, loner, [rule(Type.ALLIANCE, 7, Mode.ALLOW)]).allowed).toBe(false);
  });
});
