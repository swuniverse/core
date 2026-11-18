import { In, type EntityManager } from 'typeorm';
import type { AnomalyHandler } from './anomaly-registry';
import { MessagingService, type TransactionalNotifications } from '../messaging/messaging.service';
import { MessageFolder } from '../messaging/message-folder';
import { Spacecraft, SpacecraftKind, SpacecraftStatus } from '../spacecraft/entities/spacecraft.entity';
import { User } from '../auth/user.entity';
import { Anomaly } from './entities/anomaly.entity';
import { AnomalyType } from './entities/anomaly-type.entity';
import { SpaceLocation } from '../starmap/entities/space-location.entity';
import { FieldEffect } from '@swuniverse/shared';
import { recordSpacecraftShieldHit } from '../spacecraft/spacecraft-damage';

export interface EllipseRandom {
  integer(min: number, max: number): number;
}

export const SUBSPACE_ELLIPSE_THRESHOLD = 33_333_333;

type SystemState = { active?: boolean; integrity?: number; current?: number };

export class SubspaceEllipseHandler implements AnomalyHandler {
  readonly key = 'SUBSPACE_ELLIPSE';
  readonly name = 'Subraumellipse';

  constructor(
    private readonly messaging: MessagingService,
    private readonly random: EllipseRandom,
  ) {}

  async checkForCreation(manager: EntityManager, transaction?: TransactionalNotifications): Promise<void> {
    const ships = await manager.getRepository(Spacecraft).find({
      relations: ['user', 'shipClass'],
      order: { locationId: 'ASC', id: 'ASC' },
    });
    const byLocation = new Map<number, Spacecraft[]>();
    for (const ship of ships) {
      const group = byLocation.get(ship.locationId) ?? [];
      group.push(ship);
      byLocation.set(ship.locationId, group);
    }
    for (const [locationId, group] of byLocation) {
      const eligible = group.filter((ship) => this.countsForScore(ship));
      if (!eligible.length) continue;
      if (await manager.getRepository(Anomaly).exists({ where: { locationId, type: { key: this.key } } })) continue;
      const location = await this.loadLocation(manager, locationId);
      const field = location.galaxyField ?? location.systemField;
      if ([...(field?.effects ?? []), ...(field?.fieldType?.effects ?? [])].includes(FieldEffect.NO_ANOMALIES)) continue;
      const score = this.score(eligible);
      if (score <= SUBSPACE_ELLIPSE_THRESHOLD) continue;
      const chance = Math.min(100, 5 + Math.ceil((score - SUBSPACE_ELLIPSE_THRESHOLD) / 1_000_000));
      if (this.random.integer(1, 100) > chance) continue;
      let type = await manager.getRepository(AnomalyType).findOneBy({ key: this.key });
      type ??= await manager.getRepository(AnomalyType).save({ key: this.key });
      await manager.getRepository(Anomaly).save({ typeId: type.id, locationId, remainingTicks: 1 });
      const owners = new Set(group.filter((ship) => !ship.user.isNpc).map((ship) => ship.userId));
      for (const ownerId of owners) {
        await this.messaging.sendSystem(
          ownerId,
          'Subraumellipse',
          `In Sektor ${this.sector(location)} ist aufgrund des immensen Energiepotentials eine Subraumellipse entstanden!`,
          undefined, MessageFolder.SYSTEM, undefined, false, transaction,
        );
      }
    }
  }

  async handleTick(anomaly: Anomaly, manager: EntityManager, transaction?: TransactionalNotifications): Promise<void> {
    if (anomaly.locationId == null) return;
    const repository = manager.getRepository(Spacecraft);
    const ships = await repository.find({
      where: { locationId: anomaly.locationId },
      order: { id: 'ASC' },
      lock: { mode: 'pessimistic_write' },
    });
    if (!ships.length) return;
    const vacationing = new Set((await manager.getRepository(User).find({
      select: { id: true },
      where: { id: In([...new Set(ships.map((ship) => ship.userId))]), vacationMode: true },
    })).map((user) => user.id));
    // Per owner and folder, as STU distributes ship and station reports separately.
    const reports = new Map<string, { ownerId: number; folder: MessageFolder; lines: string[] }>();
    for (const ship of ships) {
      if (vacationing.has(ship.userId) || ship.status === SpacecraftStatus.DESTROYED) continue;
      const systems = ship.runtimeSystems as Record<string, SystemState>;
      const shields = systems.SHIELDS;
      if (!shields) continue;
      const integrity = shields.integrity ?? 100;
      if (ship.shields === 0 && integrity <= 0) continue;
      const lines: string[] = [];
      recordSpacecraftShieldHit(ship);
      shields.active = false;
      if (ship.shields > 0) {
        ship.shields = 0;
        shields.current = 0;
        lines.push('- die Schilde wurden entladen');
      }
      if (integrity > 0) {
        const damage = this.random.integer(1, 50);
        shields.integrity = Math.max(0, integrity - damage);
        lines.push(`- der Schildemitter wurde um ${damage}% beschädigt`);
      }
      await repository.update(ship.id, { shields: ship.shields, runtimeSystems: systems });
      const folder = ship.kind === SpacecraftKind.STATION ? MessageFolder.STATION : MessageFolder.SHIP;
      const key = `${ship.userId}:${folder}`;
      const report = reports.get(key) ?? { ownerId: ship.userId, folder, lines: [] };
      report.lines.push(ship.name, ...lines);
      reports.set(key, report);
    }
    if (!reports.size) return;
    const subject = `Subraumellipse in Sektor ${this.sector(await this.loadLocation(manager, anomaly.locationId))}`;
    for (const report of reports.values()) {
      await this.messaging.sendSystem(report.ownerId, subject, report.lines.join('\n'), undefined, report.folder, undefined, false, transaction);
    }
  }

  async handleIncomingSpacecraft(): Promise<void> {
    // As in STU, an ellipse only acts during the main tick, not on entry.
  }

  async onDisappear(): Promise<void> {
    // No additional state belongs to an ellipse after expiry.
  }

  private countsForScore(ship: Spacecraft): boolean {
    if (ship.user.isNpc || ship.status === SpacecraftStatus.UNDER_CONSTRUCTION || ship.status === SpacecraftStatus.DESTROYED) return false;
    return !(ship.runtimeSystems as Record<string, SystemState>).WARPDRIVE?.active;
  }

  /** STU score: ship mass + station mass / 10 + total crew × total active systems × 100. */
  private score(ships: Spacecraft[]): number {
    let shipMass = 0;
    let stationMass = 0;
    let crew = 0;
    let activeSystems = 0;
    for (const ship of ships) {
      const mass = ship.shipClass.anomalyMass;
      if (mass == null) {
        throw new Error(`Missing authoritative anomalyMass for in-use ship class ${ship.shipClass.key} (spacecraft ${ship.id})`);
      }
      if (ship.kind === SpacecraftKind.STATION) stationMass += mass;
      else shipMass += mass;
      crew += ship.crew;
      activeSystems += Object.values(ship.runtimeSystems as Record<string, SystemState>).filter((state) => state?.active).length;
    }
    return shipMass + Math.floor(stationMass / 10) + crew * activeSystems * 100;
  }

  private loadLocation(manager: EntityManager, locationId: number): Promise<SpaceLocation> {
    return manager.getRepository(SpaceLocation).findOneOrFail({
      where: { id: locationId },
      relations: ['galaxyField', 'galaxyField.fieldType', 'systemField', 'systemField.fieldType'],
    });
  }

  private sector(location: SpaceLocation): string {
    if (location.galaxyField) return `${location.galaxyField.cx}|${location.galaxyField.cy}`;
    if (location.systemField) return `${location.systemField.sx}|${location.systemField.sy}`;
    return '?';
  }
}
