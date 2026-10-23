import { validateTutorialDefinitions } from './tutorial-definitions';

const validDefinitions = {
  version: 1,
  views: {
    maindesk: [
      { id: 'welcome', title: 'Willkommen', text: 'Willkommen in SWU' },
      {
        id: 'navigation',
        title: 'Navigation',
        text: 'Nutze die Navigation',
        targets: ['main-navigation'],
        waitFor: 'navigation.opened',
        fallbackIndex: 0,
      },
    ],
  },
} as const;

describe('tutorial definitions', () => {
  it('accepts versioned tutorials with unique step ids and valid fallbacks', () => {
    expect(validateTutorialDefinitions(validDefinitions)).toEqual(validDefinitions);
  });

  it('rejects duplicate step ids', () => {
    expect(() =>
      validateTutorialDefinitions({
        version: 1,
        views: {
          maindesk: [
            { id: 'welcome', title: 'A', text: 'A' },
            { id: 'welcome', title: 'B', text: 'B' },
          ],
        },
      }),
    ).toThrow('Duplicate tutorial step id "welcome"');
  });

  it('rejects fallback indexes outside the view', () => {
    expect(() =>
      validateTutorialDefinitions({
        version: 1,
        views: {
          maindesk: [
            { id: 'welcome', title: 'A', text: 'A', fallbackIndex: 1 },
          ],
        },
      }),
    ).toThrow('Invalid fallbackIndex 1');
  });
});
