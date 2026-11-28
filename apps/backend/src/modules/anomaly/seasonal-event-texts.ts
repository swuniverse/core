import { Faction } from '@swuniverse/shared';

/** Order 66 texts of the winter event (bounty hunter, 1–24 December). */
export const WINTER_ANNOUNCEMENT: Record<Faction, string> = {
  [Faction.GALACTIC_EMPIRE]:
    'Dreckige Rebellen haben einen Kopfgeldjäger beauftragt, um einen von uns zu entführen! Hiermit gebe ich Ihnen den Auftrag: Lokalisieren Sie den Kopfgeldjäger und stellen Sie ihn!\nAls Hilfestellung haben wir Ihren Technikern erklärt, wie sie die Sensoren modifizieren können.',
  [Faction.REBEL_ALLIANCE]:
    'Die Schergen des Moff machen sich nicht einmal mehr selbst die Finger schmutzig! Das Imperium hat einen Kopfgeldjäger beauftragt, um einen von uns zu entführen! Hiermit gebe ich Ihnen den Auftrag: Lokalisieren Sie den Kopfgeldjäger und stellen Sie ihn!\nAls Hilfestellung haben wir Ihren Technikern erklärt, wie sie die Sensoren modifizieren können.',
};
export const WINTER_DAILY = 'Haben Sie Neuigkeiten vom Kopfgeldjäger?';
export const WINTER_CAUGHT =
  'Er wurde gefasst! Wir haben es denen gezeigt.';
export const WINTER_AWARD_KEYS: Record<Faction, string> = {
  [Faction.REBEL_ALLIANCE]: 'BOUNTY_HUNTER_CAUGHT_REBEL',
  [Faction.GALACTIC_EMPIRE]: 'BOUNTY_HUNTER_CAUGHT_EMPIRE',
};
