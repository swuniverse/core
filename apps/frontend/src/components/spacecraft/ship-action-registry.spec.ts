import { SHIP_ACTIONS } from './ship-action-registry';

describe('SHIP_ACTIONS', () => {
  it('documents every action with user feedback and an authoritative destination', () => {
    expect(Object.keys(SHIP_ACTIONS).length).toBeGreaterThanOrEqual(25);

    for (const definition of Object.values(SHIP_ACTIONS)) {
      expect(definition.label).toBeTruthy();
      expect(definition.destination).toMatch(/^(GET|POST|PUT|PATCH|DELETE|\/)/);
      expect(definition.pending).toBeTruthy();
      expect(definition.success).toBeTruthy();
      expect(definition.failure).toBeTruthy();
      expect(Array.isArray(definition.refresh)).toBe(true);
    }
  });

  it('keeps installed modules read-only on ship detail', () => {
    expect(SHIP_ACTIONS.modules.destination).toBe(
      'GET /spacecraft/:id/modules',
    );
    expect(SHIP_ACTIONS.modules.destination).not.toMatch(
      /install|level-up|DELETE/i,
    );
  });

  it('marks missing backend capabilities as planned rather than existing', () => {
    for (const key of [
      'details',
      'communication',
      'lssMode',
      'standby',
      'selfDestruct',
      'energyFlow',
      'sectorScan',
      'fieldScan',
    ] as const) {
      expect(SHIP_ACTIONS[key].availability).toBe('planned');
    }
  });
});
