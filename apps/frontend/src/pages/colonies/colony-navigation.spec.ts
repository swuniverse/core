import {
  COLONY_MAIN_VIEWS,
  getBuildingContextActions,
} from './colony-navigation';

describe('colony navigation', () => {
  it('defines exactly the five approved main views', () => {
    expect(COLONY_MAIN_VIEWS.map((view) => view.label)).toEqual([
      'Informationen',
      'Baumenü',
      'Soziales',
      'Gebäudeschaltung',
      'Einstellungen',
    ]);
  });

  it('maps field functions to enabled context actions', () => {
    expect(
      getBuildingContextActions([4, 6, 10, 24], true).map((action) => [
        action.view,
        action.enabled,
      ]),
    ).toEqual([
      ['hangar', true],
      ['shipyard', true],
      ['fabrication', true],
      ['defense', true],
    ]);
  });

  it('keeps an inactive function visible with a reason', () => {
    expect(getBuildingContextActions([4], false)).toEqual([
      {
        view: 'hangar',
        label: 'Hangar öffnen',
        enabled: false,
        reason: 'Gebäude ist deaktiviert',
      },
    ]);
  });

  it('recognizes every canonical function group boundary', () => {
    expect(
      getBuildingContextActions(
        [5, 6, 7, 8, 21, 9, 18, 29, 30, 24, 28],
        true,
      ).map((action) => action.view),
    ).toEqual(['shipyard', 'fabrication', 'defense']);
  });

  it('deduplicates functions belonging to the same context view', () => {
    expect(
      getBuildingContextActions([5, 6, 9, 10, 24, 25], true).map(
        (action) => action.view,
      ),
    ).toEqual(['shipyard', 'fabrication', 'defense']);
  });
});
