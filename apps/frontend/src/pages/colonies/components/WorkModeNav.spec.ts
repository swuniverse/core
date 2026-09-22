import { getWorkModeForTab, WORK_MODE_DEFINITIONS } from './WorkModeNav';

describe('WorkModeNav', () => {
  it('groups ship construction under Bauen and fleet management under Flotte', () => {
    expect(getWorkModeForTab('hangar')).toBe('construction');
    expect(getWorkModeForTab('shipyard')).toBe('construction');
    expect(getWorkModeForTab('orbit')).toBe('fleet');
    expect(getWorkModeForTab('crew')).toBe('fleet');

    expect(
      WORK_MODE_DEFINITIONS.find((mode) => mode.key === 'construction')?.tabs,
    ).toEqual(['build', 'hangar', 'shipyard', 'buildingManagement']);
    expect(
      WORK_MODE_DEFINITIONS.find((mode) => mode.key === 'fleet')?.tabs,
    ).toEqual(['orbit', 'crew']);
  });
});
