import {
  AlliancePermission,
  grantsAlliancePermission,
} from '@swuniverse/shared';

/** Anything holding alliance roles, e.g. a membership record. */
export interface RoleHolder {
  roles: ReadonlyArray<{ permissions: readonly AlliancePermission[] }>;
}

/** Union of the rights of all roles, as stored (parents not expanded). */
export function heldPermissions(
  member: RoleHolder | null | undefined,
): AlliancePermission[] {
  return [...new Set(member?.roles.flatMap((r) => r.permissions) ?? [])];
}

/** STU `AllianceJobManager::hasUserPermission`; no member, no right. */
export function hasPermission(
  member: RoleHolder | null | undefined,
  permission: AlliancePermission,
): boolean {
  return grantsAlliancePermission(heldPermissions(member), permission);
}

export function isFounder(member: RoleHolder | null | undefined): boolean {
  return heldPermissions(member).includes(AlliancePermission.FOUNDER);
}

/**
 * Protection rule (ADR 0001, the STU escalation bug is not adopted): an actor
 * only grants, edits or takes away rights it holds itself.
 */
export function coversPermissions(
  actor: RoleHolder,
  permissions: readonly AlliancePermission[],
): boolean {
  return permissions.every((p) => hasPermission(actor, p));
}

/**
 * May the actor change the target's roles or kick the target? Needs
 * MANAGE_JOBS, never the actor itself, and only targets whose rights the
 * actor covers (so the founder is untouchable).
 */
export function mayManageMember(
  actor: RoleHolder & { userId: number },
  target: RoleHolder & { userId: number },
): boolean {
  return (
    actor.userId !== target.userId &&
    hasPermission(actor, AlliancePermission.MANAGE_JOBS) &&
    coversPermissions(actor, heldPermissions(target))
  );
}

/** May the actor create, edit, delete or hand out a role with these rights? */
export function mayHandleRole(
  actor: RoleHolder,
  role: { permissions: readonly AlliancePermission[] },
): boolean {
  return (
    hasPermission(actor, AlliancePermission.MANAGE_JOBS) &&
    !role.permissions.includes(AlliancePermission.FOUNDER) &&
    coversPermissions(actor, role.permissions)
  );
}

/**
 * Changing a role's rights or deleting it changes its holders' roles, so the
 * actor must reach every holder but itself (no indirect demotion).
 */
export function mayChangeRoleHolders(
  actor: RoleHolder & { userId: number },
  roleId: number,
  members: ReadonlyArray<{
    userId: number;
    roles: ReadonlyArray<{
      id: number;
      permissions: readonly AlliancePermission[];
    }>;
  }>,
): boolean {
  return members.every(
    (m) =>
      m.userId === actor.userId ||
      !m.roles.some((r) => r.id === roleId) ||
      mayManageMember(actor, m),
  );
}

/** Rights that reveal a role's leadership group (STU `AllianceProvider`), public. */
export const PUBLIC_ROLE_PERMISSIONS: ReadonlySet<AlliancePermission> = new Set(
  [
    AlliancePermission.FOUNDER,
    AlliancePermission.SUCCESSOR,
    AlliancePermission.DIPLOMATIC,
    AlliancePermission.ALLIANCE_LEADERSHIP,
  ],
);
