/**
 * STU-classId <-> SWU-Archetyp - Zuordnung fuer den Admin-Schalter
 * "SET EMPTY TO SWU" / "SET EMPTY TO STU" (siehe starmap-admin.service.ts).
 * Nur unbewohnte Planeten/Monde werden umgestellt - Felder existieren fuer
 * unkolonisierte Objekte noch nicht (die entstehen erst bei der eigentlichen
 * Kolonisierung), es muss also nur die classId (und zum Zurueckstellen die
 * gesicherte originalClassId) angefasst werden. Rotation/Body-Feature (nur
 * fuer die Klassen relevant, die NICHT rotating+base sind - S/T/J) werden als
 * kleiner technischer Suffix im Namen kodiert (siehe inferSwuInstanceFromName
 * in swu-planet-archetypes.generator.ts - das ist bereits die einzige Quelle
 * dafuer, solange CelestialObject keine eigenen Spalten dafuer hat).
 *
 * Aus der Balancing-Konversation (stu-colony-classes.yaml, Klassen-Buchstabe
 * -> Archetyp):
 *   M -> Erdaehnlich, L -> Waldplanet, O -> Ozeanwelt, K -> Marsartig,
 *   H -> Wueste, P/P-T -> Arktisch, X -> Lavaplanet, G -> Tundraartig,
 *   Q -> Gasplanet Variante A, D -> Mondartig, N -> Giftwelt,
 *   I-1/2/3 -> Gasplanet Variante B/C/D, J-1/2/3 -> Gasplanet Variante B/C/D
 *   MIT RING, S -> Ozeanwelt gebunden (Tagseite Meer/Nachtseite Eis, mild),
 *   T -> Erdaehnlich gebunden (Tagseite "richtig heiss", Eyeball-Planet).
 * "-R"-Varianten (Ring) teilen sich denselben Buchstaben/dieselbe Zuordnung
 * wie ihre Basis-Klasse. S/T/N/I-x/J-x hatten VORHER keine baseProduction in
 * stu-colony-classes.yaml eingetragen (dort als "Platzhalter" behandelt) -
 * sind aber laut Auftraggeber echte, bespielbare Klassen.
 */

import { buildSwuTestClassId } from './swu-system-generator';
import { findArchetypeBySwuClassId } from './swu-archetype-registry';
import type {
  SwuBodyFeature,
  SwuRotationType,
} from './swu-planet-archetypes.generator';
import {
  SWU_ROTATION_CODE,
  SWU_BODY_FEATURE_CODE,
} from './swu-planet-archetypes.generator';

interface SwuArchetypeRef {
  typeId: number;
  variant: string | null;
  /** Default 'rotating' - nur bei S/T (gebunden) abweichend. */
  rotation?: SwuRotationType;
  /** Default 'base' - nur bei J-1/2/3 (Ring) abweichend. */
  bodyFeature?: SwuBodyFeature;
}

/** STU-classId -> SWU-Archetyp, direkt aus der Balancing-Konversation. */
const STU_CLASS_ID_TO_ARCHETYPE: Record<number, SwuArchetypeRef> = {
  // Planet (type: 1)
  201: { typeId: 1, variant: null }, // M -> Erdaehnlich
  203: { typeId: 3, variant: null }, // L -> Waldplanet
  205: { typeId: 2, variant: null }, // O -> Ozeanwelt
  207: { typeId: 2, variant: null, rotation: 'tidal-locked' }, // S -> Ozeanwelt gebunden
  209: { typeId: 1, variant: null, rotation: 'tidal-locked' }, // T -> Erdaehnlich gebunden (vorne heiss)
  211: { typeId: 9, variant: null }, // K -> Marsartig
  213: { typeId: 6, variant: null }, // H -> Wueste
  215: { typeId: 10, variant: null }, // P -> Arktisch
  216: { typeId: 10, variant: null }, // P-T -> Arktisch
  217: { typeId: 13, variant: null }, // X -> Lavaplanet
  219: { typeId: 8, variant: null }, // G -> Tundraartig
  221: { typeId: 15, variant: 'A' }, // Q -> Gasplanet A
  223: { typeId: 14, variant: null }, // N -> Giftwelt
  231: { typeId: 12, variant: null }, // D -> Mondartig
  261: { typeId: 15, variant: 'B' }, // I-1 -> Gasplanet B
  262: { typeId: 15, variant: 'C' }, // I-2 -> Gasplanet C
  263: { typeId: 15, variant: 'D' }, // I-3 -> Gasplanet D
  361: { typeId: 15, variant: 'B', bodyFeature: 'ring' }, // J-1 -> Gasplanet B, Ring
  362: { typeId: 15, variant: 'C', bodyFeature: 'ring' }, // J-2 -> Gasplanet C, Ring
  363: { typeId: 15, variant: 'D', bodyFeature: 'ring' }, // J-3 -> Gasplanet D, Ring
  // Planet, Ring-Variante ("-R", teilt sich die Zuordnung der Basis-Klasse)
  301: { typeId: 1, variant: null },
  303: { typeId: 3, variant: null },
  305: { typeId: 2, variant: null },
  311: { typeId: 9, variant: null },
  313: { typeId: 6, variant: null },
  315: { typeId: 10, variant: null },
  331: { typeId: 12, variant: null },
  // Mond (type: 2)
  401: { typeId: 1, variant: null },
  403: { typeId: 3, variant: null },
  405: { typeId: 2, variant: null },
  407: { typeId: 2, variant: null, rotation: 'tidal-locked' },
  409: { typeId: 1, variant: null, rotation: 'tidal-locked' },
  411: { typeId: 9, variant: null },
  413: { typeId: 6, variant: null },
  415: { typeId: 10, variant: null },
  416: { typeId: 10, variant: null },
  417: { typeId: 13, variant: null },
  419: { typeId: 8, variant: null },
  421: { typeId: 15, variant: 'A' },
  423: { typeId: 14, variant: null },
  431: { typeId: 12, variant: null },
};

/** SWU-Archetyp-Referenz (typeId+variant+rotation/bodyFeature) fuer eine STU-classId, null wenn unbekannt. */
export function getSwuArchetypeForStuClassId(classId: number): SwuArchetypeRef | null {
  return STU_CLASS_ID_TO_ARCHETYPE[classId] ?? null;
}

/** Synthetische SWU-classId fuer eine STU-classId, null wenn keine Zuordnung existiert. */
export function getSwuClassIdForStuClassId(classId: number): number | null {
  const archetype = getSwuArchetypeForStuClassId(classId);
  if (!archetype) return null;
  return buildSwuTestClassId(archetype.typeId, archetype.variant);
}

/** Alle STU-classIds, fuer die eine SWU-Zuordnung existiert (Grundlage fuer die "SET EMPTY TO SWU"-Abfrage). */
export function getMappedStuClassIds(): number[] {
  return Object.keys(STU_CLASS_ID_TO_ARCHETYPE).map(Number);
}

const SWU_NAME_SUFFIX_PATTERN = / \[P\d+[GR][RMB]\]$/;

/**
 * Technischer Namens-Suffix (z.B. " [P1GB]"), NUR wenn Rotation/Body-Feature
 * vom Default (rotating+base) abweichen - sonst null (kein Suffix noetig,
 * inferSwuInstanceFromName faellt dann ohnehin auf rotating+base zurueck).
 * Wird an den bestehenden (echten) Objektnamen angehaengt, nicht anstelle -
 * "Coruscant" -> "Coruscant [P1GB]", der Name bleibt lesbar.
 */
export function getSwuNameSuffixForStuClassId(classId: number): string | null {
  const archetype = getSwuArchetypeForStuClassId(classId);
  if (!archetype) return null;
  const rotation = archetype.rotation ?? 'rotating';
  const bodyFeature = archetype.bodyFeature ?? 'base';
  if (rotation === 'rotating' && bodyFeature === 'base') return null;
  return ` [P${archetype.typeId}${SWU_ROTATION_CODE[rotation]}${SWU_BODY_FEATURE_CODE[bodyFeature]}]`;
}

/** Entfernt einen zuvor per getSwuNameSuffixForStuClassId angehaengten Suffix wieder (Umkehrung beim Zurueckstellen auf STU). */
export function stripSwuNameSuffix(name: string | null): string | null {
  if (!name) return name;
  return name.replace(SWU_NAME_SUFFIX_PATTERN, '');
}

/**
 * Stellt ein Objekt mit bekannter STU-classId auf seinen SWU-Archetyp um
 * (classId tauschen, urspruengliche in originalClassId sichern, Namens-Suffix
 * anhaengen). Gibt false zurueck, wenn keine Zuordnung existiert - das Objekt
 * bleibt dann unveraendert. Gemeinsame Logik fuer die Admin-Umstellung und das
 * automatische Umstellen beim Aufgeben einer Kolonie.
 */
export function convertObjectToSwu(object: {
  classId: number | null;
  originalClassId: number | null;
  name: string | null;
  swuRotation?: SwuRotationType | null;
  swuRing?: boolean;
  isColonizable?: boolean;
}): boolean {
  if (object.classId == null) return false;
  const swuClassId = getSwuClassIdForStuClassId(object.classId);
  if (swuClassId == null) return false;
  const archetype = getSwuArchetypeForStuClassId(object.classId);
  object.originalClassId = object.classId;
  object.classId = swuClassId;
  object.swuRotation = archetype?.rotation ?? 'rotating';
  object.swuRing = archetype?.bodyFeature === 'ring';
  // Kolonisierbarkeit folgt dem SWU-Archetyp, nicht der alten STU-Klasse
  // (z.B. STU "S" ist unbewohnbar, SWU "Ozeanwelt gebunden" aber landable).
  object.isColonizable = findArchetypeBySwuClassId(swuClassId)?.landable ?? false;
  const suffix = getSwuNameSuffixForStuClassId(object.originalClassId);
  if (suffix) {
    object.name = `${stripSwuNameSuffix(object.name) ?? ''}${suffix}`;
  }
  return true;
}
