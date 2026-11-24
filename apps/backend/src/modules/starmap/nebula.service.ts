import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { DataSource, EntityManager } from 'typeorm';
import type {
  NebulaApplyDto,
  NebulaApplyResultDto,
  NebulaPreviewDto,
  NebulaPreviewMapDto,
  NebulaSettingsDto,
} from '@swuniverse/shared';
import {
  generateNebulaTerrain,
  NEBULA_FIELD_IDS,
  protectRadius,
  protectRoute,
} from './generator/nebula-generator';

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
function decodeEffects(value: string[] | string | null): string[] | null {
  if (value == null) return null;
  const decoded: unknown =
    typeof value === 'string' ? JSON.parse(value) : value;
  if (
    !Array.isArray(decoded) ||
    !decoded.every((entry) => typeof entry === 'string')
  )
    throw new BadRequestException('Ungültige Feldeffekte');
  return decoded;
}

interface Field {
  id: number;
  cx?: number;
  cy?: number;
  sx?: number;
  sy?: number;
  starSystemId: number | null;
  fieldTypeId: number;
  celestialObjectId?: number | null;
  systemTypeId?: number | null;
  isPassable: boolean;
  energyCost: number;
  damage: number;
  effects: string[] | null;
  effectFlags?: string[] | null;
  passableOverride?: boolean | null;
  borderTypeId?: number | null;
  occupied: boolean;
}
interface System {
  id: number;
  name: string;
  cx: number;
  cy: number;
  maxX: number;
  maxY: number;
  systemTypeId: number;
  landmarkKey: string | null;
  starter: boolean;
}
interface Snapshot {
  layer: { id: number; name: string; width: number; height: number };
  types: FieldType[];
  galaxy: Field[];
  fields: Field[];
  systems: System[];
  objects: {
    id: number;
    starSystemId: number;
    posX: number;
    posY: number;
    classId: number | null;
    name: string | null;
  }[];
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

@Injectable()
export class NebulaService {
  constructor(private readonly source: DataSource) {}

  private settings(input: NebulaSettingsDto): NebulaSettingsDto {
    if (
      !input ||
      typeof input.seed !== 'string' ||
      !input.seed.trim() ||
      input.seed.trim().length > 128 ||
      !['GALAXY', 'SYSTEMS', 'BOTH'].includes(input.target) ||
      !['SUBTLE', 'BALANCED', 'RICH'].includes(input.density)
    ) {
      throw new BadRequestException(
        'Seed (1–128 Zeichen), Ziel oder Dichte ungültig',
      );
    }
    return {
      seed: input.seed.trim(),
      target: input.target,
      density: input.density,
    };
  }

  async preview(
    layerId: number,
    input: NebulaSettingsDto,
  ): Promise<NebulaPreviewDto> {
    const settings = this.settings(input);
    return this.source.transaction('REPEATABLE READ', async (manager) =>
      this.plan(await this.snapshot(manager, layerId), settings),
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
    ) {
      throw new BadRequestException('Eine gültige Vorschau ist erforderlich');
    }
    try {
      return await this.source.transaction('SERIALIZABLE', async (manager) => {
        // Occupancy and protected topology must remain stable until commit, including new rows.
        // Acquire these short-lived read locks before the first MVCC snapshot is taken.
        await manager.query(`LOCK TABLE spacecraft, space_locations, colonies, users,
          onboarding_selections, star_systems, galaxy_field_types, wormholes,
          hyperspace_routes, hyperspace_route_segments IN SHARE MODE`);
        // Lock target fields in a fixed order; a concurrent edit cannot slip between validation and update.
        await manager.query('SELECT id FROM layers WHERE id = $1 FOR UPDATE', [
          layerId,
        ]);
        await manager.query(
          'SELECT id FROM galaxy_fields WHERE "layerId" = $1 ORDER BY id FOR UPDATE',
          [layerId],
        );
        await manager.query(
          'SELECT id FROM system_fields WHERE "starSystemId" IN (SELECT id FROM star_systems WHERE "layerId" = $1) ORDER BY id FOR UPDATE',
          [layerId],
        );
        const snapshot = await this.snapshot(manager, layerId);
        const plan = this.plan(snapshot, settings);
        if (plan.fingerprint !== input.fingerprint) {
          throw new ConflictException(
            'Die Karte hat sich geändert. Bitte eine neue Vorschau erzeugen.',
          );
        }
        const types = new Map(snapshot.types.map((type) => [type.id, type]));
        for (const map of plan.maps) {
          // Batch by type instead of one database round-trip per tile.
          const byType = new Map<number, number[]>();
          for (const change of map.changes) {
            const ids = byType.get(change.fieldTypeId) ?? [];
            ids.push(change.fieldId);
            byType.set(change.fieldTypeId, ids);
          }
          for (const [typeId, ids] of byType) {
            const type = types.get(typeId)!;
            if (map.scope === 'GALAXY') {
              await manager.query(
                `UPDATE galaxy_fields SET "fieldTypeId" = $1, "isPassable" = $2,
                "energyCost" = $3, damage = $4, "effectFlags" = $5, effects = $5 WHERE id = ANY($6::int[])`,
                [
                  typeId,
                  type.passable,
                  type.energyCost,
                  type.damage,
                  type.effects ? JSON.stringify(type.effects) : null,
                  ids,
                ],
              );
            } else {
              await manager.query(
                `UPDATE system_fields SET "fieldTypeId" = $1, "isPassable" = $2,
                "energyCost" = $3, damage = $4, effects = $5 WHERE id = ANY($6::int[])`,
                [
                  typeId,
                  type.passable,
                  type.energyCost,
                  type.damage,
                  type.effects ? JSON.stringify(type.effects) : null,
                  ids,
                ],
              );
            }
          }
        }
        return { changedFields: plan.summary.changedFields };
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
      'SELECT id, name, width, height FROM layers WHERE id = $1',
      [layerId],
    );
    if (!layer) throw new NotFoundException('Ebene nicht gefunden');
    const types: FieldType[] = await manager.query(
      'SELECT * FROM galaxy_field_types ORDER BY id',
    );
    for (const type of types) type.effects = decodeEffects(type.effects);
    for (const id of NEBULA_FIELD_IDS) {
      const type = types.find((entry) => entry.id === id);
      if (
        !type ||
        type.category !== 'nebula' ||
        !type.passable ||
        type.specialDamage > 0 ||
        type.energyCost > 2 ||
        type.damage > 12
      ) {
        throw new BadRequestException(
          `Passierbarer Nebeltyp ${id} fehlt oder wurde verändert`,
        );
      }
    }
    const galaxy = await manager.query(
      `SELECT f.*, EXISTS (
      SELECT 1 FROM spacecraft s JOIN space_locations l ON l.id = s."locationId" WHERE l."galaxyFieldId" = f.id
      ) AS occupied FROM galaxy_fields f WHERE f."layerId" = $1 ORDER BY f.id`,
      [layerId],
    );
    const systems = await manager.query(
      `SELECT s.*, (
      EXISTS (SELECT 1 FROM colonies c JOIN users u ON u."starterColonyId" = c.id WHERE c."starSystemId" = s.id)
      OR EXISTS (SELECT 1 FROM onboarding_selections o WHERE o."selectedSystemId" = s.id)
      OR COALESCE(s."landmarkKey", '') ILIKE '%starter%'
      OR EXISTS (SELECT 1 FROM galaxy_fields gf WHERE gf."starSystemId" = s.id AND COALESCE(gf."adminRegionKey", '') ILIKE '%START%')
      ) AS starter FROM star_systems s WHERE s."layerId" = $1 ORDER BY s.id`,
      [layerId],
    );
    const fields = await manager.query(
      `SELECT f.*, (
      EXISTS (SELECT 1 FROM spacecraft s JOIN space_locations l ON l.id = s."locationId" WHERE l."systemFieldId" = f.id)
      OR EXISTS (SELECT 1 FROM colonies c WHERE c."systemFieldId" = f.id OR (c."starSystemId" = f."starSystemId" AND c."posX" = f.sx AND c."posY" = f.sy))
      ) AS occupied FROM system_fields f JOIN star_systems s ON s.id = f."starSystemId" WHERE s."layerId" = $1 ORDER BY f.id`,
      [layerId],
    );
    const objects = await manager.query(
      `SELECT o.id, o."starSystemId", o."posX", o."posY", o."classId", o.name
      FROM celestial_objects o JOIN star_systems s ON s.id = o."starSystemId" WHERE s."layerId" = $1 ORDER BY o.id`,
      [layerId],
    );
    const wormholes = await manager.query(
      'SELECT * FROM wormholes WHERE "entryLayerId" = $1 OR "exitLayerId" = $1 ORDER BY id',
      [layerId],
    );
    const routes = await manager.query(
      `SELECT seg.* FROM hyperspace_route_segments seg
      JOIN hyperspace_routes route ON route.id = seg."routeId" WHERE route."layerId" = $1 ORDER BY seg.id`,
      [layerId],
    );
    for (const field of [...galaxy, ...fields]) {
      field.effects = decodeEffects(field.effects);
      if (field.effectFlags !== undefined)
        field.effectFlags = decodeEffects(field.effectFlags);
    }
    return {
      layer,
      types,
      galaxy,
      fields,
      systems,
      objects,
      wormholes,
      routes,
    };
  }

  private plan(
    snapshot: Snapshot,
    settings: NebulaSettingsDto,
  ): NebulaPreviewDto {
    const types = new Map(snapshot.types.map((type) => [type.id, type]));
    const systems = new Map(
      snapshot.systems.map((system) => [system.id, system]),
    );
    const objects = new Map(
      snapshot.objects.map((object) => [object.id, object]),
    );
    const fieldsBySystem = new Map<number, Field[]>();
    for (const field of snapshot.fields) {
      const list = fieldsBySystem.get(field.starSystemId!) ?? [];
      list.push(field);
      fieldsBySystem.set(field.starSystemId!, list);
    }
    const objectsBySystem = new Map<number, Snapshot['objects']>();
    for (const object of snapshot.objects) {
      const list = objectsBySystem.get(object.starSystemId) ?? [];
      list.push(object);
      objectsBySystem.set(object.starSystemId, list);
    }
    const maps: NebulaPreviewMapDto[] = [];
    let protectedFields = 0;
    const counts = new Map<number, number>();
    const addMap = (
      scope: 'GALAXY' | 'SYSTEM',
      id: number,
      name: string,
      width: number,
      height: number,
      fields: Field[],
      protectedCoordinates: Set<string>,
    ) => {
      const terrain = generateNebulaTerrain(
        width,
        height,
        `${settings.seed}:${scope}:${id}`,
        scope,
        settings.density,
      );
      const map: NebulaPreviewMapDto = {
        scope,
        id,
        name,
        width,
        height,
        ...(scope === 'SYSTEM'
          ? { systemTypeId: systems.get(id)?.systemTypeId }
          : {}),
        fields: [],
        changes: [],
      };
      for (const field of fields) {
        const x = field.cx ?? field.sx!,
          y = field.cy ?? field.sy!;
        const type = types.get(field.fieldTypeId);
        const object = field.celestialObjectId
          ? objects.get(field.celestialObjectId)
          : undefined;
        const system =
          scope === 'GALAXY' && field.starSystemId
            ? systems.get(field.starSystemId)
            : undefined;
        map.fields.push({
          id: field.id,
          x,
          y,
          fieldTypeId: field.fieldTypeId,
          label: object?.name ?? system?.name ?? type?.name ?? 'Weltraum',
          objectClassId: object?.classId ?? null,
          systemTypeId: system?.systemTypeId ?? field.systemTypeId ?? null,
        });
        const candidate = terrain.get(`${x},${y}`);
        if (candidate === undefined) continue;
        const empty =
          type?.key === 'EMPTY_SPACE' ||
          type?.key === 'DEEP_SPACE' ||
          type?.category === 'space';
        const changedDefaults =
          !type ||
          field.isPassable !== type.passable ||
          field.energyCost !== type.energyCost ||
          field.damage !== type.damage;
        const effectOverride =
          (field.effects?.length ?? 0) > 0 ||
          (field.effectFlags?.length ?? 0) > 0;
        if (
          !empty ||
          changedDefaults ||
          effectOverride ||
          field.passableOverride != null ||
          field.borderTypeId != null ||
          field.occupied ||
          field.celestialObjectId ||
          (scope === 'GALAXY' && (field.starSystemId || field.systemTypeId)) ||
          protectedCoordinates.has(`${x},${y}`)
        ) {
          protectedFields++;
          continue;
        }
        map.changes.push({ fieldId: field.id, x, y, fieldTypeId: candidate });
        counts.set(candidate, (counts.get(candidate) ?? 0) + 1);
      }
      // Keep the galaxy in the preview even if all selected cells are protected.
      if (scope === 'GALAXY' || map.changes.length) maps.push(map);
    };
    if (settings.target !== 'SYSTEMS') {
      const protectedCoordinates = new Set<string>();
      for (const system of snapshot.systems)
        protectRadius(
          protectedCoordinates,
          system.cx,
          system.cy,
          system.starter ? 2 : 1,
        );
      for (const wormhole of snapshot.wormholes) {
        if (wormhole.entryLayerId === snapshot.layer.id)
          protectRadius(
            protectedCoordinates,
            wormhole.entryCx,
            wormhole.entryCy,
            2,
          );
        if (wormhole.exitLayerId === snapshot.layer.id)
          protectRadius(
            protectedCoordinates,
            wormhole.exitCx,
            wormhole.exitCy,
            2,
          );
      }
      for (const route of snapshot.routes) {
        const from = systems.get(route.fromSystemId),
          to = systems.get(route.toSystemId);
        if (!from || !to) continue;
        protectRoute(protectedCoordinates, [
          { x: from.cx, y: from.cy },
          ...(route.controlPointJson ?? []),
          { x: to.cx, y: to.cy },
        ]);
      }
      addMap(
        'GALAXY',
        snapshot.layer.id,
        snapshot.layer.name,
        snapshot.layer.width,
        snapshot.layer.height,
        snapshot.galaxy,
        protectedCoordinates,
      );
    }
    if (settings.target !== 'GALAXY')
      for (const system of snapshot.systems) {
        const fields = fieldsBySystem.get(system.id) ?? [];
        if (!fields.length) continue;
        const protectedCoordinates = new Set<string>();
        // Any passable edge tile is a possible entry point in findSystemEntryField.
        for (const field of fields)
          if (
            field.sx === 1 ||
            field.sy === 1 ||
            field.sx === system.maxX ||
            field.sy === system.maxY
          )
            protectRadius(protectedCoordinates, field.sx!, field.sy!, 0);
        for (const object of objectsBySystem.get(system.id) ?? [])
          protectRadius(protectedCoordinates, object.posX, object.posY, 1);
        for (const field of fields)
          if (field.celestialObjectId)
            protectRadius(protectedCoordinates, field.sx!, field.sy!, 1);
        addMap(
          'SYSTEM',
          system.id,
          system.name,
          system.maxX,
          system.maxY,
          fields,
          protectedCoordinates,
        );
      }
    const fingerprint = createHash('sha256')
      .update(JSON.stringify({ version: 1, settings, snapshot }))
      .digest('hex');
    return {
      layerId: snapshot.layer.id,
      settings,
      fingerprint,
      maps,
      summary: {
        changedFields: [...counts.values()].reduce((a, b) => a + b, 0),
        protectedFields,
        byFieldType: [...counts.entries()]
          .sort(([a], [b]) => a - b)
          .map(([id, count]) => {
            const type = types.get(id)!;
            return {
              id,
              count,
              name: type.name,
              energyCost: type.energyCost,
              damage: type.damage,
              specialDamage: type.specialDamage,
              effects: type.effects ?? [],
              miningResources: type.miningResources ?? [],
            };
          }),
      },
    };
  }
}
