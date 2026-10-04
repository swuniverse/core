/**
 * SWU Solarkraftwerk-Ertrag - distanz-/zonen-/atmosphaerenbasiert
 * ------------------------------------------------------------------
 * Reines Formel-Modul (keine DB-Zugriffe) - orbitDistance wird vom Aufrufer
 * (colonization.service.ts, der die Sternposition kennt) berechnet und
 * durchgereicht. Zone/Rotation kommen aus dem bestehenden SWU-Zonensystem,
 * Atmosphaere aus SWU_ARCHETYPE_ATMOSPHERE (swu-orbit.ts) - alles Werte, die
 * fuer einen Kolonisierungs-Vorschlag ohnehin schon vorliegen.
 *
 * Skalierung: ein bisheriges Basis-Solarkraftwerk erzeugte pauschal 16
 * (Referenzwert, keine Zonen-/Distanzabhaengigkeit). Mit Faktor 1.0 (neutrale
 * Distanz/Zone/Atmosphaere) soll das neue System denselben Ertrag liefern,
 * hochskaliert auf TJ: 1600 TJ Basis. Nach oben gedeckelt bei 3200 TJ (die
 * rohe Formel kann durch die Multiplikation theoretisch etwas hoeher liegen,
 * siehe Kopfkommentar der urspruenglichen Design-Notiz - 3200 TJ ist bewusst
 * eine harte Obergrenze, kein aus der Formel abgeleiteter Wert). Nach unten
 * hin echtes 0 (Dauernacht auf gebundenen Planeten, Gasriesen-Atmosphaere).
 */

import type { SwuRotationType, SwuZoneSlot } from './swu-planet-archetypes.generator';
import {
  SWU_ARCHETYPE_ATMOSPHERE,
  getArchetypeKey,
  type SwuOrbitAtmosphereType,
} from './swu-orbit';

export const SWU_SOLAR_BASE_OUTPUT_TJ = 1600;
export const SWU_SOLAR_MAX_OUTPUT_TJ = 3200;

/** Atmosphaere schluckt/streut Licht - keine Atmosphaere ist sogar ein Bonus (ungefiltert), Gasriese kategorisch 0 (kein fester Boden fuer Solarpanele). */
const ATMOSPHERE_FACTOR: Record<SwuOrbitAtmosphereType, number> = {
  E: 1.2, // keine Atmosphaere (Mondartig, Lavaplanet)
  C: 1.1, // duenne Eisenatmosphaere (Marsartig)
  A: 1.0, // normale Atmosphaere (Referenzwert)
  D: 0.5, // Giftatmosphaere
  B: 0.0, // Gasriese
};

/**
 * Multiplikativer Ertragsfaktor, 1.0 = Referenz (mittlere Distanz, rotierend in
 * gemaessigter Zone, normale Atmosphaere). orbitDistance: 0 (sonnennah) bis 1 (sonnenfern).
 */
export function solarOutputFactor(
  orbitDistance: number,
  zone: SwuZoneSlot,
  rotation: SwuRotationType,
  atmosphere: SwuOrbitAtmosphereType,
): number {
  const distance = Math.min(1, Math.max(0, orbitDistance));
  // Gestuft statt 1/r^2, damit's balancebar bleibt: 1.6 (nah) bis 0.4 (fern).
  const distanceFactor = 1.6 - distance * 1.2;

  // Tag/Nacht - nur bei gebundenen Planeten wirklich hart (Rotierend mittelt
  // sich ueber die Rotation aus, siehe SwuTimeState in den Planeten-Archetypen).
  let zoneFactor: number;
  if (rotation === 'tidal-locked') {
    zoneFactor = zone === 3 ? 1.3 : zone === 2 ? 0.5 : 0.0; // Hot=Dauerlicht, Mid=Terminator, Cold=Dauernacht
  } else {
    // Rotierend: Sonneneinstrahlung sinkt mit der Breite - gemaessigte Zone (2)
    // ist die Referenz, Aequator (3) +25 %, Polregion (1) -25 %.
    zoneFactor = zone === 3 ? 1.25 : zone === 2 ? 1.0 : 0.75;
  }

  return Math.max(0, distanceFactor * zoneFactor * ATMOSPHERE_FACTOR[atmosphere]);
}

/** Solarertrag in TJ fuer einen konkreten Kolonisierungs-Vorschlag (Zone eines Archetyps). */
export function solarOutputTJ(
  orbitDistance: number,
  zone: SwuZoneSlot,
  rotation: SwuRotationType,
  typeId: number,
  variant: string | null,
): number {
  const atmosphere =
    SWU_ARCHETYPE_ATMOSPHERE[getArchetypeKey(typeId, variant)] ?? 'A';
  const factor = solarOutputFactor(orbitDistance, zone, rotation, atmosphere);
  return Math.min(
    SWU_SOLAR_MAX_OUTPUT_TJ,
    Math.round(factor * SWU_SOLAR_BASE_OUTPUT_TJ),
  );
}

/**
 * Distanz zum Systemstern, normiert 0 (sonnennah) bis 1 (sonnenfern) relativ
 * zur maximal moeglichen Distanz innerhalb der Systemgrenzen (maxX/maxY).
 * 0.5 (neutral) als Fallback, wenn kein Stern oder keine Systemgroesse bekannt ist.
 */
export function computeSwuOrbitDistance(
  target: { posX: number; posY: number },
  star: { posX: number; posY: number } | null | undefined,
  system: { maxX: number; maxY: number } | null | undefined,
): number {
  const neutral = 0.5;
  if (!system || !star) return neutral;
  const { maxX, maxY } = system;
  const dx = target.posX - star.posX;
  const dy = target.posY - star.posY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const maxDistance = Math.sqrt(
    Math.pow(Math.max(star.posX, maxX - star.posX), 2) +
      Math.pow(Math.max(star.posY, maxY - star.posY), 2),
  );
  return maxDistance > 0 ? Math.min(1, distance / maxDistance) : 0;
}
