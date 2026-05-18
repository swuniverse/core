import { Injectable } from '@nestjs/common';
import { CelestialObjectType } from '../entities/celestial-object.entity';
import { BINARY_SYSTEM_COMBOS, SYSTEM_TYPE_BY_ID } from '../starmap-system-types';
import { resolveGeneratorConfig, LEGACY_TYPE_MAPPING } from './starmap-system-generator.config';
import { SeededRNG } from './seeded-rng';
import {
  calculateBinaryStarAreas,
  getStarExclusionZone,
  isPositionInStarExclusionZone,
} from './star-area';

export type GeneratedSystemField = {
  sx: number;
  sy: number;
  fieldTypeKey: string;
  objectKey?: string;
  regionKey?: string | null;
  adminRegionKey?: string | null;
  influenceAreaId?: number | null;
  borderMask?: string | null;
};

export type GeneratedCelestialObject = {
  key: string;
  objectType: CelestialObjectType;
  name: string | null;
  posX: number;
  posY: number;
  classId: number | null;
  isColonizable: boolean;
};

export type GeneratedSystemLayout = {
  width: number;
  height: number;
  fields: GeneratedSystemField[];
  objects: GeneratedCelestialObject[];
};

@Injectable()
export class StarmapSystemGeneratorService {
  /**
   * Create a deterministic system layout from a system type and seed.
   * Same seed + same type = same layout every time.
   */
  createLayout(
    systemName: string,
    systemTypeId: number,
    seed?: string,
  ): GeneratedSystemLayout {
    const resolvedTypeId = LEGACY_TYPE_MAPPING[systemTypeId] ?? systemTypeId;
    const rng = new SeededRNG(seed ?? `${systemName}-${resolvedTypeId}`);

    const config = resolveGeneratorConfig(resolvedTypeId, rng);
    const def = SYSTEM_TYPE_BY_ID[resolvedTypeId];
    const isBinary = def?.isBinary ?? false;

    // Resolve binary combo
    let primaryTypeId = resolvedTypeId;
    let secondaryTypeId: number | null = null;
    if (isBinary) {
      const combo = BINARY_SYSTEM_COMBOS[resolvedTypeId];
      if (combo) {
        primaryTypeId = combo.primarySystemTypeId;
        secondaryTypeId = combo.secondarySystemTypeId;
      }
    }

    const width = config.width;
    const height = config.height;
    const cx = Math.ceil(width / 2);
    const cy = Math.ceil(height / 2);
    const fields: GeneratedSystemField[] = [];
    const objects: GeneratedCelestialObject[] = [];
    const occupied = new Set<string>();

    // Phase 1: Initialize grid with region assignments
    for (let sy = 1; sy <= height; sy++) {
      for (let sx = 1; sx <= width; sx++) {
        const ring = this.getRegionRing(sx, sy, cx, cy);
        fields.push({
          sx,
          sy,
          fieldTypeKey: this.backgroundFieldType(resolvedTypeId, sx, sy, cx, cy, rng),
          regionKey: ring,
          adminRegionKey: ring ? `SYS_${ring}` : null,
          influenceAreaId: ring === 'INNER_CORE' ? 1 : ring === 'INNER_BAND' ? 2 : null,
          borderMask: this.getBorderMask(sx, sy, width, height),
        });
      }
    }

    // Phase 2: Place stars and mark exclusion zones
    if (isBinary && secondaryTypeId) {
      const areas = calculateBinaryStarAreas(width, primaryTypeId, secondaryTypeId);

      // Primary star
      const primaryPositions = this.collectCircle(areas.primary.centerX, areas.primary.centerY, areas.primary.radius);
      for (const pos of primaryPositions) {
        this.markStarField(fields, pos, occupied);
      }
      objects.push({
        key: 'star-primary',
        objectType: CelestialObjectType.PLANET,
        name: `${systemName} A`,
        posX: areas.primary.centerX,
        posY: areas.primary.centerY,
        classId: 9001,
        isColonizable: false,
      });

      // Secondary star
      const secondaryPositions = this.collectCircle(areas.secondary.centerX, areas.secondary.centerY, areas.secondary.radius);
      for (const pos of secondaryPositions) {
        this.markStarField(fields, pos, occupied);
      }
      objects.push({
        key: 'star-secondary',
        objectType: CelestialObjectType.PLANET,
        name: `${systemName} B`,
        posX: areas.secondary.centerX,
        posY: areas.secondary.centerY,
        classId: 9002,
        isColonizable: false,
      });

      // Mark exclusion zones
      const primaryExclusion = getStarExclusionZone(primaryTypeId, width);
      const secondaryExclusion = getStarExclusionZone(secondaryTypeId, width);
      for (let sy = 1; sy <= height; sy++) {
        for (let sx = 1; sx <= width; sx++) {
          if (
            isPositionInStarExclusionZone(sx, sy, areas.primary.centerX, areas.primary.centerY, primaryExclusion) ||
            isPositionInStarExclusionZone(sx, sy, areas.secondary.centerX, areas.secondary.centerY, secondaryExclusion)
          ) {
            occupied.add(this.key(sx, sy));
          }
        }
      }
    } else {
      // Single star
      const starRadius = Math.max(1, config.starRadius);
      const starPositions = this.collectCircle(cx, cy, starRadius);
      for (const pos of starPositions) {
        this.markStarField(fields, pos, occupied);
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

      // Mark exclusion zone
      const exclusionZone = getStarExclusionZone(primaryTypeId, width);
      for (let sy = 1; sy <= height; sy++) {
        for (let sx = 1; sx <= width; sx++) {
          if (isPositionInStarExclusionZone(sx, sy, cx, cy, exclusionZone)) {
            occupied.add(this.key(sx, sy));
          }
        }
      }
    }

    // Phase 3: Place planets on orbital rings
    const orbitRings = this.buildOrbitRings(width, height, config.minPlanets + config.maxPlanets);
    const targetPlanetCount = rng.nextInt(config.minPlanets, config.maxPlanets);

    let createdPlanets = 0;
    for (let ringIdx = 0; ringIdx < orbitRings.length && createdPlanets < targetPlanetCount; ringIdx++) {
      const radius = orbitRings[ringIdx];
      const angle = rng.nextFloat(0, 2 * Math.PI);
      const sx = Math.round(cx + radius * Math.cos(angle));
      const sy = Math.round(cy + radius * Math.sin(angle));

      if (!this.isInside(sx, sy, width, height) || occupied.has(this.key(sx, sy))) {
        // Try cardinal/diagonal fallback
        const fallback = this.findFreeOrbitPosition(cx, cy, radius, occupied, width, height, rng);
        if (!fallback) continue;
        this.placePlanet(fallback.sx, fallback.sy, createdPlanets, systemName, config, rng, fields, objects, occupied);
      } else {
        this.placePlanet(sx, sy, createdPlanets, systemName, config, rng, fields, objects, occupied);
      }

      // Moon
      if (rng.nextBoolean(config.moonChance)) {
        const lastPlanetPos = objects[objects.length - 1];
        const moonPos = this.findMoonSlot(lastPlanetPos.posX, lastPlanetPos.posY, occupied, width, height);
        if (moonPos) {
          const moonKey = `moon-${createdPlanets + 1}`;
          occupied.add(this.key(moonPos.sx, moonPos.sy));
          const moonField = this.findField(fields, moonPos.sx, moonPos.sy);
          if (moonField) {
            moonField.fieldTypeKey = 'MOON_ORBIT';
            moonField.objectKey = moonKey;
            moonField.regionKey = 'PLANETARY_BAND';
            moonField.adminRegionKey = 'SYS_PLANETARY_BAND';
          }
          const planetName = objects[objects.length - 1].name ?? systemName;
          objects.push({
            key: moonKey,
            objectType: CelestialObjectType.MOON,
            name: `${planetName}a`,
            posX: moonPos.sx,
            posY: moonPos.sy,
            classId: 401,
            isColonizable: false,
          });
        }
      }

      createdPlanets++;
    }

    // Phase 4: Asteroid ring
    if (rng.nextBoolean(config.asteroidRingChance)) {
      const asteroidRadius = orbitRings[Math.max(orbitRings.length - 1, 0)] ?? Math.floor(Math.min(width, height) / 2) - 2;
      const arcCount = rng.nextInt(6, 14);
      for (let a = 0; a < arcCount; a++) {
        const angle = (2 * Math.PI / arcCount) * a + rng.nextFloat(-0.3, 0.3);
        const r = asteroidRadius + rng.nextInt(-1, 1);
        const asx = Math.round(cx + r * Math.cos(angle));
        const asy = Math.round(cy + r * Math.sin(angle));
        if (!this.isInside(asx, asy, width, height) || occupied.has(this.key(asx, asy))) continue;

        const asteroidKey = `asteroid-${asx}-${asy}`;
        occupied.add(this.key(asx, asy));
        const field = this.findField(fields, asx, asy);
        if (field) {
          field.fieldTypeKey = 'ASTEROID_CLUSTER';
          field.objectKey = asteroidKey;
          field.regionKey = 'OUTER_RING';
          field.adminRegionKey = 'SYS_OUTER_RING';
          field.influenceAreaId = 3;
        }
        objects.push({
          key: asteroidKey,
          objectType: CelestialObjectType.ASTEROID,
          name: null,
          posX: asx,
          posY: asy,
          classId: 701,
          isColonizable: false,
        });
      }
    }

    return { width, height, fields, objects };
  }

  private placePlanet(
    sx: number, sy: number, index: number,
    systemName: string, config: { classPool: number[]; colonizableChance: number },
    rng: SeededRNG, fields: GeneratedSystemField[],
    objects: GeneratedCelestialObject[], occupied: Set<string>,
  ) {
    const objectKey = `planet-${index + 1}`;
    occupied.add(this.key(sx, sy));
    const field = this.findField(fields, sx, sy);
    if (field) {
      field.fieldTypeKey = 'PLANET_ORBIT';
      field.objectKey = objectKey;
      field.regionKey = 'PLANETARY_BAND';
      field.adminRegionKey = 'SYS_PLANETARY_BAND';
    }
    objects.push({
      key: objectKey,
      objectType: CelestialObjectType.PLANET,
      name: `${systemName} ${this.toRoman(index + 1)}`,
      posX: sx,
      posY: sy,
      classId: config.classPool.length > 0 ? rng.choice(config.classPool) : 201,
      isColonizable: rng.nextBoolean(config.colonizableChance),
    });
  }

  private findFreeOrbitPosition(
    cx: number, cy: number, radius: number,
    occupied: Set<string>, width: number, height: number,
    rng: SeededRNG,
  ): { sx: number; sy: number } | null {
    const attempts = 8;
    for (let i = 0; i < attempts; i++) {
      const angle = rng.nextFloat(0, 2 * Math.PI);
      const sx = Math.round(cx + radius * Math.cos(angle));
      const sy = Math.round(cy + radius * Math.sin(angle));
      if (this.isInside(sx, sy, width, height) && !occupied.has(this.key(sx, sy))) {
        return { sx, sy };
      }
    }
    return null;
  }

  private backgroundFieldType(
    systemTypeId: number, sx: number, sy: number,
    cx: number, cy: number, rng: SeededRNG,
  ): string {
    const distance = Math.abs(cx - sx) + Math.abs(cy - sy);
    // Nebula systems have background nebula clouds
    if (systemTypeId >= 1064 && systemTypeId <= 1066 && distance > 7 && rng.nextBoolean(0.25)) {
      return 'NEBULA';
    }
    // Rare systems with asteroid backgrounds
    if (systemTypeId >= 1069 && systemTypeId <= 1070 && distance >= 5 && distance <= 8 && rng.nextBoolean(0.35)) {
      return 'ASTEROID_CLUSTER';
    }
    return 'EMPTY_SPACE';
  }

  private markStarField(
    fields: GeneratedSystemField[],
    pos: { sx: number; sy: number },
    occupied: Set<string>,
  ) {
    const field = this.findField(fields, pos.sx, pos.sy);
    if (field) {
      field.fieldTypeKey = 'STAR_CORE';
      field.regionKey = 'STAR_CORE';
      field.adminRegionKey = 'SYS_STAR_CORE';
      field.influenceAreaId = 1;
    }
    occupied.add(this.key(pos.sx, pos.sy));
  }

  private collectCircle(cx: number, cy: number, radius: number) {
    const positions: Array<{ sx: number; sy: number }> = [];
    for (let sy = cy - radius; sy <= cy + radius; sy++) {
      for (let sx = cx - radius; sx <= cx + radius; sx++) {
        const dist = Math.sqrt((sx - cx) ** 2 + (sy - cy) ** 2);
        if (dist <= radius + 0.5) {
          positions.push({ sx, sy });
        }
      }
    }
    return positions;
  }

  /**
   * Build orbit rings dynamically based on system size.
   * Distributes orbits evenly between star exclusion zone and grid edge.
   */
  private buildOrbitRings(width: number, height: number, desiredCount: number): number[] {
    const maxRadius = Math.floor(Math.min(width, height) / 2) - 1;
    const minRadius = 4;
    const ringCount = Math.min(desiredCount, Math.max(4, maxRadius - minRadius));
    const step = (maxRadius - minRadius) / Math.max(1, ringCount - 1);

    const rings: number[] = [];
    for (let i = 0; i < ringCount; i++) {
      rings.push(Math.round(minRadius + step * i));
    }
    return rings;
  }

  private findMoonSlot(
    sx: number, sy: number, occupied: Set<string>,
    width: number, height: number,
  ): { sx: number; sy: number } | null {
    const candidates = [
      { sx: sx + 1, sy },
      { sx, sy: sy - 1 },
      { sx: sx - 1, sy },
      { sx, sy: sy + 1 },
    ].filter(
      c => this.isInside(c.sx, c.sy, width, height) && !occupied.has(this.key(c.sx, c.sy)),
    );
    return candidates[0] ?? null;
  }

  private findField(fields: GeneratedSystemField[], sx: number, sy: number) {
    return fields.find(f => f.sx === sx && f.sy === sy);
  }

  private getRegionRing(sx: number, sy: number, cx: number, cy: number): string | null {
    const distance = Math.max(Math.abs(cx - sx), Math.abs(cy - sy));
    if (distance <= 2) return 'INNER_CORE';
    if (distance <= 6) return 'INNER_BAND';
    if (distance <= 10) return 'MID_BAND';
    return 'OUTER_BAND';
  }

  private getBorderMask(sx: number, sy: number, width: number, height: number): string | null {
    const parts: string[] = [];
    if (sy === 1) parts.push('N');
    if (sx === width) parts.push('E');
    if (sy === height) parts.push('S');
    if (sx === 1) parts.push('W');
    return parts.length > 0 ? parts.join('') : null;
  }

  private isInside(sx: number, sy: number, width: number, height: number): boolean {
    return sx >= 1 && sy >= 1 && sx <= width && sy <= height;
  }

  private key(sx: number, sy: number): string {
    return `${sx}:${sy}`;
  }

  private toRoman(n: number): string {
    const numerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
      'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII'];
    return numerals[n - 1] || `${n}`;
  }
}
