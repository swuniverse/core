import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { isVacationEffective } from '@swuniverse/shared';
import { DataSource, EntityManager } from 'typeorm';
import { MessagingService } from '../messaging/messaging.service';
import { Spacecraft, SpacecraftKind, SpacecraftStatus } from './entities/spacecraft.entity';
import { SpacecraftRuntimeStateService } from './spacecraft-runtime-state.service';

const TRACTOR_ACTIVATION_EPS = 2;
const TRACTOR_ESCAPE_EPS = 20;

type TractorEscapeOutcome = 'ESCAPED' | 'SHIELD_DAMAGE' | 'HULL_DAMAGE';

@Injectable()
export class SpacecraftTractorService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly runtimeState: SpacecraftRuntimeStateService,
    private readonly messaging: MessagingService,
  ) {}

  activate(sourceId: number, userId: number, targetId: number) {
    return this.dataSource.transaction(async (manager) => {
      const [source, target] = await Promise.all([
        this.lock(manager, sourceId),
        this.lock(manager, targetId),
      ]);
      if (!source || source.userId !== userId) {
        throw new NotFoundException('Spacecraft not found');
      }
      if (!target) throw new BadRequestException('Ziel nicht gefunden');
      // STU `ActivateTractorBeam` only tractors ships; stations (and their trade posts) stay put.
      if (target.kind === SpacecraftKind.STATION) throw new BadRequestException('Das Ziel kann nicht erfasst werden');
      if (target.user?.isNpc) {
        throw new BadRequestException('NPC-Schiffe können nicht erfasst werden');
      }
      if (target.user && isVacationEffective(target.user)) {
        throw new BadRequestException('Der Spieler befindet sich im Urlaubsmodus');
      }
      if (source.id === target.id || source.locationId !== target.locationId) {
        throw new BadRequestException('Das Ziel befindet sich nicht am selben Feld');
      }
      if (
        source.status !== SpacecraftStatus.IDLE ||
        target.status !== SpacecraftStatus.IDLE
      ) {
        throw new BadRequestException('Traktorstrahl im Hyperraumflug nicht möglich');
      }
      const [sourceTractor, targetTractor] = await Promise.all([
        manager.findOneBy(Spacecraft, { tractoredShipId: source.id }),
        manager.findOneBy(Spacecraft, { tractoredShipId: target.id }),
      ]);
      if (sourceTractor) {
        throw new BadRequestException('Das Schiff wird von einem Traktorstrahl gehalten');
      }
      if (source.tractoredShipId || targetTractor || target.tractoredShipId) {
        throw new BadRequestException('Ein beteiligtes Schiff verwendet bereits einen Traktorstrahl');
      }
      const systems = this.runtimeState.initialize(source);
      const tractor = systems.TRACTOR_BEAM;
      if (!tractor) throw new BadRequestException('Kein Traktorstrahl installiert');
      if (tractor.integrity <= 0) throw new BadRequestException('Traktorstrahl zerstört');
      if (tractor.cooldown > 0) throw new BadRequestException(`Cooldown ${tractor.cooldown}`);
      if (systems.SHIELDS?.active) {
        throw new BadRequestException('Die Schilde sind aktiviert');
      }
      const targetSystems = this.runtimeState.initialize(target);
      if (targetSystems.SHIELDS?.active) {
        throw new BadRequestException('Die Schilde des Ziels sind aktiviert');
      }
      if (source.energy < TRACTOR_ACTIVATION_EPS) {
        throw new BadRequestException('Nicht genug EPS für den Traktorstrahl');
      }
      source.energy -= TRACTOR_ACTIVATION_EPS;
      source.tractoredShipId = target.id;
      source.tractoredShip = target;
      tractor.active = true;
      source.runtimeSystems = systems;
      await manager.save(source);
      await this.messaging.sendSystem(
        target.userId,
        'Traktorstrahl',
        `${target.name} wurde vom Traktorstrahl der ${source.name} erfasst.`,
      );
      return source;
    });
  }

  escape(
    targetId: number,
    userId: number,
    roll: (min: number, max: number) => number = randomInt,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const target = await this.lock(manager, targetId);
      if (!target || target.userId !== userId) {
        throw new NotFoundException('Spacecraft not found');
      }
      const source = await manager.findOne(Spacecraft, {
        where: { tractoredShipId: target.id },
        relations: ['modules', 'user'],
        lock: { mode: 'pessimistic_write' },
      });
      if (!source) throw new BadRequestException('Das Schiff wird nicht festgehalten');
      if (target.energy < TRACTOR_ESCAPE_EPS) {
        throw new BadRequestException('Nicht genug Energie für Fluchtversuch (20 benötigt)');
      }

      const targetSystems = this.runtimeState.initialize(target);
      const shields = targetSystems.SHIELDS;
      if (!shields || shields.integrity <= 0) {
        throw new BadRequestException('Deflektorschilde sind nicht funktionsfähig');
      }
      target.energy -= TRACTOR_ESCAPE_EPS;

      let outcome: TractorEscapeOutcome;
      let message: string;
      const chance = roll(1, 100);
      if (chance < 11) {
        outcome = 'ESCAPED';
        message = 'Der Fluchtversuch ist gelungen';
        source.tractoredShipId = null;
        source.tractoredShip = null;
        const sourceSystems = this.runtimeState.initialize(source);
        if (sourceSystems.TRACTOR_BEAM) sourceSystems.TRACTOR_BEAM.active = false;
        source.runtimeSystems = sourceSystems;
        await manager.save(source);
      } else if (chance < 55) {
        outcome = 'SHIELD_DAMAGE';
        const damage = roll(5, 25);
        shields.integrity = Math.max(0, shields.integrity - damage);
        if (shields.integrity === 0) shields.active = false;
        target.runtimeSystems = targetSystems;
        message = `Der Fluchtversuch ist fehlgeschlagen: Schilde ${damage} % beschädigt`;
      } else {
        outcome = 'HULL_DAMAGE';
        const damagePercent = roll(10, 25);
        const damage = Math.ceil(target.hullMax * damagePercent / 100);
        target.hull = Math.max(0, target.hull - damage);
        if (target.hull === 0) target.status = SpacecraftStatus.DESTROYED;
        message = `Der Fluchtversuch ist fehlgeschlagen: Hülle ${damage} beschädigt`;
      }
      await manager.save(target);
      await this.messaging.sendSystem(
        source.userId,
        'Traktorstrahl',
        outcome === 'ESCAPED'
          ? `${target.name} ist dem Traktorstrahl der ${source.name} entkommen.`
          : `Der Fluchtversuch der ${target.name} ist gescheitert.`,
      );
      return { outcome, message, energy: target.energy };
    });
  }

  deactivate(sourceId: number, userId: number) {
    return this.dataSource.transaction(async (manager) => {
      const source = await this.lock(manager, sourceId);
      if (!source || source.userId !== userId) {
        throw new NotFoundException('Spacecraft not found');
      }
      source.tractoredShipId = null;
      source.tractoredShip = null;
      const systems = this.runtimeState.initialize(source);
      if (systems.TRACTOR_BEAM) systems.TRACTOR_BEAM.active = false;
      source.runtimeSystems = systems;
      return manager.save(source);
    });
  }

  private lock(manager: EntityManager, id: number) {
    return manager.findOne(Spacecraft, {
      where: { id },
      relations: ['modules', 'user'],
      lock: { mode: 'pessimistic_write' },
    });
  }
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
