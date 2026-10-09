import { AllianceRole } from '@swuniverse/shared';
import {
  ALLIANCE_ACTIONS,
  ALLIANCE_MEMBER_ACTIONS,
  AllianceAction,
  AllianceMemberAction,
  mayActOnAlliance,
  mayActOnMember,
} from './alliance-permissions';

const { NONE, PRESIDENT, VICE, DIPLOMAT } = AllianceRole;
const ROLES = [PRESIDENT, VICE, DIPLOMAT, NONE];

// Every allowed (actor, action, target) combination. Everything else is denied.
const ALLOWED_MEMBER_ACTIONS: Array<
  [AllianceRole, AllianceMemberAction, AllianceRole]
> = [
  [PRESIDENT, 'kick', VICE],
  [PRESIDENT, 'kick', DIPLOMAT],
  [PRESIDENT, 'kick', NONE],
  [PRESIDENT, 'appointVice', DIPLOMAT],
  [PRESIDENT, 'appointVice', NONE],
  [PRESIDENT, 'appointDiplomat', VICE],
  [PRESIDENT, 'appointDiplomat', NONE],
  [PRESIDENT, 'dismiss', VICE],
  [PRESIDENT, 'dismiss', DIPLOMAT],
  [PRESIDENT, 'transferPresidency', VICE],
  [PRESIDENT, 'transferPresidency', DIPLOMAT],
  [PRESIDENT, 'transferPresidency', NONE],
  [VICE, 'kick', DIPLOMAT],
  [VICE, 'kick', NONE],
  [VICE, 'appointDiplomat', NONE],
  [VICE, 'dismiss', DIPLOMAT],
];

const ALLOWED_ALLIANCE_ACTIONS: Array<[AllianceRole, AllianceAction]> =
  [
    [PRESIDENT, 'manageApplications'],
    [PRESIDENT, 'editDetails'],
    [PRESIDENT, 'dissolve'],
    [PRESIDENT, 'declareWar'],
    [PRESIDENT, 'manageDiplomacy'],
    [VICE, 'manageApplications'],
    [VICE, 'editDetails'],
    [PRESIDENT, 'viewShipManagementDetails'],
    [PRESIDENT, 'moderateForum'],
    [VICE, 'moderateForum'],
    [VICE, 'viewShipManagementDetails'],
    [PRESIDENT, 'viewMemberOperations'],
    [VICE, 'viewMemberOperations'],
    [PRESIDENT, 'manageBanner'],
    [VICE, 'manageBanner'],
    [DIPLOMAT, 'declareWar'],
    [DIPLOMAT, 'manageDiplomacy'],
  ];

describe('mayActOnMember', () => {
  for (const actor of ROLES) {
    for (const action of ALLIANCE_MEMBER_ACTIONS) {
      for (const target of ROLES) {
        const allowed = ALLOWED_MEMBER_ACTIONS.some(
          ([a, act, t]) => a === actor && act === action && t === target,
        );
        it(`${actor} ${allowed ? 'may' : 'may not'} ${action} ${target}`, () => {
          expect(mayActOnMember(actor, action, target)).toBe(allowed);
        });
      }
    }
  }
});

describe('mayActOnAlliance', () => {
  for (const actor of ROLES) {
    for (const action of ALLIANCE_ACTIONS) {
      const allowed = ALLOWED_ALLIANCE_ACTIONS.some(
        ([a, act]) => a === actor && act === action,
      );
      it(`${actor} ${allowed ? 'may' : 'may not'} ${action}`, () => {
        expect(mayActOnAlliance(actor, action)).toBe(allowed);
      });
    }
  }
});
