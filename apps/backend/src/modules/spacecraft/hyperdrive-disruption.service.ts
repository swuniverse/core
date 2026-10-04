import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Spacecraft, SpacecraftStatus } from './entities/spacecraft.entity';
import { SpacecraftRuntimeStateService } from './spacecraft-runtime-state.service';
import { GameGateway } from '../websocket/game.gateway';
import { WsEventType } from '@swuniverse/shared';
import { GameEventService } from '../events/game-event.service';
import { GameEventType } from '../events/entities/game-event.entity';
import {
  resolveSpacecraftLocation,
  sameSpacecraftLocation,
} from './spacecraft-field';

export type HyperdriveDisruptionCause =
  'MANUAL_INTERCEPT' | 'INTERDICTION_FIELD';

@Injectable()
export class HyperdriveDisruptionService {
  constructor(
    @InjectRepository(Spacecraft)
    private readonly shipRepo: Repository<Spacecraft>,
    private readonly runtimeState: SpacecraftRuntimeStateService,
    private readonly gameGateway: GameGateway,
    private readonly gameEvents: GameEventService,
  ) {}

  async intercept(interceptor: Spacecraft, targetId: number) {
    const target = await this.shipRepo.findOne({
      where: { id: targetId },
      relations: ['location', 'location.galaxyField', 'location.systemField'],
    });
    if (!target || target.status === SpacecraftStatus.DESTROYED) {
      throw new BadRequestException('Zielschiff nicht gefunden');
    }
    const interceptorLocation = resolveSpacecraftLocation(interceptor);
    if (
      interceptorLocation?.scope !== 'GALAXY' ||
      interceptor.status !== SpacecraftStatus.IDLE
    ) {
      throw new BadRequestException(
        'Abfänger muss auf einem Galaxiefeld stationär sein',
      );
    }
    const interceptorSystems = this.runtimeState.initialize(interceptor);
    const drive = interceptorSystems.WARPDRIVE;
    if (!drive || drive.integrity <= 0) {
      throw new BadRequestException(
        'Hyperantrieb des Abfängers nicht einsatzbereit',
      );
    }
    const targetDrive = this.runtimeState.initialize(target).WARPDRIVE;
    const targetLocation = resolveSpacecraftLocation(target);
    if (
      targetLocation?.scope !== 'GALAXY' ||
      target.status !== SpacecraftStatus.IDLE ||
      !targetDrive?.active
    ) {
      throw new BadRequestException('Ziel befindet sich nicht im Hyperraum');
    }
    if (!sameSpacecraftLocation(interceptor, target)) {
      throw new BadRequestException('Ziel ist nicht auf diesem Feld');
    }
    return this.disrupt(target, { cause: 'MANUAL_INTERCEPT', interceptor });
  }

  async disrupt(
    target: Spacecraft,
    input: { cause: HyperdriveDisruptionCause; interceptor?: Spacecraft },
  ) {
    const field = resolveSpacecraftLocation(target);
    if (!field || field.scope !== 'GALAXY') {
      throw new BadRequestException('Hyperraumfeld nicht verfügbar');
    }

    const targetDrive = this.runtimeState.initialize(target).WARPDRIVE;
    if (targetDrive) targetDrive.active = false;

    const interceptor = input.interceptor;
    if (interceptor) {
      const interceptorDrive =
        this.runtimeState.initialize(interceptor).WARPDRIVE;
      if (interceptorDrive) interceptorDrive.active = false;
      await this.shipRepo.save(interceptor);
    }
    await this.shipRepo.save(target);
    const detail = `${target.name} wurde aus dem Hyperraum gezwungen`;
    await this.gameEvents.recordSpacecraft(
      GameEventType.HYPERSPACE_INTERCEPTED,
      interceptor
        ? `${target.name} wurde von ${interceptor.name} aus dem Hyperraum gezwungen.`
        : detail,
      target,
    );
    if (interceptor) {
      this.gameGateway.emitToUser(
        interceptor.userId,
        WsEventType.SPACECRAFT_EVENT,
        {
          shipId: interceptor.id,
          type: 'HYPERSPACE_INTERCEPTED',
          detail,
        },
      );
    }
    this.gameGateway.emitToUser(target.userId, WsEventType.SPACECRAFT_EVENT, {
      shipId: target.id,
      type: 'HYPERSPACE_FORCED_EXIT',
      detail: `Dein Schiff ${detail}`,
    });
    return {
      intercepted: true,
      targetId: target.id,
      interceptorId: interceptor?.id ?? null,
      cause: input.cause,
      field,
      message: detail,
    };
  }
}
