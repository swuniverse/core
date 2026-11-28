/**
 * SWU-Planetentyp eines Himmelskoerpers: Archetyp (typeId+variant) PLUS
 * Rotation und Body-Feature (Ring/Mond/Basis) - Schild ist ausdruecklich KEIN
 * Unterscheidungsmerkmal. Grundlage fuer Entdeckungen und die Datenbank-Liste.
 * STU-Klassen zaehlen nur ueber ihre SWU-Zuordnung (reiner Fallback).
 */
import { CelestialObjectType } from '../entities/celestial-object.entity';
import {
  getSwuPlanetArchetype,
  inferSwuInstanceFromName,
  SWU_BODY_FEATURE_CODE,
  SWU_ROTATION_CODE,
  type SwuBodyFeature,
  type SwuRotationType,
} from './swu-planet-archetypes.generator';
import { findArchetypeBySwuClassId } from './swu-archetype-registry';
import { getSwuArchetypeForStuClassId } from './swu-stu-class-mapping';
import { buildSwuTestClassId } from './swu-system-generator';
import { STU_SURFACE_CLASS_CONFIGS } from './stu-surface-class-configs';

export interface SwuPlanetType {
  /** Eindeutiger Schluessel, z.B. "90010:RB". */
  key: string;
  /** Synthetische SWU-classId (fuer Grafik). */
  classId: number;
  typeId: number;
  variant: string | null;
  rotation: SwuRotationType;
  bodyFeature: SwuBodyFeature;
  name: string;
  description: string | null;
  objectType: CelestialObjectType;
  /** Technischer Namens-Suffix " [P1GB]" fuer die Grafik-Aufloesung. */
  imageName: string;
}

export interface SwuTypeSource {
  classId: number | null;
  name: string | null;
  objectType: CelestialObjectType;
  swuRotation?: SwuRotationType | null;
  swuRing?: boolean | null;
}

const SWU_CLASS_ID_BASE = 90000;

/** Index 0 stands for "no variant" and for variant A (buildSwuTestClassId); the registry resolves both. */
function decodeSwuClassId(
  classId: number,
): { typeId: number; variant: string | null } | null {
  if (classId < SWU_CLASS_ID_BASE) return null;
  const archetype = findArchetypeBySwuClassId(classId);
  return archetype ? { typeId: archetype.typeId, variant: archetype.variant } : null;
}

/** Asteroid classes are database types too (STU lists them next to the planet classes). */
function resolveAsteroidType(classId: number): SwuPlanetType | null {
  const config = STU_SURFACE_CLASS_CONFIGS[classId];
  if (!config || !/Asteroid/.test(config.name)) return null;
  return {
    key: `${classId}:AS`,
    classId,
    typeId: classId,
    variant: null,
    rotation: 'rotating',
    bodyFeature: 'base',
    name: `${config.name} (${classId})`,
    description: null,
    objectType: CelestialObjectType.ASTEROID,
    imageName: '',
  };
}

export function resolveSwuPlanetType(
  source: SwuTypeSource,
): SwuPlanetType | null {
  if (source.classId == null) return null;
  if (source.objectType === CelestialObjectType.ASTEROID) {
    return resolveAsteroidType(source.classId);
  }
  const isMoon = source.objectType === CelestialObjectType.MOON;
  let typeId: number;
  let variant: string | null;
  let rotation: SwuRotationType;
  let bodyFeature: SwuBodyFeature;

  const decoded = decodeSwuClassId(source.classId);
  if (decoded) {
    ({ typeId, variant } = decoded);
    const instance =
      source.swuRotation != null
        ? {
            rotation: source.swuRotation,
            bodyFeature: source.swuRing ? ('ring' as const) : ('base' as const),
          }
        : inferSwuInstanceFromName(source.name);
    rotation = instance?.rotation ?? 'rotating';
    bodyFeature = isMoon ? 'moon' : (instance?.bodyFeature ?? 'base');
  } else {
    const ref = getSwuArchetypeForStuClassId(source.classId);
    if (!ref) return null;
    ({ typeId, variant } = ref);
    rotation = ref.rotation ?? 'rotating';
    bodyFeature = isMoon ? 'moon' : (ref.bodyFeature ?? 'base');
  }

  const archetype = getSwuPlanetArchetype(typeId, variant);
  if (!archetype) return null;
  if (bodyFeature === 'moon' && !archetype.moonPossible) return null;
  if (bodyFeature === 'ring' && !archetype.ringPossible) return null;
  if (rotation === 'tidal-locked' && !archetype.tidalLockedPossible) return null;

  const classId = buildSwuTestClassId(typeId, variant);
  const code = `${SWU_ROTATION_CODE[rotation]}${SWU_BODY_FEATURE_CODE[bodyFeature]}`;
  const labels = [
    rotation === 'tidal-locked' ? 'Gebunden' : null,
    bodyFeature === 'ring' ? 'Ring' : bodyFeature === 'moon' ? 'Mond' : null,
  ].filter(Boolean);
  return {
    key: `${classId}:${code}`,
    classId,
    typeId,
    variant,
    rotation,
    bodyFeature,
    name: `${archetype.typeName}${variant ? ` ${variant}` : ''}${labels.length ? ` (${labels.join(', ')})` : ''}`,
    description:
      rotation === 'tidal-locked' && archetype.tidalLockedDescription
        ? archetype.tidalLockedDescription
        : archetype.description,
    objectType: isMoon ? CelestialObjectType.MOON : CelestialObjectType.PLANET,
    imageName: ` [P${typeId}${code}]`,
  };
}

/** Kurzform fuer Alt-Entdeckungen (nur STU-classId bekannt, Planet angenommen). */
export function resolveSwuPlanetTypeFromStuClass(
  stuClassId: number,
): SwuPlanetType | null {
  const moon = stuClassId >= 400 && stuClassId < 500;
  return resolveSwuPlanetType({
    classId: stuClassId,
    name: null,
    objectType: moon ? CelestialObjectType.MOON : CelestialObjectType.PLANET,
  });
}
