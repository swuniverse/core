import { In, type EntityManager } from 'typeorm';
import { MessageTargetKind } from '@swuniverse/shared';
import type { IonStormEffects } from '../anomaly/ion-storm.handler';
import type { AnomalyRandom } from '../anomaly/stu-random';
import { User } from '../auth/user.entity';
import { MessageFolder } from '../messaging/message-folder';
import type { MessagingService, TransactionalNotifications } from '../messaging/messaging.service';
import { SpaceLocation } from '../starmap/entities/space-location.entity';
import { CrewEnhancementEvent } from './crew-expertise';
import type { CrewEnhancementService } from './crew-enhancement.service';
import { Spacecraft, SpacecraftKind, SpacecraftStatus } from './entities/spacecraft.entity';
import { isSpacecraftDestroyed } from './spacecraft-status.util';
import { SpacecraftModule } from './entities/spacecraft-module.entity';
import type { SpacecraftDestructionService } from './spacecraft-destruction.service';
import { SpacecraftDamage } from './spacecraft-damage';

/** STU `IonStormHandler`: systems an ion storm hit may damage. */
export const ION_STORM_TARGET_SYSTEMS = ['DEFLECTOR', 'LONG_RANGE_SENSORS', 'SHORT_RANGE_SENSORS', 'SUBLIGHT_DRIVE', 'WARPDRIVE'] as const;
const DRIVE_DEACTIVATION_MEAN_SECONDS = 30 * 60;
const TICK_DAMAGE_PERCENTAGE = 10;
const ENTRY_DAMAGE_PERCENTAGE = 20;

type SystemState = { active?: boolean; integrity?: number; cooldown?: number };

export interface IonStormEffectsDependencies {
  random: AnomalyRandom;
  messaging: Pick<MessagingService, 'sendSystem'>;
  destruction: Pick<SpacecraftDestructionService, 'destroyInManager'>;
  crewEnhancement: Pick<CrewEnhancementService, 'enhanceSpacecraft'>;
  /** Whether an installed module type carries STU's ion storm damage reduction. */
  hasIonStormReduction: (moduleType: string) => boolean;
  now?: () => number;
}

/** Ion storm effects on spacecraft, following STU `IonStormHandler`. */
export class SpacecraftIonStormEffects implements IonStormEffects {
  private readonly damage: SpacecraftDamage;
  private readonly now: () => number;

  constructor(private readonly deps: IonStormEffectsDependencies) {
    this.damage = new SpacecraftDamage(deps.random);
    this.now = deps.now ?? Date.now;
  }

  async affectStormFields(
    manager: EntityManager,
    fields: Array<{ locationId: number; intensity: number }>,
    transaction?: TransactionalNotifications,
  ): Promise<void> {
    const intensityByLocation = new Map(fields.map((field) => [field.locationId, field.intensity]));
    const ships = await manager.getRepository(Spacecraft).find({
      where: { locationId: In([...intensityByLocation.keys()]) },
      order: { id: 'ASC' },
      lock: { mode: 'pessimistic_write' },
    });
    if (!ships.length) return;
    const vacationing = new Set(
      (await manager.getRepository(User).find({
        select: { id: true },
        where: { id: In([...new Set(ships.map((ship) => ship.userId))]), vacationMode: true },
      })).map((user) => user.id),
    );
    const sectors = await this.sectors(manager, ships.map((ship) => ship.locationId));
    const modules = await this.modulesByShip(manager, ships.map((ship) => ship.id));
    for (const ship of ships) {
      if (vacationing.has(ship.userId) || ship.status === SpacecraftStatus.DESTROYED) continue;
      const info = [`Die ${ship.name} in Sektor ${sectors.get(ship.locationId) ?? '?'} befindet sich in einem gefährlichen Ionensturm.`];
      const intensity = intensityByLocation.get(ship.locationId) ?? 0;
      if (ship.kind === SpacecraftKind.STATION) {
        this.deactivateShields(ship, info);
        await this.persist(manager, ship);
      } else {
        await this.damageSpacecraft(manager, ship, modules.get(ship.id) ?? [], intensity, TICK_DAMAGE_PERCENTAGE, info, transaction);
      }
      const destroyed = isSpacecraftDestroyed(ship);
      await this.deps.messaging.sendSystem(
        ship.userId,
        'Ionensturm',
        info.join('\n'),
        undefined,
        ship.kind === SpacecraftKind.STATION ? MessageFolder.STATION : MessageFolder.SHIP,
        destroyed ? undefined : { kind: MessageTargetKind.SPACECRAFT, id: ship.id },
        false,
        transaction,
      );
    }
  }

  async affectEntering(
    manager: EntityManager,
    ship: Spacecraft,
    intensity: number,
    messages: string[],
    transaction?: TransactionalNotifications,
  ): Promise<void> {
    const sector = (await this.sectors(manager, [ship.locationId])).get(ship.locationId) ?? '?';
    const info = [`In Sektor ${sector} befindet sich ein gefährlicher Ionensturm.`];
    await this.deps.crewEnhancement.enhanceSpacecraft(ship.id, CrewEnhancementEvent.ION_STORM_FLIGHT, manager);
    this.deactivateDrive(ship, info);
    const modules = (await this.modulesByShip(manager, [ship.id])).get(ship.id) ?? [];
    await this.damageSpacecraft(manager, ship, modules, intensity, ENTRY_DAMAGE_PERCENTAGE, info, transaction);
    messages.push(...info);
    await this.deps.messaging.sendSystem(
      ship.userId,
      'Ionensturm',
      `${ship.name}: ${info.join('\n')}`,
      undefined,
      MessageFolder.SHIP,
      isSpacecraftDestroyed(ship) ? undefined : { kind: MessageTargetKind.SPACECRAFT, id: ship.id },
      false,
      transaction,
    );
  }

  private deactivateShields(ship: Spacecraft, info: string[]): void {
    const shields = this.systems(ship).SHIELDS;
    if (shields?.active) {
      shields.active = false;
      info.push('Die Schilde sind ausgefallen');
    }
  }

  /** STU `deactivateDrive`: the hyperdrive, or the impulse drive without one. */
  private deactivateDrive(ship: Spacecraft, info: string[]): void {
    const systems = this.systems(ship);
    const key = systems.WARPDRIVE ? 'WARPDRIVE' : 'SUBLIGHT_DRIVE';
    const drive = systems[key];
    if (!drive) return;
    drive.active = false;
    const seconds = this.deps.random.skewed(0, 2 * DRIVE_DEACTIVATION_MEAN_SECONDS, 10 * 60, 2);
    drive.cooldown = this.now() + seconds * 1000;
    info.push(`Der ${key === 'WARPDRIVE' ? 'Hyperantrieb' : 'Impulsantrieb'} ist ausgefallen und kann vorerst nicht mehr aktiviert werden`);
  }

  private async damageSpacecraft(
    manager: EntityManager,
    ship: Spacecraft,
    modules: SpacecraftModule[],
    intensity: number,
    percentage: number,
    info: string[],
    transaction?: TransactionalNotifications,
  ): Promise<void> {
    const netDamage = Math.ceil((this.deps.random.normal(1, percentage) * ship.hullMax * intensity) / 10000);
    const shields = this.systems(ship).SHIELDS ? this.moduleLevel(modules, 'SHIELDS') ?? 1 : 0;
    const { destroyed } = this.damage.apply(ship, {
      netDamage,
      isCrit: this.deps.random.integer(0, 20) === 0,
      hullDamageFactor: this.hullDamageFactor(modules),
      shieldDamageFactor: 100 - shields * 10,
      targetSystems: ION_STORM_TARGET_SYSTEMS,
    }, info);
    if (!destroyed) {
      await this.persist(manager, ship);
      return;
    }
    await this.deps.destruction.destroyInManager(manager, ship.id, 'ANOMALY', transaction);
    ship.status = SpacecraftStatus.DESTROYED;
  }

  /** STU `getHullDamageFactor`: 8 % less per hull module level, 16 % with storm reduction. */
  private hullDamageFactor(modules: SpacecraftModule[]): number {
    const hull = modules
      .filter((module) => module.category === 'HULL')
      .sort((left, right) => right.level - left.level)[0];
    if (!hull) return 100;
    const perLevel = this.deps.hasIonStormReduction(hull.moduleType) ? 16 : 8;
    return Math.max(0, 100 - hull.level * perLevel);
  }

  private moduleLevel(modules: SpacecraftModule[], category: string): number | null {
    const levels = modules.filter((module) => module.category === category && module.level > 0).map((module) => module.level);
    return levels.length ? Math.max(...levels) : null;
  }

  private async persist(manager: EntityManager, ship: Spacecraft): Promise<void> {
    await manager.getRepository(Spacecraft).update(ship.id, {
      hull: ship.hull,
      shields: ship.shields,
      runtimeSystems: this.systems(ship),
    });
  }

  private async modulesByShip(manager: EntityManager, shipIds: number[]): Promise<Map<number, SpacecraftModule[]>> {
    const byShip = new Map<number, SpacecraftModule[]>();
    for (const module of await manager.getRepository(SpacecraftModule).find({ where: { spacecraftId: In(shipIds) } })) {
      byShip.set(module.spacecraftId, [...(byShip.get(module.spacecraftId) ?? []), module]);
    }
    return byShip;
  }

  private async sectors(manager: EntityManager, locationIds: number[]): Promise<Map<number, string>> {
    const locations = await manager.getRepository(SpaceLocation).find({
      where: { id: In([...new Set(locationIds)]) },
      relations: ['galaxyField', 'systemField'],
    });
    return new Map(locations.map((location) => [
      location.id,
      location.galaxyField
        ? `${location.galaxyField.cx}|${location.galaxyField.cy}`
        : location.systemField ? `${location.systemField.sx}|${location.systemField.sy}` : '?',
    ]));
  }

  private systems(ship: Spacecraft): Record<string, SystemState> {
    return ship.runtimeSystems as Record<string, SystemState>;
  }
}
