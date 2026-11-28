import { Faction } from '@swuniverse/shared';

/**
 * Awards that exist once per faction (own artwork, same text and prestige).
 * Keys are `<NAME>_REBEL` / `<NAME>_EMPIRE`; star-system awards per layer are
 * `NAVIGATOR_REBEL_L<id>` / `NAVIGATOR_EMPIRE_L<id>`. The Rebel key is the one
 * stored in `database_category_awards`; `factionAwardKey` resolves the key of
 * the player's faction.
 */
export interface FactionAwardDef {
  name: string;
  prestige: number;
  imageRebel: string;
  imageEmpire: string;
  /** Order 66 sent to the player on the first grant. */
  order: string;
}

const AWARD_IMAGE_DIR = '/assets/awards';

export const FACTION_AWARDS = {
  HULL_INSPECTOR: {
    name: 'Werft Inspektor',
    prestige: 30,
    imageRebel: `${AWARD_IMAGE_DIR}/AAHI.png`,
    imageEmpire: `${AWARD_IMAGE_DIR}/AIHI.png`,
    order:
      'Gratulation, Ihre unermüdliche Analysearbeit hat dafür gesorgt, dass unsere Mechaniker künftig auf komplette Datenbank bestände zugreifen können.\nAls Dank übergeben wir euch einen WAC-47 Reperatur Droiden, wir wissen, dass diese Baureihe leichte Mängel hat, dennoch wird er sicher hilfreich sein',
  },
  SCRAP_NOMAD: {
    name: 'Schrottplatz Nomade',
    prestige: 100,
    imageRebel: `${AWARD_IMAGE_DIR}/AASH.png`,
    imageEmpire: `${AWARD_IMAGE_DIR}/AISH.png`,
    order:
      'Ihr habt Schiffe gefunden, die nicht einmal mehr in Museen stehen — und das aus gutem Grund.\nDamit Ihr das nächste mal, wenn Ihr vor uns steht, nicht wieder so ölverschmiert seid, überstellen wir euch eine B2EMO Bergungsunterstützungseinheit.',
  },
  SCOUT: {
    name: 'Kundschafter',
    prestige: 50,
    imageRebel: `${AWARD_IMAGE_DIR}/AAS1.png`,
    imageEmpire: `${AWARD_IMAGE_DIR}/AIS1.png`,
    order:
      'Eure Kundschafter konnten ihre Datenbanken komplettieren! Behaltet den Kundschafter-Droiden. Wir brauchen ihn nicht mehr.',
  },
  ASTRO_DROID: {
    name: 'Astro-Droide',
    prestige: 75,
    imageRebel: `${AWARD_IMAGE_DIR}/AAS2.png`,
    imageEmpire: `${AWARD_IMAGE_DIR}/AIS2.png`,
    order:
      'Eure Kundschafter konnten ihre Datenbanken komplettieren! Wir programmieren gerade einen R5 Droiden mit den neuesten Daten, er wird euch sicher eine Hilfe sein.',
  },
  NAVIGATOR: {
    name: 'Navigator',
    prestige: 100,
    imageRebel: `${AWARD_IMAGE_DIR}/AAS3.png`,
    imageEmpire: `${AWARD_IMAGE_DIR}/AIS3.png`,
    order:
      'Eure Kundschafter konnten ihre Datenbanken komplettieren! Wir programmieren gerade einen Navigations Droiden mit den neuesten Daten, er wird euch sicher eine Hilfe sein.',
  },
  RPG_SILVER: {
    name: 'Protokoll Droide',
    prestige: 200,
    imageRebel: `${AWARD_IMAGE_DIR}/AARPS.png`,
    imageEmpire: `${AWARD_IMAGE_DIR}/AIRPS.png`,
    order: 'Ihre Anwesenheit ist eine Freude! Es ist Zeit, Danke zu sagen.',
  },
  RPG_GOLD: {
    name: 'Protokoll Chef',
    prestige: 500,
    imageRebel: `${AWARD_IMAGE_DIR}/AARPG.png`,
    imageEmpire: `${AWARD_IMAGE_DIR}/AIRPG.png`,
    order: 'Ihre Anwesenheit ist eine Ehre! Es ist Zeit, Danke zu sagen.',
  },
} as const satisfies Record<string, FactionAwardDef>;

export type FactionAwardName = keyof typeof FACTION_AWARDS;

const REBEL_SUFFIX = /_REBEL(?=_|$)/;
const EMPIRE_SUFFIX = /_EMPIRE(?=_|$)/;

export function layerNavigatorAwardKey(layerId: number, faction: 'REBEL' | 'EMPIRE'): string {
  return `NAVIGATOR_${faction}_L${layerId}`;
}

/** Key of the faction variant of a stored (Rebel) or already faction-specific award key. */
export function factionAwardKey(key: string, faction: Faction | null | undefined): string {
  if (faction === Faction.GALACTIC_EMPIRE) return key.replace(REBEL_SUFFIX, '_EMPIRE');
  return key.replace(EMPIRE_SUFFIX, '_REBEL');
}

/** Both faction keys of a base name, e.g. `SCOUT` → SCOUT_REBEL, SCOUT_EMPIRE. */
export function factionAwardRows(
  name: FactionAwardName,
  keys: { rebel: string; empire: string } = { rebel: `${name}_REBEL`, empire: `${name}_EMPIRE` },
) {
  const def: FactionAwardDef = FACTION_AWARDS[name];
  return [
    { key: keys.rebel, description: def.name, image: def.imageRebel, prestige: def.prestige },
    { key: keys.empire, description: def.name, image: def.imageEmpire, prestige: def.prestige },
  ];
}

/** Order 66 when a database award is withdrawn because new entries made the category incomplete again. */
export const AWARD_REVOKED_ORDER =
  'Leider sind ihre Datenbanken veraltet — der Droide kann so nicht funktionieren!';

/** Order 66 text per award key (both faction variants, incl. per-layer navigator keys). */
export function awardOrderMessage(key: string): string | null {
  const match = /^([A-Z_]+?)_(?:REBEL|EMPIRE)(?:_L\d+)?$/.exec(key);
  const name = match?.[1] as FactionAwardName | undefined;
  return name && name in FACTION_AWARDS ? FACTION_AWARDS[name].order : null;
}
