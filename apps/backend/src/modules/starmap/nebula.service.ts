import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, createHmac } from 'node:crypto';
import { DataSource, EntityManager } from 'typeorm';
import {
  generateFilmicNebulaTerrain,
  FILMIC_NEBULA_FIELD_IDS,
  type NebulaApplyDto,
  type NebulaApplyResultDto,
  type NebulaPreviewDto,
  type NebulaPreviewMapDto,
  type NebulaSettingsDto,
  type NebulaVisualDto,
} from '@swuniverse/shared';
import { protectRadius, protectRoute } from './generator/nebula-generator';
import {
  isNebulaBaseline,
  nebulaVisualForField,
  type NebulaBaseline,
  type NebulaGeneration,
} from './nebula-generation';

interface FieldType {
  id: number;
  key: string;
  name: string;
  category: string | null;
  passable: boolean;
  energyCost: number;
  damage: number;
  specialDamage: number;
  effects: string[] | null;
  miningResources: { commodityId: number; rate: number }[];
}
interface Field extends NebulaBaseline {
  id: number;
  cx: number;
  cy: number;
  starSystemId: number | null;
  systemTypeId: number | null;
  passableOverride: boolean | null;
  borderTypeId: number | null;
  occupied: boolean;
  nebulaGeneration: NebulaGeneration | null;
}
interface System {
  id: number;
  name: string;
  cx: number;
  cy: number;
  systemTypeId: number;
  starter: boolean;
}
interface Snapshot {
  layer: {
    id: number;
    name: string;
    width: number;
    height: number;
    nebulaSeedSalt: string;
  };
  types: FieldType[];
  fields: Field[];
  systems: System[];
  wormholes: {
    entryLayerId: number;
    exitLayerId: number;
    entryCx: number;
    entryCy: number;
    exitCx: number;
    exitCy: number;
  }[];
  routes: {
    fromSystemId: number;
    toSystemId: number;
    controlPointJson: { x: number; y: number }[] | null;
  }[];
}
interface Update extends NebulaBaseline {
  id: number;
  nebulaGeneration: NebulaGeneration | null;
}
function decodeEffects(value: string[] | string | null): string[] | null {
  if (value == null) return null;
  let decoded: unknown;
  try {
    decoded = typeof value === 'string' ? JSON.parse(value) : value;
  } catch {
    throw new BadRequestException('Ungültige Feldeffekte');
  }
  if (!Array.isArray(decoded) || !decoded.every((v) => typeof v === 'string'))
    throw new BadRequestException('Ungültige Feldeffekte');
  return decoded;
}
function canonical(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']';
  const o = v as Record<string, unknown>;
  return (
    '{' +
    Object.keys(o)
      .sort()
      .map((k) => JSON.stringify(k) + ':' + canonical(o[k]))
      .join(',') +
    '}'
  );
}
const sameEffects = (a: string[] | null, b: string[] | null) =>
  JSON.stringify(a ?? []) === JSON.stringify(b ?? []);
const empty = (type: FieldType | undefined) =>
  type?.key === 'EMPTY_SPACE' ||
  type?.key === 'DEEP_SPACE' ||
  type?.category === 'space';
function baseline(field: NebulaBaseline): NebulaBaseline {
  return {
    fieldTypeId: field.fieldTypeId,
    isPassable: field.isPassable,
    energyCost: field.energyCost,
    damage: field.damage,
    effects: field.effects,
    effectFlags: field.effectFlags,
  };
}

@Injectable()
export class NebulaService {
  constructor(private readonly source: DataSource) {}
  private settings(input: NebulaSettingsDto): NebulaSettingsDto {
    if (
      !input ||
      typeof input.seed !== 'string' ||
      !input.seed.trim() ||
      input.seed.trim().length > 128 ||
      input.target !== 'GALAXY' ||
      !['SUBTLE', 'BALANCED', 'RICH'].includes(input.density)
    )
      throw new BadRequestException(
        'Nebel werden nur auf der Galaxiekarte erzeugt. Seed (1–128 Zeichen) und Dichte sind erforderlich.',
      );
    return {
      seed: input.seed.trim(),
      target: 'GALAXY',
      density: input.density,
    };
  }
  async preview(
    layerId: number,
    input: NebulaSettingsDto,
  ): Promise<NebulaPreviewDto> {
    const settings = this.settings(input);
    return this.source.transaction(
      'REPEATABLE READ',
      async (manager) =>
        this.plan(await this.snapshot(manager, layerId), settings).preview,
    );
  }
  async apply(
    layerId: number,
    input: NebulaApplyDto,
  ): Promise<NebulaApplyResultDto> {
    const settings = this.settings(input);
    if (
      typeof input.fingerprint !== 'string' ||
      !/^[a-f0-9]{64}$/.test(input.fingerprint)
    )
      throw new BadRequestException('Eine gültige Vorschau ist erforderlich');
    try {
      return await this.source.transaction('SERIALIZABLE', async (manager) => {
        // Hold topology/occupancy steady, including inserts, before taking the MVCC snapshot.
        await manager.query(
          `LOCK TABLE spacecraft, space_locations, colonies, users, onboarding_selections, star_systems, galaxy_field_types, wormholes, hyperspace_routes, hyperspace_route_segments IN SHARE MODE`,
        );
        await manager.query('SELECT id FROM layers WHERE id = $1 FOR UPDATE', [
          layerId,
        ]);
        await manager.query(
          'SELECT id FROM galaxy_fields WHERE "layerId" = $1 ORDER BY id FOR UPDATE',
          [layerId],
        );
        const plan = this.plan(await this.snapshot(manager, layerId), settings);
        if (plan.preview.fingerprint !== input.fingerprint)
          throw new ConflictException(
            'Die Karte hat sich geändert. Bitte eine neue Vorschau erzeugen.',
          );
        for (let offset = 0; offset < plan.updates.length; offset += 500) {
          const rows = plan.updates
            .slice(offset, offset + 500)
            .map((row) => ({
              ...row,
              effects: row.effects ? JSON.stringify(row.effects) : null,
              effectFlags: row.effectFlags
                ? JSON.stringify(row.effectFlags)
                : null,
            }));
          await manager.query(
            `UPDATE galaxy_fields f SET "fieldTypeId"=d."fieldTypeId", "isPassable"=d."isPassable", "energyCost"=d."energyCost", damage=d.damage, effects=d.effects, "effectFlags"=d."effectFlags", "nebulaGeneration"=d."nebulaGeneration"
          FROM jsonb_to_recordset($1::jsonb) AS d(id int, "fieldTypeId" int, "isPassable" boolean, "energyCost" int, damage int, effects text, "effectFlags" text, "nebulaGeneration" jsonb) WHERE f.id=d.id`,
            [JSON.stringify(rows)],
          );
        }
        return { changedFields: plan.updates.length };
      });
    } catch (error) {
      const code =
        (error as { driverError?: { code?: string }; code?: string })
          .driverError?.code ?? (error as { code?: string }).code;
      if (code === '40001' || code === '40P01')
        throw new ConflictException(
          'Die Karte wurde gleichzeitig verändert. Bitte eine neue Vorschau erzeugen.',
        );
      throw error;
    }
  }
  private async snapshot(
    manager: EntityManager,
    layerId: number,
  ): Promise<Snapshot> {
    const [layer] = await manager.query(
      'SELECT id,name,width,height,"nebulaSeedSalt" FROM layers WHERE id=$1',
      [layerId],
    );
    if (!layer) throw new NotFoundException('Ebene nicht gefunden');
    const types: FieldType[] = await manager.query(
      'SELECT * FROM galaxy_field_types ORDER BY id',
    );
    for (const type of types) type.effects = decodeEffects(type.effects);
    for (const id of FILMIC_NEBULA_FIELD_IDS) {
      const type = types.find((t) => t.id === id);
      if (
        !type ||
        type.category !== 'nebula' ||
        !type.passable ||
        type.specialDamage > 0 ||
        type.energyCost > 2 ||
        type.damage > 12
      )
        throw new BadRequestException(
          `Passierbarer Nebeltyp ${id} fehlt oder wurde verändert`,
        );
    }
    const fields: Field[] = await manager.query(
      `SELECT f.*, EXISTS (SELECT 1 FROM spacecraft s JOIN space_locations l ON l.id=s."locationId" WHERE l."galaxyFieldId"=f.id) AS occupied FROM galaxy_fields f WHERE f."layerId"=$1 ORDER BY f.id`,
      [layerId],
    );
    for (const field of fields) {
      field.effects = decodeEffects(field.effects);
      field.effectFlags = decodeEffects(field.effectFlags);
    }
    const systems = await manager.query(
      `SELECT s.*, (EXISTS (SELECT 1 FROM colonies c JOIN users u ON u."starterColonyId"=c.id WHERE c."starSystemId"=s.id) OR EXISTS (SELECT 1 FROM onboarding_selections o WHERE o."selectedSystemId"=s.id) OR COALESCE(s."landmarkKey",'') ILIKE '%starter%' OR EXISTS (SELECT 1 FROM galaxy_fields f WHERE f."starSystemId"=s.id AND COALESCE(f."adminRegionKey",'') ILIKE '%START%')) AS starter FROM star_systems s WHERE s."layerId"=$1 ORDER BY s.id`,
      [layerId],
    );
    const wormholes = await manager.query(
      'SELECT * FROM wormholes WHERE "entryLayerId"=$1 OR "exitLayerId"=$1 ORDER BY id',
      [layerId],
    );
    const routes = await manager.query(
      'SELECT seg.* FROM hyperspace_route_segments seg JOIN hyperspace_routes r ON r.id=seg."routeId" WHERE r."layerId"=$1 ORDER BY seg.id',
      [layerId],
    );
    return { layer, types, fields, systems, wormholes, routes };
  }
  private plan(snapshot: Snapshot, settings: NebulaSettingsDto) {
    const types = new Map(snapshot.types.map((t) => [t.id, t])),
      systems = new Map(snapshot.systems.map((s) => [s.id, s]));
    const visual: NebulaVisualDto = {
      version: 2,
      seed: createHmac('sha256', snapshot.layer.nebulaSeedSalt)
        .update(`${settings.seed}:GALAXY:${snapshot.layer.id}`)
        .digest('hex'),
      width: snapshot.layer.width,
      height: snapshot.layer.height,
      density: settings.density,
    };
    const terrain = generateFilmicNebulaTerrain(visual),
      protectedCoordinates = new Set<string>(),
      counts = new Map<number, number>(),
      updates: Update[] = [];
    // Ordinary systems keep their anchor; only starter systems have a larger safety zone.
    for (const s of snapshot.systems)
      protectRadius(protectedCoordinates, s.cx, s.cy, s.starter ? 2 : 0);
    for (const w of snapshot.wormholes) {
      if (w.entryLayerId === snapshot.layer.id)
        protectRadius(protectedCoordinates, w.entryCx, w.entryCy, 2);
      if (w.exitLayerId === snapshot.layer.id)
        protectRadius(protectedCoordinates, w.exitCx, w.exitCy, 2);
    }
    for (const r of snapshot.routes) {
      const from = systems.get(r.fromSystemId),
        to = systems.get(r.toSystemId);
      if (from && to)
        protectRoute(protectedCoordinates, [
          { x: from.cx, y: from.cy },
          ...(r.controlPointJson ?? []),
          { x: to.cx, y: to.cy },
        ]);
    }
    let protectedFields = 0;
    const map: NebulaPreviewMapDto = {
      scope: 'GALAXY',
      id: snapshot.layer.id,
      name: snapshot.layer.name,
      width: snapshot.layer.width,
      height: snapshot.layer.height,
      nebulaVisual: visual,
      fields: [],
      changes: [],
    };
    for (const field of snapshot.fields) {
      const type = types.get(field.fieldTypeId),
        system = field.starSystemId
          ? systems.get(field.starSystemId)
          : undefined,
        currentVisual = nebulaVisualForField(field);
      map.fields.push({
        id: field.id,
        x: field.cx,
        y: field.cy,
        fieldTypeId: field.fieldTypeId,
        label: system?.name ?? type?.name ?? 'Weltraum',
        objectClassId: null,
        systemTypeId: system?.systemTypeId ?? field.systemTypeId,
        ...(currentVisual ? { nebulaVisual: currentVisual } : {}),
      });
      const generation = field.nebulaGeneration;
      const owned =
        !!currentVisual &&
        !!generation &&
        isNebulaBaseline(generation.baseline) &&
        empty(types.get(generation.baseline.fieldTypeId)) &&
        !!type &&
        field.isPassable === type.passable &&
        field.energyCost === type.energyCost &&
        field.damage === type.damage &&
        sameEffects(field.effects, type.effects) &&
        sameEffects(field.effectFlags, type.effects);
      const original =
          owned && generation ? generation.baseline : baseline(field),
        originalType = types.get(original.fieldTypeId),
        candidate = terrain.get(`${field.cx},${field.cy}`);
      // A manually cleared field is still an edit, even if it now looks like empty space.
      if (generation && !owned) {
        if (candidate !== undefined) protectedFields++;
        continue;
      }
      if (candidate === undefined && !owned) continue;
      const protectedField =
        !empty(originalType) ||
        !originalType ||
        original.isPassable !== originalType.passable ||
        original.energyCost !== originalType.energyCost ||
        original.damage !== originalType.damage ||
        (original.effects?.length ?? 0) > 0 ||
        (original.effectFlags?.length ?? 0) > 0 ||
        field.passableOverride != null ||
        field.borderTypeId != null ||
        field.occupied ||
        field.starSystemId != null ||
        field.systemTypeId != null ||
        protectedCoordinates.has(`${field.cx},${field.cy}`);
      if (protectedField) {
        protectedFields++;
        continue;
      }
      let update: Update;
      if (candidate !== undefined) {
        const next = types.get(candidate);
        if (!next) throw new BadRequestException('Nebeltyp fehlt');
        update = {
          id: field.id,
          fieldTypeId: candidate,
          isPassable: next.passable,
          energyCost: next.energyCost,
          damage: next.damage,
          effects: next.effects,
          effectFlags: next.effects,
          nebulaGeneration: {
            visual,
            fieldTypeId: candidate,
            baseline: original,
          },
        };
      } else update = { id: field.id, ...original, nebulaGeneration: null };
      if (
        JSON.stringify(baseline(field)) === JSON.stringify(baseline(update)) &&
        canonical(field.nebulaGeneration ?? null) ===
          canonical(update.nebulaGeneration)
      )
        continue;
      updates.push(update);
      map.changes.push({
        fieldId: field.id,
        x: field.cx,
        y: field.cy,
        fieldTypeId: update.fieldTypeId,
        ...(candidate === undefined ? { restore: true } : {}),
      });
      counts.set(update.fieldTypeId, (counts.get(update.fieldTypeId) ?? 0) + 1);
    }
    const preview: NebulaPreviewDto = {
      layerId: snapshot.layer.id,
      settings,
      fingerprint: createHash('sha256')
        .update(JSON.stringify({ version: 2, settings, snapshot }))
        .digest('hex'),
      maps: [map],
      summary: {
        changedFields: updates.length,
        protectedFields,
        byFieldType: [...counts]
          .sort(([a], [b]) => a - b)
          .map(([id, count]) => {
            const t = types.get(id)!;
            return {
              id,
              count,
              name: t.name,
              energyCost: t.energyCost,
              damage: t.damage,
              specialDamage: t.specialDamage,
              effects: t.effects ?? [],
              miningResources: t.miningResources ?? [],
            };
          }),
      },
    };
    return { preview, updates };
  }
}
