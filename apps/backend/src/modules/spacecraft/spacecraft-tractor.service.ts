import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { MessagingService } from '../messaging/messaging.service';
import { Spacecraft, SpacecraftStatus } from './entities/spacecraft.entity';
import { SpacecraftRuntimeStateService } from './spacecraft-runtime-state.service';

const TRACTOR_ACTIVATION_EPS = 2;

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
      if (!target || target.userId !== userId) {
        throw new BadRequestException('Nur eigene Schiffe können erfasst werden');
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
      relations: ['modules'],
      lock: { mode: 'pessimistic_write' },
    });
  }
}
