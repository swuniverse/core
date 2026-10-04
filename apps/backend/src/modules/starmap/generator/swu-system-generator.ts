/**
 * SWU System-Generator (eigenstaendig, parallel zum alten STU-System-Generator)
 * ------------------------------------------------------------------------------
 * Ziel dieser Datei: EINEN deterministischen Test-System-Layout bauen, der jeden
 * der 18 SWU-Planeten-Archetypen (siehe swu-planet-archetypes.generator.ts) genau
 * einmal als Hauptkoerper enthaelt - zum manuellen Durchtesten auf der bestehenden
 * Karte, BEVOR irgendwas am produktiven STU-Generator (starmap-system-generator.
 * service.ts) angefasst wird.
 *
 * Bewusste Design-Entscheidungen / Annahmen (bitte im Team abgleichen):
 *   - Rotation (rotating/tidal-locked) und bodyFeature (base/ring) werden pro
 *     Archetyp DETERMINISTISCH aus dem Index abgeleitet (kein Zufall), damit der
 *     Testlauf reproduzierbar ist und man gezielt sieht, welcher Slot was zeigt.
 *   - Monde: nur an ca. jedem 2. moonPossible-Planeten angehaengt (sonst waeren es
 *     zu viele Objekte fuer eine uebersichtliche Testkarte). Der Mond nutzt AKTUELL
 *     denselben Archetyp/typeId wie sein Planet (einfachster Default) - ob Monde
 *     stattdessen einen eigenen, unabhaengigen Typ bekommen sollen, ist noch offen
 *     und wurde in der Team-Diskussion nicht abschliessend geklaert.
 *   - classId-Ersatz: da die SWU-Archetypen kein STU-classId-Aequivalent haben,
 *     wird hier eine synthetische Nummer (90000 + typeId*10 + variantIndex)
 *     vergeben, die garantiert nicht mit echten STU-classIds (200er/400er/9000er)
 *     kollidiert. Sie hat noch KEIN passendes Bild-Asset - das Rendering greift
 *     fuer diese IDs ins Leere (404), bis es echte SWU-Assets/Mapping gibt. Das
 *     ist fuer diesen Testzweck (Platzierung/Struktur pruefen) hinnehmbar.
 *   - Layout ist ein einfaches Raster um einen Zentralstern, KEINE Orbit-Ring-
 *     Physik wie beim alten Generator - reicht fuer einen reinen Funktionstest.
 */

import { CelestialObjectType } from '../entities/celestial-object.entity';
import { SeededRNG } from './seeded-rng';
import {
  SWU_PLANET_ARCHETYPES,
  type SwuPlanetArchetype,
  type SwuRotationType,
  type SwuBodyFeature,
  buildSwuPlanetCode,
} from './swu-planet-archetypes.generator';

// ---------------------------------------------------------------------------
// Output-Shape - bewusst 1:1 kompatibel zu GeneratedSystemField/
// GeneratedCelestialObject/GeneratedSystemLayout aus starmap-system-generator.
// service.ts, damit die bestehende persistGeneratedLayout()-Pipeline diese Daten
// ohne Anpassung uebernehmen kann. Lokal neu deklariert statt importiert, damit
// diese Datei unabhaengig vom alten Generator bleibt.
// ---------------------------------------------------------------------------
export type SwuGeneratedSystemField = {
  sx: number;
  sy: number;
  fieldTypeKey: string;
  fieldTypeId?: number;
  objectKey?: string;
  regionKey?: string | null;
  adminRegionKey?: string | null;
  influenceAreaId?: number | null;
  borderMask?: string | null;
};

export type SwuGeneratedCelestialObject = {
  key: string;
  objectType: CelestialObjectType;
  name: string | null;
  posX: number;
  posY: number;
  classId: number | null;
  isColonizable: boolean;
  swuRotation?: SwuRotationType | null;
  swuRing?: boolean;
};

export type SwuGeneratedSystemLayout = {
  width: number;
  height: number;
  fields: SwuGeneratedSystemField[];
  objects: SwuGeneratedCelestialObject[];
};

/** Fixer Schluessel, um dieses eine Testsystem auf der Karte wiederzufinden (z.B. als landmarkKey). */
export const SWU_TEST_SYSTEM_KEY = 'swu-test-system';

const GRID_SPACING = 4;
const COLUMNS = 5;
const MARGIN = 3;

/**
 * Synthetische classId fuer SWU-Archetypen, kollisionsfrei zu allen bestehenden
 * STU-classIds (200er/400er-Planeten, 9001-9005 Sterne). Kein echtes Bild-Asset
 * dahinter - siehe Kopfkommentar.
 */
export function buildSwuTestClassId(typeId: number, variant: string | null): number {
  const variantIndex = variant ? variant.charCodeAt(0) - 'A'.charCodeAt(0) : 0;
  return 90000 + typeId * 10 + variantIndex;
}

function describeObject(
  archetype: SwuPlanetArchetype,
  rotation: SwuRotationType,
  bodyFeature: SwuBodyFeature,
): string {
  const variantLabel = archetype.variant ? ` ${archetype.variant}` : '';
  const rotationLabel = rotation === 'rotating' ? 'Rotierend' : 'Gebunden';
  const bodyLabel = bodyFeature === 'ring' ? 'Ring' : bodyFeature === 'moon' ? 'Mond' : 'Basis';
  const code = buildSwuPlanetCode(archetype, rotation, bodyFeature, 1);
  return `${archetype.typeName}${variantLabel} (${rotationLabel}, ${bodyLabel}) [${code.slice(0, code.length - 1)}]`;
}

/**
 * Baut den Testsystem-Layout: 1 Zentralstern + alle 18 SWU-Archetypen einmal als
 * Hauptplanet, deterministisch verteilt auf ein Raster. Seed nur fuer optionale
 * spaetere Zufallselemente reserviert - aktuell ist die Platzierung komplett
 * deterministisch (kein RNG-Aufruf noetig).
 */
export function createSwuTestSystemLayout(
  systemName: string,
  seed: string = SWU_TEST_SYSTEM_KEY,
): SwuGeneratedSystemLayout {
  // Reserviert fuer kuenftige Zufallsvarianz (z.B. falls Mond-Zuordnung mal
  // unabhaengig gewuerfelt werden soll) - aktuell ungenutzt.
  void new SeededRNG(seed);

  const archetypes = SWU_PLANET_ARCHETYPES;
  const rows = Math.ceil(archetypes.length / COLUMNS);
  const width = MARGIN * 2 + COLUMNS * GRID_SPACING + 2; // +2 Puffer fuer Monde rechts daneben
  const height = MARGIN * 2 + rows * GRID_SPACING + 2;
  const cx = Math.ceil(width / 2);
  const cy = Math.ceil(height / 2);

  const fields: SwuGeneratedSystemField[] = [];
  const objects: SwuGeneratedCelestialObject[] = [];

  // Phase 1: komplettes Hintergrund-Grid (jede Zelle braucht einen Eintrag, sonst
  // schlaegt die bestehende persistGeneratedLayout()-Pipeline beim Speichern fehl).
  for (let sy = 1; sy <= height; sy++) {
    for (let sx = 1; sx <= width; sx++) {
      fields.push({
        sx,
        sy,
        fieldTypeKey: 'EMPTY_SPACE',
        objectKey: undefined,
        regionKey: 'PLANETARY_BAND',
        adminRegionKey: 'SYS_PLANETARY_BAND',
        influenceAreaId: null,
        borderMask: null,
      });
    }
  }

  const findField = (sx: number, sy: number) => fields.find((f) => f.sx === sx && f.sy === sy);

  // Zentralstern
  const starField = findField(cx, cy);
  if (starField) {
    starField.fieldTypeKey = 'STAR_CORE';
    starField.objectKey = 'star-core';
  }
  objects.push({
    key: 'star-core',
    objectType: CelestialObjectType.PLANET,
    name: `${systemName} Prime`,
    posX: cx,
    posY: cy,
    classId: 9001,
    isColonizable: false,
  });

  // Phase 2: alle 18 Archetypen einmal platzieren
  archetypes.forEach((archetype, index) => {
    const col = index % COLUMNS;
    const row = Math.floor(index / COLUMNS);
    const sx = MARGIN + col * GRID_SPACING + 1;
    const sy = MARGIN + row * GRID_SPACING + 1;

    const rotation: SwuRotationType =
      archetype.tidalLockedPossible && index % 2 === 1 ? 'tidal-locked' : 'rotating';
    const bodyFeature: SwuBodyFeature = archetype.ringPossible && index % 3 === 0 ? 'ring' : 'base';

    const planetKey = `swu-planet-${index + 1}`;
    const planetField = findField(sx, sy);
    if (planetField) {
      planetField.fieldTypeKey = 'PLANET_ORBIT';
      planetField.objectKey = planetKey;
    }
    objects.push({
      key: planetKey,
      objectType: CelestialObjectType.PLANET,
      name: describeObject(archetype, rotation, bodyFeature),
      posX: sx,
      posY: sy,
      classId: buildSwuTestClassId(archetype.typeId, archetype.variant),
      isColonizable: archetype.landable,
      swuRotation: rotation,
      swuRing: bodyFeature === 'ring',
    });

    // Etwa jeder 2. moonPossible-Planet bekommt testweise einen Mond direkt daneben.
    if (archetype.moonPossible && index % 2 === 0) {
      const moonSx = sx + 1;
      const moonSy = sy;
      const moonKey = `swu-moon-${index + 1}`;
      const moonField = findField(moonSx, moonSy);
      if (moonField && !moonField.objectKey) {
        moonField.fieldTypeKey = 'MOON_ORBIT';
        moonField.objectKey = moonKey;
      }
      // Default-Annahme: Mond nutzt denselben Archetyp wie sein Planet (siehe Kopfkommentar).
      objects.push({
        key: moonKey,
        objectType: CelestialObjectType.MOON,
        name: `${describeObject(archetype, rotation, 'moon')} - Mond`,
        posX: moonSx,
        posY: moonSy,
        classId: buildSwuTestClassId(archetype.typeId, archetype.variant),
        isColonizable: archetype.landable,
        swuRotation: rotation,
        swuRing: false,
      });
    }
  });

  return { width, height, fields, objects };
}
