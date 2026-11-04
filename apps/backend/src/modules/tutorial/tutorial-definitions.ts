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
    spacecraft: [
      {
        id: 'spacecraft-list',
        title: 'Deine Flotte',
        text: 'In der Flottenübersicht findest du Schiffe und Stationen samt Hülle, Schilden, EPS, Crew und Systemstatus. Wähle ein Schiff, um seine Stationen zu öffnen.',
        targets: ['ship-list'],
      },
      {
        id: 'spacecraft-header',
        title: 'Schiffskopf',
        text: 'Der Schiffskopf zeigt Hülle, Schilde, EPS und Crew. Prüfe diese Werte vor jedem Einsatz, bevor dein Schiff den Hangar verlässt.',
        targets: ['ship-header'],
        fallbackIndex: 0,
      },
      {
        id: 'spacecraft-systems',
        title: 'Systeme schalten',
        text: 'In der Schiffskontrolle aktivierst oder deaktivierst du Systeme. Jedes aktive System beansprucht Energie aus dem EPS.',
        targets: ['ship-systems'],
        fallbackIndex: 0,
      },
      {
        id: 'spacecraft-energy',
        title: 'Energie im Blick',
        text: 'Die EPS-Anzeige hält Erzeugung und Systemverbrauch fest. Schalte nur Systeme zu, deren Energie dein Reaktor bereitstellen kann.',
        targets: ['ship-header'],
        fallbackIndex: 0,
      },
      {
        id: 'spacecraft-alert',
        title: 'Alarmstufe',
        text: 'Die Alarmstufe bereitet dein Schiff auf die Lage vor. Wähle Grün für Routine, Gelb für erhöhte Bereitschaft oder Rot für Gefecht.',
        targets: ['ship-alarm'],
        fallbackIndex: 0,
      },
      {
        id: 'spacecraft-navigation',
        title: 'Navigation',
        text: 'Aktiviere die Langstreckensensoren, um die Karte und mögliche Flugfelder zu prüfen. Der Galaxieflug führt feldweise über die Sternenkarte.',
        targets: ['ship-navigation'],
        fallbackIndex: 0,
      },
      {
        id: 'spacecraft-flight',
        title: 'Galaxieflug',
        text: 'Wähle ein erreichbares Nachbarfeld und bestätige den Flug. Jeder Schritt deines Schiffs wird auf der Galaxiekarte sichtbar.',
        targets: ['ship-navigation'],
        waitFor: 'spacecraft.flight.started',
        fallbackIndex: 0,
      },
      {
        id: 'spacecraft-nearby',
        title: 'NBS-Liste',
        text: 'Aktiviere die Nahbereichssensoren, um Schiffe, Stationen und andere Ziele in deiner Nähe zu erfassen.',
        targets: ['ship-nearby'],
        fallbackIndex: 0,
      },
    ],
    starmap: [
      {
        id: 'starmap-layers',
        title: 'Kartenebenen',
        text: 'Mit der Ebenenauswahl wechselst du zwischen den kartierten Regionen der Galaxis.',
        targets: ['map-layer'],
      },
      {
        id: 'starmap-navigation',
        title: 'Sternenkarte bewegen',
        text: 'Zoome hinein oder heraus und passe die Ansicht an, um Felder und Entfernungen zu überblicken.',
        targets: ['map-view-controls'],
        fallbackIndex: 0,
      },
      {
        id: 'starmap-systems',
        title: 'Sternensysteme',
        text: 'Wähle ein bekanntes Sternensystem, um seine Felder auf der Karte einzublenden. Systemdaten bleiben durch deine persönliche Systementdeckung geschützt.',
        targets: ['map-system-details'],
        fallbackIndex: 0,
      },
      {
        id: 'starmap-legend',
        title: 'Kartenlegende',
        text: 'Die Legende erklärt die Symbole für Sternensysteme, Schiffe und Hyperraumrouten. Hyperraumrouten zeigen Wege, verkürzen aber nicht den feldweisen Galaxieflug.',
        targets: ['map-legend'],
        fallbackIndex: 0,
      },
    ],
    messages: [
      {
        id: 'messages-folders',
        title: 'Deine Nachrichtenordner',
        text: 'Persönliche Nachrichten, Schiffs- und Kolonieberichte sowie dein Postausgang sind nach Ordnern geordnet.',
        targets: ['message-folders'],
      },
      {
        id: 'messages-compose',
        title: 'Nachricht verfassen',
        text: 'Wähle einen Siedler, gib Betreff und Nachricht ein und sende deine Botschaft über das Holonet.',
        targets: ['message-compose'],
        fallbackIndex: 0,
      },
      {
        id: 'messages-send',
        title: 'Nachricht senden',
        text: 'Sende eine Nachricht, sobald Empfänger, Betreff und Text bereit sind.',
        targets: ['message-send'],
        waitFor: 'messages.sent',
        fallbackIndex: 0,
      },
    ],
    holonet: [
      {
        id: 'holonet-read',
        title: 'Das HoloNet-Archiv',
        text: 'Lies die Beiträge aus News, Handel, Rekrutierung und Rollenspiel. Kategorien und Suche helfen dir, wichtige Meldungen zu finden.',
        targets: ['holonet-archive'],
      },
      {
        id: 'holonet-write',
        title: 'Im HoloNet schreiben',
        text: 'Veröffentliche einen Beitrag mit Titel, Kategorie und Inhalt. Dein Bericht wird nach dem Senden im HoloNet sichtbar.',
        targets: ['holonet-compose'],
        waitFor: 'holonet.post.created',
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
