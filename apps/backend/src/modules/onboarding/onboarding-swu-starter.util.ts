import {
  findArchetypeBySwuClassId,
  getColonizationProposals,
  getSwuZoneLetter,
} from '../starmap/generator/swu-archetype-registry';
import {
  SWU_PLANET_ARCHETYPES,
  resolveSwuInstance,
  type SwuPlanetArchetype,
  type SwuZoneSlot,
} from '../starmap/generator/swu-planet-archetypes.generator';
import type { CelestialObjectType } from '../starmap/entities/celestial-object.entity';

/** Nur diese Biom-Buchstaben (C = Gemaessigt, E = Tropisch) erlauben einen Start. */
export const SWU_STARTER_BIOME_LETTERS = ['C', 'E'] as const;

export interface SwuStarterZone {
  zoneSlot: SwuZoneSlot;
  label: string;
  letter: string;
  primaryBiome: string | null;
  secondaryBiome: string | null;
}

interface StarterObjectLike {
  name: string | null;
  classId: number | null;
  objectType: CelestialObjectType;
}

/** Zonen eines SWU-Planeten, auf denen ein Spieler starten darf (Biom C oder E). */
export function getSwuStarterZones(object: StarterObjectLike): SwuStarterZone[] {
  if (object.classId == null) return [];
  const archetype = findArchetypeBySwuClassId(object.classId);
  if (!archetype || archetype.starterEligible === false) return [];
  const instance = resolveSwuInstance(object);
  return getColonizationProposals(archetype, instance.rotation)
    .filter((proposal) => proposal.colonizable)
    .flatMap((proposal) => {
      const letter = getSwuZoneLetter(
        archetype,
        proposal.zoneSlot,
        instance.rotation,
        instance.bodyFeature,
      );
      if (
        !letter ||
        !(SWU_STARTER_BIOME_LETTERS as readonly string[]).includes(letter)
      ) {
        return [];
      }
      return [
        {
          zoneSlot: proposal.zoneSlot,
          label: proposal.label,
          letter,
          primaryBiome: proposal.primaryBiome,
          secondaryBiome: proposal.secondaryBiome,
        },
      ];
    });
}

function swuClassId(archetype: SwuPlanetArchetype): number {
  const variantIndex = archetype.variant
    ? archetype.variant.charCodeAt(0) - 'A'.charCodeAt(0)
    : 0;
  return 90000 + archetype.typeId * 10 + variantIndex;
}

/**
 * classIds aller Archetypen, die (in irgendeiner Rotation) eine Starter-Zone
 * haben koennen - grober SQL-Vorfilter, die exakte Pruefung macht getSwuStarterZones.
 */
export function getSwuStarterCandidateClassIds(): number[] {
  return SWU_PLANET_ARCHETYPES.filter(
    (archetype) => archetype.starterEligible !== false,
  ).map(swuClassId);
}
