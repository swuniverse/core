/**
 * SWU Archetyp-Registry + Kolonisierungs-Vorschlaege
 * ------------------------------------------------------------------
 * Das fehlende letzte Stueck: bisher gab es 14 einzelne Dateien mit
 * Generator-Funktionen, aber keine zentrale Stelle, die einem Spieler beim
 * Kolonisieren die 3 Zonen-Vorschlaege (Cold/Mid/Hot) anbietet und danach
 * tatsaechlich die gewaehlte Kolonie erzeugt.
 *
 * Colonizable/seedQuality-Angaben sind aus den Tests dieser gesamten Session
 * uebernommen (nicht aus den Archetyp-Rohdaten neu abgeleitet, die waren an
 * mehreren Stellen veraltet - siehe Ozeanwelt/Waldplanet/Sumpf-Korrektur).
 */

import {
  SWU_PLANET_ARCHETYPES,
  resolveLandingZones,
  type SwuPlanetArchetype,
  type SwuRotationType,
  type SwuZoneSlot,
  type SwuBodyFeature,
} from './swu-planet-archetypes.generator';
import { buildOrbitRows } from './swu-orbit';
import { solarOutputTJ } from './swu-solar';

import { generateErdaehnlichColonySurface, generateErdaehnlichUntergrund, getErdaehnlichZoneConfig } from './swu-erdaehnlich-biomes';
import { generateOzeanweltColonySurface, generateOzeanweltUntergrund, getOzeanweltZoneConfig } from './swu-ozeanwelt-biomes';
import { generateWaldplanetColonySurface, generateWaldplanetUntergrund, getWaldplanetZoneConfig } from './swu-waldplanet-biomes';
import { generateSumpfColonySurface, generateSumpfUntergrund, getSumpfZoneConfig } from './swu-sumpf-biomes';
import { generateSavanneColonySurface, generateSavanneUntergrund, getSavanneZoneConfig } from './swu-savanne-biomes';
import { generateWuesteColonySurface, generateWuesteUntergrund, getWuesteZoneConfig } from './swu-wueste-biomes';
import { generateGebirgsweltColonySurface, generateGebirgsweltUntergrund, getGebirgsweltZoneConfig } from './swu-gebirgswelt-biomes';
import { generateTundraartigColonySurface, generateTundraartigUntergrund, getTundraartigZoneConfig } from './swu-tundraartig-biomes';
import { generateMarsartigColonySurface, generateMarsartigUntergrund, getMarsartigZoneConfig } from './swu-marsartig-biomes';
import { generateArktischColonySurface, generateArktischUntergrund, getArktischZoneConfig } from './swu-arktisch-biomes';
import { generateArchipelColonySurface, generateArchipelUntergrund, getArchipelZoneConfig } from './swu-archipel-biomes';
import { generateMondartigColonySurface, generateMondartigUntergrund, getMondartigZoneConfig } from './swu-mondartig-biomes';
import { generateLavaplanetColonySurface, generateLavaplanetUntergrund, getLavaplanetZoneConfig } from './swu-lavaplanet-biomes';
import { generateGiftweltColonySurface, generateGiftweltUntergrund, getGiftweltZoneConfig } from './swu-giftwelt-biomes';
import { generateGasplanetColonySurface, generateGasplanetUntergrund, getGasplanetZoneConfig } from './swu-gasplanet-biomes';

import { generateSwuBonusMarkers, type SwuBonusMarker } from './swu-bonus-markers';
import { countSwuMiningFields, type SwuMiningFields } from './swu-settlement-rating';
import { SWU_ARCHETYPE_ATMOSPHERE, type SwuOrbitAtmosphereType } from './swu-orbit';

export type SwuSeedQuality = 'JA' | 'OPT' | 'GAP';

export interface SwuArchetypeGeneratorBundle {
  generateColonySurface: (zoneSlot: SwuZoneSlot, rotation: SwuRotationType, seed: string, bodyFeature?: SwuBodyFeature) => string[][];
  generateUntergrund: (zoneSlot: SwuZoneSlot, rotation: SwuRotationType, seed: string, bodyFeature?: SwuBodyFeature) => string[][];
  generateOrbit: (hasRing: boolean) => { lower: string[]; upper: string[] };
  /** Seed-Qualitaet je Zone, aus den Tests dieser Session ermittelt (siehe Kopfkommentar). */
  seedQuality: Record<SwuZoneSlot, SwuSeedQuality>;
  /**
   * Dominanter Biom-Buchstabe der gewaehlten Zone (z.B. "A" fuer Polar) - liest
   * NUR das baseField der jeweiligen Zonen-Config, ohne die Oberflaeche
   * tatsaechlich zu generieren. Grundlage fuer die Rohstoff-Zuordnung ueber
   * GameDataService.getSwuLetterResources() (siehe Balancing-Konversation:
   * "mehr ueber die Biome, weniger ueber die Archetypen").
   */
  getZoneLetter: (zoneSlot: SwuZoneSlot, rotation: SwuRotationType, seed: string, bodyFeature?: SwuBodyFeature) => string;
  /**
   * Nur Gasplanet: die Oberflaeche (H) hat inzwischen eine begehbare
   * Plattform, darunter liegt aber ein vulkanischer Untergrund (F710, siehe
   * swu-gasplanet-biomes.ts) - bekommt daher zusaetzlich einen Bruchteil des
   * F-Profils (Vulkanisch) als "Plattform-Anteil".
   */
  undergroundMixin?: { letter: string; factor: number };
}

function getArchetypeKey(typeId: number, variant: string | null): string {
  return variant ? `${typeId}-${variant}` : `${typeId}`;
}

const SWU_ARCHETYPE_REGISTRY: Record<string, SwuArchetypeGeneratorBundle> = {
  '1': {
    generateColonySurface: generateErdaehnlichColonySurface,
    generateUntergrund: generateErdaehnlichUntergrund,
    generateOrbit: (hasRing) => buildOrbitRows(1, null, hasRing),
    seedQuality: { 1: 'JA', 2: 'OPT', 3: 'JA' },
    getZoneLetter: (zoneSlot, rotation, seed) =>
      getErdaehnlichZoneConfig(zoneSlot, rotation, seed).baseField.charAt(0).toUpperCase(),
  },
  '2': {
    generateColonySurface: generateOzeanweltColonySurface,
    generateUntergrund: generateOzeanweltUntergrund,
    generateOrbit: (hasRing) => buildOrbitRows(2, null, hasRing),
    seedQuality: { 1: 'JA', 2: 'JA', 3: 'JA' },
    getZoneLetter: (zoneSlot) => getOzeanweltZoneConfig(zoneSlot).baseField.charAt(0).toUpperCase(),
  },
  '3': {
    generateColonySurface: generateWaldplanetColonySurface,
    generateUntergrund: generateWaldplanetUntergrund,
    generateOrbit: (hasRing) => buildOrbitRows(3, null, hasRing),
    seedQuality: { 1: 'OPT', 2: 'OPT', 3: 'JA' },
    getZoneLetter: (zoneSlot) => getWaldplanetZoneConfig(zoneSlot).baseField.charAt(0).toUpperCase(),
  },
  '4': {
    generateColonySurface: generateSumpfColonySurface,
    generateUntergrund: generateSumpfUntergrund,
    generateOrbit: (hasRing) => buildOrbitRows(4, null, hasRing),
    seedQuality: { 1: 'OPT', 2: 'OPT', 3: 'JA' },
    getZoneLetter: (zoneSlot) => getSumpfZoneConfig(zoneSlot).baseField.charAt(0).toUpperCase(),
  },
  '5': {
    generateColonySurface: generateSavanneColonySurface,
    generateUntergrund: generateSavanneUntergrund,
    generateOrbit: (hasRing) => buildOrbitRows(5, null, hasRing),
    seedQuality: { 1: 'OPT', 2: 'OPT', 3: 'OPT' },
    getZoneLetter: (zoneSlot) => getSavanneZoneConfig(zoneSlot).baseField.charAt(0).toUpperCase(),
  },
  '6': {
    generateColonySurface: generateWuesteColonySurface,
    generateUntergrund: generateWuesteUntergrund,
    generateOrbit: (hasRing) => buildOrbitRows(6, null, hasRing),
    seedQuality: { 1: 'JA', 2: 'JA', 3: 'OPT' },
    getZoneLetter: (zoneSlot) => getWuesteZoneConfig(zoneSlot).baseField.charAt(0).toUpperCase(),
  },
  '7': {
    generateColonySurface: generateGebirgsweltColonySurface,
    generateUntergrund: generateGebirgsweltUntergrund,
    generateOrbit: (hasRing) => buildOrbitRows(7, null, hasRing),
    seedQuality: { 1: 'OPT', 2: 'OPT', 3: 'OPT' },
    getZoneLetter: (zoneSlot) => getGebirgsweltZoneConfig(zoneSlot).baseField.charAt(0).toUpperCase(),
  },
  '8': {
    generateColonySurface: generateTundraartigColonySurface,
    generateUntergrund: generateTundraartigUntergrund,
    generateOrbit: (hasRing) => buildOrbitRows(8, null, hasRing),
    seedQuality: { 1: 'JA', 2: 'OPT', 3: 'OPT' },
    getZoneLetter: (zoneSlot) => getTundraartigZoneConfig(zoneSlot).baseField.charAt(0).toUpperCase(),
  },
  '9': {
    generateColonySurface: generateMarsartigColonySurface,
    generateUntergrund: generateMarsartigUntergrund,
    generateOrbit: (hasRing) => buildOrbitRows(9, null, hasRing),
    seedQuality: { 1: 'JA', 2: 'JA', 3: 'JA' },
    getZoneLetter: (zoneSlot) => getMarsartigZoneConfig(zoneSlot).baseField.charAt(0).toUpperCase(),
  },
  '10': {
    generateColonySurface: generateArktischColonySurface,
    generateUntergrund: generateArktischUntergrund,
    generateOrbit: (hasRing) => buildOrbitRows(10, null, hasRing),
    seedQuality: { 1: 'JA', 2: 'JA', 3: 'OPT' },
    getZoneLetter: (zoneSlot) => getArktischZoneConfig(zoneSlot).baseField.charAt(0).toUpperCase(),
  },
  '11': {
    generateColonySurface: generateArchipelColonySurface,
    generateUntergrund: generateArchipelUntergrund,
    generateOrbit: (hasRing) => buildOrbitRows(11, null, hasRing),
    seedQuality: { 1: 'JA', 2: 'JA', 3: 'JA' },
    getZoneLetter: (zoneSlot) => getArchipelZoneConfig(zoneSlot).baseField.charAt(0).toUpperCase(),
  },
  '12': {
    generateColonySurface: generateMondartigColonySurface,
    generateUntergrund: generateMondartigUntergrund,
    generateOrbit: (hasRing) => buildOrbitRows(12, null, hasRing),
    seedQuality: { 1: 'OPT', 2: 'OPT', 3: 'OPT' },
    getZoneLetter: (zoneSlot, _rotation, _seed, bodyFeature) =>
      getMondartigZoneConfig(zoneSlot, bodyFeature).baseField.charAt(0).toUpperCase(),
  },
  '13': {
    generateColonySurface: generateLavaplanetColonySurface,
    generateUntergrund: generateLavaplanetUntergrund,
    generateOrbit: (hasRing) => buildOrbitRows(13, null, hasRing),
    seedQuality: { 1: 'JA', 2: 'JA', 3: 'JA' },
    getZoneLetter: (zoneSlot, _rotation, seed, bodyFeature) =>
      getLavaplanetZoneConfig(zoneSlot, seed, bodyFeature).baseField.charAt(0).toUpperCase(),
  },
  '14': {
    generateColonySurface: generateGiftweltColonySurface,
    generateUntergrund: generateGiftweltUntergrund,
    generateOrbit: (hasRing) => buildOrbitRows(14, null, hasRing),
    seedQuality: { 1: 'JA', 2: 'JA', 3: 'JA' },
    getZoneLetter: (zoneSlot, _rotation, _seed, bodyFeature) =>
      getGiftweltZoneConfig(zoneSlot, bodyFeature).baseField.charAt(0).toUpperCase(),
  },
  '15-A': {
    generateColonySurface: generateGasplanetColonySurface,
    generateUntergrund: generateGasplanetUntergrund,
    generateOrbit: (hasRing) => buildOrbitRows(15, 'A', hasRing),
    seedQuality: { 1: 'JA', 2: 'JA', 3: 'JA' },
    getZoneLetter: (zoneSlot, _rotation, _seed, bodyFeature) =>
      getGasplanetZoneConfig(zoneSlot, bodyFeature).baseField.charAt(0).toUpperCase(),
    undergroundMixin: { letter: 'F', factor: 1 / 3 },
  },
  '15-B': {
    generateColonySurface: generateGasplanetColonySurface,
    generateUntergrund: generateGasplanetUntergrund,
    generateOrbit: (hasRing) => buildOrbitRows(15, 'B', hasRing),
    seedQuality: { 1: 'JA', 2: 'JA', 3: 'JA' },
    getZoneLetter: (zoneSlot, _rotation, _seed, bodyFeature) =>
      getGasplanetZoneConfig(zoneSlot, bodyFeature).baseField.charAt(0).toUpperCase(),
    undergroundMixin: { letter: 'F', factor: 1 / 3 },
  },
  '15-C': {
    generateColonySurface: generateGasplanetColonySurface,
    generateUntergrund: generateGasplanetUntergrund,
    generateOrbit: (hasRing) => buildOrbitRows(15, 'C', hasRing),
    seedQuality: { 1: 'JA', 2: 'JA', 3: 'JA' },
    getZoneLetter: (zoneSlot, _rotation, _seed, bodyFeature) =>
      getGasplanetZoneConfig(zoneSlot, bodyFeature).baseField.charAt(0).toUpperCase(),
    undergroundMixin: { letter: 'F', factor: 1 / 3 },
  },
  '15-D': {
    generateColonySurface: generateGasplanetColonySurface,
    generateUntergrund: generateGasplanetUntergrund,
    generateOrbit: (hasRing) => buildOrbitRows(15, 'D', hasRing),
    seedQuality: { 1: 'JA', 2: 'JA', 3: 'JA' },
    getZoneLetter: (zoneSlot, _rotation, _seed, bodyFeature) =>
      getGasplanetZoneConfig(zoneSlot, bodyFeature).baseField.charAt(0).toUpperCase(),
    undergroundMixin: { letter: 'F', factor: 1 / 3 },
  },
};

export function getArchetypeGeneratorBundle(
  typeId: number,
  variant: string | null,
): SwuArchetypeGeneratorBundle | null {
  return SWU_ARCHETYPE_REGISTRY[getArchetypeKey(typeId, variant)] ?? null;
}

/** Dominanter Biom-Buchstabe der gewaehlten Zone, siehe SwuArchetypeGeneratorBundle.getZoneLetter. */
export function getSwuZoneLetter(
  archetype: SwuPlanetArchetype,
  zoneSlot: SwuZoneSlot,
  rotation: SwuRotationType,
  bodyFeature: SwuBodyFeature = 'base',
  seed = 'default',
): string | null {
  const bundle = getArchetypeGeneratorBundle(archetype.typeId, archetype.variant);
  return bundle?.getZoneLetter(zoneSlot, rotation, seed, bodyFeature) ?? null;
}

/** Nur Gasplanet: zusaetzlicher Buchstabe+Faktor fuer den vulkanischen Untergrund-Anteil, siehe undergroundMixin. */
export function getSwuUndergroundMixin(
  archetype: SwuPlanetArchetype,
): { letter: string; factor: number } | null {
  const bundle = getArchetypeGeneratorBundle(archetype.typeId, archetype.variant);
  return bundle?.undergroundMixin ?? null;
}

// ---------------------------------------------------------------------------
// Kolonisierungs-Vorschlaege (das eigentliche Ziel dieser Datei)
// ---------------------------------------------------------------------------
export interface SwuColonizationProposal {
  zoneSlot: SwuZoneSlot;
  label: string;
  primaryBiome: string | null;
  secondaryBiome: string | null;
  temperatureRangeK: [number, number] | null;
  seedQuality: SwuSeedQuality;
  /** Kann diese Zone ueberhaupt gegruendet werden (JA oder OPT, nicht GAP). */
  colonizable: boolean;
  /**
   * Echte Oberflaechen-Vorschau (dieselbe generateColonySurface-Funktion, die
   * spaeter foundSwuColony() aufruft) - nur gesetzt, wenn ein seed uebergeben
   * wurde und die Zone kolonisierbar ist. Bei gleichem seed/bodyFeature ist
   * das exakt das, was der Spieler beim Gruenden bekommt (deterministisch).
   */
  previewSurface: string[][] | null;
  /** Planetare Bonus-Marker passend zu previewSurface (nur mit seed + classify). */
  bonusMarkers: SwuBonusMarker[];
  /** Bergbau-Felder X/Y/Z der Vorschau (nur mit seed + classify), Grundlage der Besiedlungs-Bewertung. */
  miningFields: SwuMiningFields | null;
  /**
   * Solarkraftwerk-Basisertrag in TJ fuer diese Zone (Distanz zum Stern, Zone,
   * Rotation, Archetyp-Atmosphaere) - siehe swu-solar.ts. Nur gesetzt, wenn
   * der Aufrufer eine orbitDistance mitgibt (die kennt nur er, siehe
   * colonization.service.ts, das die Sternposition im System kennt).
   */
  solarOutputTJ: number | null;
}

/**
 * Pro Zone eigener Seed: Zonen mit identischer Biom-Konfiguration (z.B. alle
 * Zonen beim Planetoiden) wuerden sonst dieselbe Oberflaeche erzeugen.
 * Vorschau und Gruendung nutzen dieselbe Ableitung -> weiterhin deckungsgleich.
 */
function zoneSeed(seed: string, zoneSlot: SwuZoneSlot): string {
  return `${seed}-zone${zoneSlot}`;
}

/**
 * Liefert die 3 Zonen-Vorschlaege fuer einen Planeten (Archetyp + Rotation) -
 * das, was dem Spieler beim Kolonisieren zur Auswahl angezeigt wird.
 */
export function getColonizationProposals(
  archetype: SwuPlanetArchetype,
  rotation: SwuRotationType,
  preview?: {
    seed?: string;
    bodyFeature?: SwuBodyFeature;
    orbitDistance?: number;
    /** Tile -> Feldkategorien; ohne diese Funktion werden keine Marker erzeugt. */
    classify?: (tile: string) => string[];
  },
): SwuColonizationProposal[] {
  const bundle = getArchetypeGeneratorBundle(archetype.typeId, archetype.variant);
  const resolvedZones = resolveLandingZones(archetype, rotation);

  return resolvedZones.map((zone) => {
    const seedQuality = bundle?.seedQuality[zone.slot] ?? 'GAP';
    const colonizable = seedQuality !== 'GAP';
    return {
      zoneSlot: zone.slot,
      label: zone.label,
      primaryBiome: zone.biome.primaryBiome,
      secondaryBiome: zone.biome.secondaryBiome,
      temperatureRangeK: zone.temperatureRangeK,
      seedQuality,
      colonizable,
      previewSurface:
        bundle && colonizable && preview?.seed
          ? bundle.generateColonySurface(
              zone.slot,
              rotation,
              zoneSeed(preview.seed, zone.slot),
              preview.bodyFeature ?? 'base',
            )
          : null,
      bonusMarkers:
        bundle && colonizable && preview?.seed && preview.classify
          ? generateSwuBonusMarkers({
              surface: bundle.generateColonySurface(
                zone.slot,
                rotation,
                zoneSeed(preview.seed, zone.slot),
                preview.bodyFeature ?? 'base',
              ),
              untergrund: bundle.generateUntergrund(
                zone.slot,
                rotation,
                zoneSeed(preview.seed, zone.slot),
                preview.bodyFeature ?? 'base',
              ),
              typeId: archetype.typeId,
              seed: zoneSeed(preview.seed, zone.slot),
              classify: preview.classify,
            })
          : [],
      miningFields:
        bundle && colonizable && preview?.seed && preview.classify
          ? countSwuMiningFields(
              bundle.generateColonySurface(
                zone.slot,
                rotation,
                zoneSeed(preview.seed, zone.slot),
                preview.bodyFeature ?? 'base',
              ),
              bundle.generateUntergrund(
                zone.slot,
                rotation,
                zoneSeed(preview.seed, zone.slot),
                preview.bodyFeature ?? 'base',
              ),
              preview.classify,
            )
          : null,
      solarOutputTJ:
        preview?.orbitDistance != null
          ? solarOutputTJ(
              preview.orbitDistance,
              zone.slot,
              rotation,
              archetype.typeId,
              archetype.variant,
            )
          : null,
    };
  });
}

export interface SwuFoundedColony {
  zoneSlot: SwuZoneSlot;
  surface: string[][];
  untergrund: string[][];
  orbit: { lower: string[]; upper: string[] };
  bonusMarkers: SwuBonusMarker[];
}

/**
 * Gruendet tatsaechlich eine Kolonie in der vom Spieler gewaehlten Zone -
 * generiert Oberflaeche, Untergrund und Orbit-Reihen in einem Aufwasch.
 * Wirft einen Fehler, wenn die gewaehlte Zone GAP ist (sollte die UI ohnehin
 * nicht als waehlbar anzeigen, siehe SwuColonizationProposal.colonizable).
 */
export function foundSwuColony(
  archetype: SwuPlanetArchetype,
  rotation: SwuRotationType,
  bodyFeature: SwuBodyFeature,
  zoneSlot: SwuZoneSlot,
  seed: string,
  classify?: (tile: string) => string[],
): SwuFoundedColony {
  const bundle = getArchetypeGeneratorBundle(archetype.typeId, archetype.variant);
  if (!bundle) {
    throw new Error(`Kein Generator fuer Archetyp ${archetype.typeId}-${archetype.variant} registriert.`);
  }
  const quality = bundle.seedQuality[zoneSlot];
  if (quality === 'GAP') {
    throw new Error(
      `Zone ${zoneSlot} von ${archetype.typeName} hat kein Seed-Feld - nicht kolonisierbar. ` +
        `Die UI haette diese Zone anhand von SwuColonizationProposal.colonizable=false gar nicht erst anbieten sollen.`,
    );
  }

  const surface = bundle.generateColonySurface(zoneSlot, rotation, zoneSeed(seed, zoneSlot), bodyFeature);
  const untergrund = bundle.generateUntergrund(zoneSlot, rotation, zoneSeed(seed, zoneSlot), bodyFeature);
  return {
    zoneSlot,
    surface,
    untergrund,
    orbit: bundle.generateOrbit(bodyFeature === 'ring'),
    bonusMarkers: classify
      ? generateSwuBonusMarkers({
          surface,
          untergrund,
          typeId: archetype.typeId,
          seed: zoneSeed(seed, zoneSlot),
          classify,
        })
      : [],
  };
}

/** Praktischer Direkteinstieg ueber SWU_PLANET_ARCHETYPES, falls man nur typeId+variant hat. */
export function getColonizationProposalsByTypeId(
  typeId: number,
  variant: string | null,
  rotation: SwuRotationType,
): SwuColonizationProposal[] {
  const archetype = SWU_PLANET_ARCHETYPES.find((a) => a.typeId === typeId && a.variant === variant);
  if (!archetype) return [];
  return getColonizationProposals(archetype, rotation);
}

/**
 * Umkehrung von buildSwuTestClassId (swu-system-generator.ts): synthetische
 * classId (90000 + typeId*10 + variantIndex) -> Archetyp. null, wenn die
 * classId keinem SWU-Archetyp entspricht (z.B. alte STU-classIds).
 */
export function findArchetypeBySwuClassId(classId: number): SwuPlanetArchetype | null {
  if (classId < 90000 || classId >= 91000) return null;
  const offset = classId - 90000;
  const typeId = Math.floor(offset / 10);
  const variantIndex = offset % 10;
  return (
    SWU_PLANET_ARCHETYPES.find(
      (a) =>
        a.typeId === typeId &&
        (a.variant ? a.variant.charCodeAt(0) - 'A'.charCodeAt(0) : 0) === variantIndex,
    ) ?? null
  );
}

/** Atmosphaeren-Typ des Archetyps (A normal, B Gas, C duenn, D toxisch, E keine). */
export function getSwuArchetypeAtmosphere(archetype: SwuPlanetArchetype): SwuOrbitAtmosphereType {
  return SWU_ARCHETYPE_ATMOSPHERE[getArchetypeKey(archetype.typeId, archetype.variant)] ?? 'A';
}
