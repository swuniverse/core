import type { TutorialDefinitions } from '@swuniverse/shared';

export const TUTORIAL_DEFINITIONS: TutorialDefinitions = {
  version: 1,
  views: {
    maindesk: [
      {
        id: 'welcome',
        title: 'Willkommen',
        text: 'Hier findest du die wichtigsten Informationen zu deinem Imperium.',
      },
      {
        id: 'navigation',
        title: 'Navigation',
        text: 'Über die Hauptnavigation erreichst du alle Spielbereiche.',
        targets: ['main-navigation'],
        fallbackIndex: 0,
      },
    ],
  },
};

export function validateTutorialDefinitions<T extends TutorialDefinitions>(
  definitions: T,
): T {
  if (!Number.isInteger(definitions.version) || definitions.version < 1) {
    throw new Error('Tutorial definition version must be a positive integer');
  }

  const globalIds = new Set<string>();
  for (const [view, steps] of Object.entries(definitions.views)) {
    steps.forEach((step, index) => {
      if (globalIds.has(step.id)) {
        throw new Error(`Duplicate tutorial step id "${step.id}"`);
      }
      globalIds.add(step.id);
      if (
        step.fallbackIndex != null &&
        (!Number.isInteger(step.fallbackIndex) ||
          step.fallbackIndex < 0 ||
          step.fallbackIndex >= steps.length ||
          step.fallbackIndex === index)
      ) {
        throw new Error(
          `Invalid fallbackIndex ${step.fallbackIndex} for tutorial step "${step.id}" in view "${view}"`,
        );
      }
    });
  }

  return definitions;
}
