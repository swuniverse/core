import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type {
  DatabasePlanetTypeDetailDto,
  DatabaseSystemTypeDetailDto,
} from '@swuniverse/shared';
import { Repository } from 'typeorm';
import { CelestialClassDiscovery } from '../starmap/entities/celestial-class-discovery.entity';
import { CelestialObjectType } from '../starmap/entities/celestial-object.entity';
import { SystemTypeDiscovery } from '../starmap/entities/system-type-discovery.entity';
import { getColonizationProposals } from '../starmap/generator/swu-archetype-registry';
import { getSwuPlanetArchetype } from '../starmap/generator/swu-planet-archetypes.generator';
import { resolveSwuPlanetType } from '../starmap/generator/swu-planet-type';
import { SYSTEM_TYPE_BY_ID } from '../starmap/starmap-system-types';

/** Planet type key as listed by `getPlanetTypes`, e.g. `90010:RB`. */
function planetTypeFromKey(key: string) {
  const asteroid = /^(\d+):AS$/.exec(key);
  if (asteroid) {
    const type = resolveSwuPlanetType({
      classId: Number(asteroid[1]),
      name: null,
      objectType: CelestialObjectType.ASTEROID,
    });
    return type?.key === key ? type : null;
  }
  const match = /^(\d+):([GR])([RMB])$/.exec(key);
  if (!match) return null;
  const classId = Number(match[1]);
  const type = resolveSwuPlanetType({
    classId,
    // The type code travels in the name suffix, exactly as on generated bodies.
    name: ` [P0${match[2]}${match[3]}]`,
    objectType: match[3] === 'M' ? CelestialObjectType.MOON : CelestialObjectType.PLANET,
  });
  return type?.key === key ? type : null;
}

/** Detail pages of the database type catalogues (STU `planettype.twig`, `starsystemtype.twig`). */
@Injectable()
export class DatabaseTypeDetailService {
  constructor(
    @InjectRepository(CelestialClassDiscovery)
    private readonly planetTypeDiscoveryRepo: Repository<CelestialClassDiscovery>,
    @InjectRepository(SystemTypeDiscovery)
    private readonly systemTypeDiscoveryRepo: Repository<SystemTypeDiscovery>,
  ) {}

  async getPlanetType(userId: number, key: string): Promise<DatabasePlanetTypeDetailDto> {
    const type = planetTypeFromKey(key);
    if (!type || !(await this.planetTypeDiscoveryRepo.exists({ where: { userId, swuTypeKey: key } }))) {
      throw new NotFoundException('Planetentyp nicht katalogisiert');
    }
    const archetype = getSwuPlanetArchetype(type.typeId, type.variant);
    // Like STU, the layout is an example: a fixed seed per type keeps the page stable.
    const zones = archetype
      ? getColonizationProposals(archetype, type.rotation, {
          seed: `database-${key}`,
          bodyFeature: type.bodyFeature,
        }).flatMap((proposal) =>
          proposal.previewSurface ? [{ label: proposal.label, surface: proposal.previewSurface }] : [],
        )
      : [];
    return {
      key: type.key,
      classId: type.classId,
      objectTypeId: type.objectType,
      imageName: type.imageName,
      name: type.name,
      description: type.description,
      objectType:
        type.objectType === CelestialObjectType.ASTEROID
          ? 'Asteroid'
          : type.bodyFeature === 'moon'
            ? 'Mond'
            : 'Planet',
      zones,
    };
  }

  async getSystemType(userId: number, systemTypeId: number): Promise<DatabaseSystemTypeDetailDto> {
    const definition = SYSTEM_TYPE_BY_ID[systemTypeId];
    if (!definition || !(await this.systemTypeDiscoveryRepo.exists({ where: { userId, systemTypeId } }))) {
      throw new NotFoundException('Systemtyp nicht katalogisiert');
    }
    return {
      systemTypeId: definition.id,
      name: definition.name,
      rarity: definition.rarity,
      isBinary: definition.isBinary,
      gridSize: { min: definition.gridSizeMin, max: definition.gridSizeMax },
      planets: { min: definition.minPlanets, max: definition.maxPlanets },
      asteroids: { min: definition.minAsteroids, max: definition.maxAsteroids },
      moonChance: definition.moonChance,
    };
  }
}
