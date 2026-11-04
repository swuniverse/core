import type { TutorialDefinitions } from '@swuniverse/shared';

export const TUTORIAL_DEFINITIONS: TutorialDefinitions = {
  version: 2,
  views: {
    maindesk: [
      {
        id: 'maindesk-header',
        title: 'Dein Kommandozentrum',
        text: 'Im Header behältst du Kolonien, Forschung und Nachrichten im Blick. Von hier führst du dein Imperium durch die Galaxis.',
        targets: ['maindesk-header'],
      },
      {
        id: 'maindesk-colonies',
        title: 'Deine Kolonien',
        text: 'Die Kolonieliste zeigt Energie, Lager und den Zustand jeder Kolonie. Wähle eine Kolonie, um ihre Oberfläche zu verwalten.',
        targets: ['maindesk-colonies'],
        fallbackIndex: 0,
      },
      {
        id: 'maindesk-limits',
        title: 'Deine Grenzen',
        text: 'Kolonie- und Crewlimits bestimmen, wie weit du expandieren kannst. Neue Forschungen erweitern diese Möglichkeiten.',
        targets: ['maindesk-limits'],
        fallbackIndex: 0,
      },
      {
        id: 'maindesk-processes',
        title: 'Laufende Prozesse',
        text: 'Bauaufträge, Forschung und Werftarbeiten laufen über mehrere Hauptticks. Hier erkennst du ihren Fortschritt sofort.',
        targets: ['maindesk-processes'],
        fallbackIndex: 0,
      },
      {
        id: 'maindesk-navigation',
        title: 'Navigation',
        text: 'Über die Navigation wechselst du zwischen Kolonien, Forschung, Nachrichten und den weiteren Bereichen deines Imperiums.',
        targets: ['main-navigation'],
        fallbackIndex: 0,
      },
    ],
    colony: [
      {
        id: 'colony-surface',
        title: 'Kolonieoberfläche',
        text: 'Die Oberfläche zeigt Orbit, Oberfläche und Untergrund. Jedes Feld kann Gebäude, Bauaufträge oder besondere Eigenschaften enthalten.',
        targets: ['colony-surface'],
      },
      {
        id: 'colony-field',
        title: 'Ein Feld wählen',
        text: 'Wähle ein Feld auf der Oberfläche, um seinen Zustand zu prüfen und passende Aktionen zu öffnen.',
        targets: ['colony-field'],
        fallbackIndex: 0,
      },
      {
        id: 'colony-build-menu',
        title: 'Gebäude auswählen',
        text: 'Im Baumenü wählst du ein baubares Gebäude. Danach markiert die Oberfläche die passenden Felder.',
        targets: ['colony-build-menu'],
        fallbackIndex: 0,
      },
      {
        id: 'colony-build-start',
        title: 'Ersten Bauauftrag starten',
        text: 'Wähle ein Gebäude und dann ein passendes Feld. Der Bauauftrag läuft über Hauptticks und erscheint in deinen Prozessen.',
        targets: ['colony-surface'],
        waitFor: 'colony.build.started',
        fallbackIndex: 0,
      },
      {
        id: 'colony-energy',
        title: 'Energiebilanz',
        text: 'Energie versorgt deine Gebäude. Achte auf Erzeugung, Verbrauch und die Bilanz pro Haupttick.',
        targets: ['colony-energy'],
        fallbackIndex: 0,
      },
      {
        id: 'colony-storage',
        title: 'Lagerbilanz',
        text: 'Das Lager hält Ressourcen für Bau und Produktion bereit. Ist es voll, geht weiterer Ertrag verloren.',
        targets: ['colony-storage'],
        fallbackIndex: 0,
      },
      {
        id: 'colony-population',
        title: 'Bevölkerung',
        text: 'Bevölkerung stellt Arbeiter für Gebäude. Freier Wohnraum und verfügbare Arbeiter sichern den Ausbau deiner Kolonie.',
        targets: ['colony-population'],
        fallbackIndex: 0,
      },
      {
        id: 'colony-building-control',
        title: 'Gebäudeschaltung',
        text: 'In der Gebäudeschaltung aktivierst oder deaktivierst du Anlagen gezielt, wenn Energie oder Rohstoffe knapp werden.',
        targets: ['colony-building-control'],
        fallbackIndex: 0,
      },
    ],
    research: [
      {
        id: 'research-list',
        title: 'Verfügbare Forschung',
        text: 'Die Forschungsliste zeigt Technologien, die dein Imperium weiterentwickeln. Wähle eine Forschung für Details und Voraussetzungen.',
        targets: ['research-list'],
      },
      {
        id: 'research-detail',
        title: 'Forschungsdetails',
        text: 'Im Detail siehst du Forschungspunkte, benötigte Waren und die Auswirkungen einer Technologie.',
        targets: ['research-detail'],
        fallbackIndex: 0,
      },
      {
        id: 'research-start',
        title: 'Forschung starten',
        text: 'Starte eine verfügbare Forschung. Sie verbraucht Forschungspunkte über Hauptticks.',
        targets: ['research-start'],
        waitFor: 'research.started',
        fallbackIndex: 0,
      },
      {
        id: 'research-queue',
        title: 'Forschungswarteschlange',
        text: 'Läuft bereits Forschung, kannst du weitere Technologien einreihen. SWU arbeitet die Warteschlange nacheinander ab.',
        targets: ['research-queue'],
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
