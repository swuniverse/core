import { AlliancePermission } from '@swuniverse/shared';
import {
  hasPermission,
  heldPermissions,
  isFounder,
  mayHandleRole,
  mayManageMember,
} from './alliance-permissions';
import { STANDARD_ALLIANCE_ROLES } from './alliance.constants';

const P = AlliancePermission;
const ALL = Object.values(P);

const member = (userId: number, ...roles: AlliancePermission[][]) => ({
  userId,
  roles: roles.map((permissions) => ({ permissions })),
});
const president = member(1, [...STANDARD_ALLIANCE_ROLES.PRESIDENT.permissions]);
const vice = member(2, [...STANDARD_ALLIANCE_ROLES.VICE.permissions]);
const diplomat = member(3, [...STANDARD_ALLIANCE_ROLES.DIPLOMAT.permissions]);
const plain = member(4);

describe('alliance permissions', () => {
  it('FOUNDER grants every right', () => {
    for (const p of ALL) expect(hasPermission(president, p)).toBe(true);
    expect(isFounder(president)).toBe(true);
  });

  it('a parent right grants its children, not its siblings', () => {
    const successorOnly = member(5, [P.SUCCESSOR]);
    expect(hasPermission(successorOnly, P.MANAGE_JOBS)).toBe(true);
    expect(hasPermission(successorOnly, P.VIEW_ALLIANCE_HISTORY)).toBe(true);
    expect(hasPermission(successorOnly, P.CREATE_AGREEMENTS)).toBe(false);
    expect(hasPermission(successorOnly, P.FOUNDER)).toBe(false);

    const diplomaticOnly = member(6, [P.DIPLOMATIC]);
    expect(hasPermission(diplomaticOnly, P.EDIT_DIPLOMATIC_DOCUMENTS)).toBe(
      true,
    );
    expect(hasPermission(diplomaticOnly, P.EDIT_ALLIANCE)).toBe(false);
  });

  it('a child right does not grant its parent', () => {
    const child = member(7, [P.MANAGE_JOBS]);
    expect(hasPermission(child, P.SUCCESSOR)).toBe(false);
    expect(hasPermission(child, P.EDIT_ALLIANCE)).toBe(false);
  });

  it('unions the rights of several roles', () => {
    const both = member(8, [P.EDIT_ALLIANCE], [P.CREATE_AGREEMENTS]);
    expect(heldPermissions(both).sort()).toEqual(
      [P.CREATE_AGREEMENTS, P.EDIT_ALLIANCE].sort(),
    );
    expect(hasPermission(both, P.CREATE_AGREEMENTS)).toBe(true);
    expect(hasPermission(null, P.EDIT_ALLIANCE)).toBe(false);
    expect(hasPermission(plain, P.VIEW_SHIPS)).toBe(false);
  });

  describe('protection rule', () => {
    it('nobody hands out or edits the FOUNDER role', () => {
      expect(mayHandleRole(president, { permissions: [P.FOUNDER] })).toBe(
        false,
      );
      expect(mayHandleRole(vice, { permissions: [P.FOUNDER] })).toBe(false);
    });

    it('only rights the actor holds can be handed out', () => {
      expect(mayHandleRole(vice, { permissions: [P.EDIT_ALLIANCE] })).toBe(
        true,
      );
      expect(mayHandleRole(vice, { permissions: [P.SUCCESSOR] })).toBe(true);
      expect(mayHandleRole(vice, { permissions: [P.CREATE_AGREEMENTS] })).toBe(
        false,
      );
      const jobsOnly = member(9, [P.MANAGE_JOBS]);
      expect(mayHandleRole(jobsOnly, { permissions: [P.MANAGE_JOBS] })).toBe(
        true,
      );
      expect(mayHandleRole(jobsOnly, { permissions: [P.SUCCESSOR] })).toBe(
        false,
      );
      expect(mayHandleRole(diplomat, { permissions: [] })).toBe(false);
    });

    it('members with rights the actor lacks are out of reach', () => {
      expect(mayManageMember(vice, plain)).toBe(true);
      expect(mayManageMember(vice, diplomat)).toBe(false);
      expect(mayManageMember(vice, president)).toBe(false);
      expect(mayManageMember(president, diplomat)).toBe(true);
      expect(mayManageMember(president, vice)).toBe(true);
      expect(mayManageMember(diplomat, plain)).toBe(false);
      const jobsOnly = member(9, [P.MANAGE_JOBS]);
      expect(mayManageMember(jobsOnly, vice)).toBe(false);
      expect(mayManageMember(jobsOnly, plain)).toBe(true);
    });

    it('nobody changes their own roles', () => {
      expect(mayManageMember(president, president)).toBe(false);
      expect(mayManageMember(vice, vice)).toBe(false);
    });
  });
});
