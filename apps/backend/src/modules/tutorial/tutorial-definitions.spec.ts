import {
  TUTORIAL_DEFINITIONS,
  validateTutorialDefinitions,
} from './tutorial-definitions';

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
    expect(validateTutorialDefinitions(validDefinitions)).toEqual(
      validDefinitions,
    );
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

  it('defines the German maindesk, colony, and research walkthroughs', () => {
    const definitions = validateTutorialDefinitions(TUTORIAL_DEFINITIONS);

    expect(definitions.views.maindesk).toHaveLength(5);
    expect(definitions.views.colony).toHaveLength(8);
    expect(definitions.views.research).toHaveLength(4);
    expect(definitions.views.spacecraft).toHaveLength(8);
    expect(definitions.views.starmap).toHaveLength(4);
    expect(definitions.views.messages).toHaveLength(3);
    expect(definitions.views.holonet).toHaveLength(2);
    expect(
      definitions.views.spacecraft?.some(
        (step) => step.waitFor === 'spacecraft.flight.started',
      ),
    ).toBe(true);
    expect(
      definitions.views.messages?.some(
        (step) => step.waitFor === 'messages.sent',
      ),
    ).toBe(true);
    expect(
      definitions.views.holonet?.some(
        (step) => step.waitFor === 'holonet.post.created',
      ),
    ).toBe(true);
    expect(
      definitions.views.colony?.some(
        (step) => step.waitFor === 'colony.build.started',
      ),
    ).toBe(true);
    expect(
      definitions.views.research?.some(
        (step) => step.waitFor === 'research.started',
      ),
    ).toBe(true);
  });
});
