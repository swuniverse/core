import { Faction } from '@swuniverse/shared';
import {
  isCloaked,
  isHiddenFromViewer,
  mayUseCloak,
} from './spacecraft-cloak';

const ship = (userId: number, active?: boolean) =>
  ({
    userId,
    runtimeSystems: active === undefined ? {} : { CLOAK: { active } },
  }) as never;

describe('spacecraft cloak', () => {
  it('reserves the generator for the Galactic Empire', () => {
    expect(mayUseCloak(Faction.GALACTIC_EMPIRE)).toBe(true);
    expect(mayUseCloak(Faction.REBEL_ALLIANCE)).toBe(false);
    expect(mayUseCloak(null)).toBe(false);
  });

  it('hides active cloaks from everyone but the owner', () => {
    expect(isCloaked(ship(1, true))).toBe(true);
    expect(isCloaked(ship(1, false))).toBe(false);
    expect(isCloaked(ship(1))).toBe(false);
    expect(isHiddenFromViewer(ship(1, true), 2)).toBe(true);
    expect(isHiddenFromViewer(ship(1, true), 1)).toBe(false);
    expect(isHiddenFromViewer(ship(1, false), 2)).toBe(false);
  });
});
