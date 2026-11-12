import { In, IsNull, Not, type EntityManager } from 'typeorm';
import { FieldEffect, type AnomalyViewDto } from '@swuniverse/shared';
import type { AnomalyHandler } from './anomaly-registry';
import type { TransactionalNotifications } from '../messaging/messaging.service';
import type { Spacecraft } from '../spacecraft/entities/spacecraft.entity';
import { Anomaly } from './entities/anomaly.entity';
import { AnomalyType } from './entities/anomaly-type.entity';
import { GalaxyField } from '../starmap/entities/galaxy-field.entity';
import { Layer } from '../starmap/entities/layer.entity';
import { SpaceLocation } from '../starmap/entities/space-location.entity';
import {
  changeMovement,
  createRandomIonStormData,
  horizontalMovement,
  verticalMovement,
  type IonStormData,
} from './ion-storm-data';
import type { AnomalyRandom } from './stu-random';

/** STU `stu_anomaly_type.lifespan_in_ticks` for the ion storm. */
export const ION_STORM_LIFESPAN_TICKS = 1000;
export const DEFAULT_LOCATIONS_PER_ION_STORM = 3000;

export interface IonStormOptions {
  /** Galaxy fields per storm; a layer holds `ceil(width × height / value)` storms. */
  locationsPerStorm: number;
}

/** Storm effects on spacecraft; provided by the spacecraft module. */
export interface IonStormEffects {
  /** Main tick: spacecraft on these storm fields (STU `damageSpacecrafts`). */
  affectStormFields(
    manager: EntityManager,
    fields: Array<{ locationId: number; intensity: number }>,
    transaction?: TransactionalNotifications,
  ): Promise<void>;
  /** A spacecraft entered a storm field (STU `handleIncomingSpacecraft`). */
  affectEntering(
    manager: EntityManager,
    ship: Spacecraft,
    intensity: number,
    messages: string[],
    transaction?: TransactionalNotifications,
  ): Promise<void>;
}

interface PoolField {
  locationId: number;
  cx: number;
  cy: number;
  passable: boolean;
  forbidden: boolean;
}

/**
 * Ion storm following STU `IonStormHandler`: a location-less root carries the
 * storm data and drives its storm fields; the fields themselves are inert in
 * the generic per-anomaly tick, which only counts their lifespan down.
 */
export class IonStormHandler implements AnomalyHandler {
  readonly key = 'ION_STORM';
  readonly name = 'Ionensturm';
  private effects: IonStormEffects | null = null;

  constructor(
    private readonly random: AnomalyRandom,
    private readonly options: IonStormOptions = { locationsPerStorm: DEFAULT_LOCATIONS_PER_ION_STORM },
  ) {}

  registerEffects(effects: IonStormEffects): void {
    this.effects = effects;
  }

  present(anomaly: Anomaly): Partial<AnomalyViewDto> {
    const data = (anomaly.parent?.data ?? anomaly.data) as Partial<IonStormData> | null;
    return data?.intensity == null ? {} : { intensity: data.intensity };
  }

  async checkForCreation(manager: EntityManager): Promise<void> {
    const type = await this.ensureType(manager);
    for (const layer of await manager.getRepository(Layer).find({ order: { id: 'ASC' } })) {
      const maximum = Math.ceil((layer.width * layer.height) / this.options.locationsPerStorm);
      const existing = await manager
        .getRepository(Anomaly)
        .createQueryBuilder('root')
        .where('root.typeId = :typeId', { typeId: type.id })
        .andWhere('root.parentId IS NULL AND root.locationId IS NULL')
        .andWhere("(root.data ->> 'layerId')::int = :layerId", { layerId: layer.id })
        .getCount();
      for (let missing = maximum - existing; missing > 0; missing--) {
        const locationId = await this.randomCreationLocation(manager, layer.id);
        if (locationId == null) break;
        const root = await manager.getRepository(Anomaly).save({
          typeId: type.id,
          locationId: null,
          remainingTicks: ION_STORM_LIFESPAN_TICKS,
          data: createRandomIonStormData(layer.id, this.random),
        });
        await manager.getRepository(Anomaly).save({
          typeId: type.id,
          locationId,
          parentId: root.id,
          remainingTicks: ION_STORM_LIFESPAN_TICKS,
        });
      }
    }
  }

  async handleTick(root: Anomaly, manager: EntityManager, transaction?: TransactionalNotifications): Promise<void> {
    if (root.parentId != null || root.locationId != null) return;
    const repository = manager.getRepository(Anomaly);
    let data = root.data as IonStormData;
    let children = await repository.find({ where: { parentId: root.id }, order: { id: 'ASC' } });
    if (!children.length) {
      root.remainingTicks = 0;
      return;
    }
    const pool = await this.loadPool(manager, root.typeId, data, children);

    // STU IonStormMovement
    const dx = horizontalMovement(data);
    const dy = verticalMovement(data);
    const moved: Anomaly[] = [];
    for (const child of children) {
      const current = pool.byLocation.get(child.locationId ?? -1);
      const target = current && pool.at(current.cx + dx, current.cy + dy);
      pool.storms.delete(child.locationId ?? -1);
      if (!target || !target.passable || target.forbidden || pool.storms.has(target.locationId)) {
        await repository.remove(child);
        continue;
      }
      child.locationId = target.locationId;
      pool.storms.set(target.locationId, child);
      moved.push(child);
    }
    children = moved;
    if (data.movementType === 'VARIABLE') {
      data = changeMovement(data, this.random);
      root.data = data;
    }

    // STU IonStormPropagation
    if (!children.length) {
      root.remainingTicks = 0;
      return;
    }
    const changed = new Set<Anomaly>(children);
    for (const child of children) {
      this.transfer(root, child, this.random.integer(1, 3));
      await this.split(manager, root, child, pool, changed);
    }
    if (root.remainingTicks <= 1) root.remainingTicks += 1;
    await repository.save([...changed]);

    // STU damageSpacecrafts: fields about to expire leave spacecraft alone.
    const active = [...changed].filter((field) => field.remainingTicks > 1 && field.locationId != null);
    if (this.effects && active.length) {
      await this.effects.affectStormFields(
        manager,
        active.map((field) => ({ locationId: field.locationId as number, intensity: data.intensity })),
        transaction,
      );
    }
  }

  async handleIncomingSpacecraft(
    anomaly: Anomaly,
    ship: Spacecraft,
    manager: EntityManager,
    transaction?: TransactionalNotifications,
    messages: string[] = [],
  ): Promise<void> {
    const intensity = this.present(anomaly).intensity;
    if (!this.effects || intensity == null) return;
    await this.effects.affectEntering(manager, ship, intensity, messages, transaction);
  }

  async onDisappear(): Promise<void> {
    // Storm fields carry no state beyond their row.
  }

  private async split(
    manager: EntityManager,
    root: Anomaly,
    child: Anomaly,
    pool: Awaited<ReturnType<IonStormHandler['loadPool']>>,
    changed: Set<Anomaly>,
  ): Promise<void> {
    if (child.remainingTicks < 10) return;
    const location = pool.byLocation.get(child.locationId ?? -1);
    if (!location) return;
    const neighbours = [
      pool.at(location.cx, location.cy - 1),
      pool.at(location.cx, location.cy + 1),
      pool.at(location.cx - 1, location.cy),
      pool.at(location.cx + 1, location.cy),
    ].filter((field): field is PoolField => field != null);
    if (!neighbours.length) return;
    const target = neighbours[this.random.integer(0, neighbours.length - 1)];
    if (target.forbidden || !target.passable) return;
    const existing = pool.storms.get(target.locationId);
    if (existing) {
      this.transfer(child, existing, this.random.integer(20, 70));
      changed.add(existing);
      return;
    }
    const created = await manager.getRepository(Anomaly).save({
      typeId: root.typeId,
      locationId: target.locationId,
      parentId: root.id,
      remainingTicks: 0,
    });
    this.transfer(child, created, this.random.integer(10, 90));
    pool.storms.set(target.locationId, created);
    changed.add(created);
  }

  private transfer(source: Anomaly, target: Anomaly, percentage: number): void {
    const amount = Math.floor((source.remainingTicks * percentage) / 100);
    source.remainingTicks -= amount;
    target.remainingTicks += amount;
  }

  /** STU `LocationPoolFactory`: the storm's bounding box stretched by velocity + 1. */
  private async loadPool(manager: EntityManager, typeId: number, data: IonStormData, children: Anomaly[]) {
    const childFields = await manager.getRepository(SpaceLocation).find({
      where: { id: In(children.map((child) => child.locationId ?? -1)) },
      relations: ['galaxyField'],
    });
    const xs = childFields.flatMap((location) => (location.galaxyField ? [location.galaxyField.cx] : []));
    const ys = childFields.flatMap((location) => (location.galaxyField ? [location.galaxyField.cy] : []));
    const stretch = data.velocity + 1;
    const fields = xs.length
      ? await manager
          .getRepository(GalaxyField)
          .createQueryBuilder('field')
          .leftJoinAndSelect('field.fieldType', 'fieldType')
          .where('field.layerId = :layerId', { layerId: data.layerId })
          .andWhere('field.cx BETWEEN :minX AND :maxX', { minX: Math.min(...xs) - stretch, maxX: Math.max(...xs) + stretch })
          .andWhere('field.cy BETWEEN :minY AND :maxY', { minY: Math.min(...ys) - stretch, maxY: Math.max(...ys) + stretch })
          .getMany()
      : [];
    const locations = fields.length
      ? await manager.getRepository(SpaceLocation).find({ where: { galaxyFieldId: In(fields.map((field) => field.id)) } })
      : [];
    const locationByField = new Map(locations.map((location) => [location.galaxyFieldId, location.id]));
    const byCoordinate = new Map<string, PoolField>();
    const byLocation = new Map<number, PoolField>();
    for (const field of fields) {
      const locationId = locationByField.get(field.id);
      if (locationId == null) continue;
      const entry: PoolField = {
        locationId,
        cx: field.cx,
        cy: field.cy,
        passable: field.isPassable,
        forbidden: [...(field.effects ?? []), ...(field.fieldType?.effects ?? [])].includes(FieldEffect.NO_ANOMALIES),
      };
      byCoordinate.set(`${field.cx}_${field.cy}`, entry);
      byLocation.set(locationId, entry);
    }
    const storms = new Map<number, Anomaly>();
    const own = new Map(children.map((child) => [child.id, child]));
    if (byLocation.size) {
      for (const storm of await manager.getRepository(Anomaly).find({
        where: { typeId, locationId: In([...byLocation.keys()]), parentId: Not(IsNull()) },
      })) {
        // Keep the instances this tick mutates, so transfers land on one object.
        const instance = own.get(storm.id) ?? storm;
        if (instance.locationId != null) storms.set(instance.locationId, instance);
      }
    }
    return {
      byLocation,
      storms,
      at: (cx: number, cy: number) => byCoordinate.get(`${cx}_${cy}`),
    };
  }

  private async randomCreationLocation(manager: EntityManager, layerId: number): Promise<number | null> {
    const candidates = manager
      .getRepository(SpaceLocation)
      .createQueryBuilder('location')
      .innerJoin('location.galaxyField', 'field')
      .innerJoin('field.fieldType', 'fieldType')
      .where('field.layerId = :layerId', { layerId })
      .andWhere('field.isPassable = true')
      .andWhere(`COALESCE(field.effects, '') NOT LIKE :forbidden`, { forbidden: `%"${FieldEffect.NO_ANOMALIES}"%` })
      .andWhere(`COALESCE(fieldType.effects, '') NOT LIKE :forbidden`)
      .andWhere(
        `NOT EXISTS (SELECT 1 FROM anomalies storm INNER JOIN anomaly_types stormType ON stormType.id = storm."typeId"
          WHERE storm."locationId" = location.id AND stormType.key = :key)`,
        { key: this.key },
      );
    const count = await candidates.getCount();
    if (count === 0) return null;
    const pick = await candidates
      .orderBy('location.id', 'ASC')
      .offset(this.random.integer(0, count - 1))
      .limit(1)
      .getOne();
    return pick?.id ?? null;
  }

  private async ensureType(manager: EntityManager): Promise<AnomalyType> {
    const repository = manager.getRepository(AnomalyType);
    return (await repository.findOneBy({ key: this.key })) ?? repository.save({ key: this.key });
  }
}
