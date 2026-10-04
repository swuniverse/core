import { AllianceRole } from '@swuniverse/shared';

export const ALLIANCE_MEMBER_ACTIONS = [
  'kick',
  'appointVice',
  'appointDiplomat',
  'dismiss',
  'transferPresidency',
] as const;
export type AllianceMemberAction = (typeof ALLIANCE_MEMBER_ACTIONS)[number];

export const ALLIANCE_ACTIONS = [
  'manageApplications',
  'editDetails',
  'dissolve',
] as const;
export type AllianceAction = (typeof ALLIANCE_ACTIONS)[number];

const { NONE, PRESIDENT, VICE, DIPLOMAT } = AllianceRole;

/**
 * May an actor holding `actor` perform `action` on a fellow member holding
 * `target`? Acting on oneself is excluded by the caller.
 */
export function mayActOnMember(
  actor: AllianceRole,
  action: AllianceMemberAction,
  target: AllianceRole,
): boolean {
  if (target === PRESIDENT) return false;
  if (actor === PRESIDENT) {
    switch (action) {
      case 'kick':
      case 'transferPresidency':
        return true;
      case 'appointVice':
        return target !== VICE;
      case 'appointDiplomat':
        return target !== DIPLOMAT;
      case 'dismiss':
        return target !== NONE;
    }
  }
  if (actor === VICE) {
    switch (action) {
      case 'kick':
        return target === NONE || target === DIPLOMAT;
      case 'appointDiplomat':
        return target === NONE;
      case 'dismiss':
        return target === DIPLOMAT;
      default:
        return false;
    }
  }
  return false;
}

export function mayActOnAlliance(
  actor: AllianceRole,
  action: AllianceAction,
): boolean {
  if (actor === PRESIDENT) return true;
  if (actor === VICE) return action !== 'dissolve';
  return false;
}
