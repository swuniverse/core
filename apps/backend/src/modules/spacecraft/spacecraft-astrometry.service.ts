import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { SpacecraftAstrometryJobDto } from '@swuniverse/shared';
import { ExplorationService } from '../starmap/exploration.service';
import { resolveSpacecraftLocation } from './spacecraft-field';
import { SpacecraftCrewService } from './spacecraft-crew.service';
import {
  Spacecraft,
  SpacecraftStatus,
} from './entities/spacecraft.entity';
import {
  SpacecraftAstrometryJob,
  SpacecraftAstrometryJobStatus,
} from './entities/spacecraft-astrometry-job.entity';
import { assertSpacecraftNotInStandby } from './spacecraft-mode.util';
import { SpacecraftRuntimeStateService } from './spacecraft-runtime-state.service';

export const ASTROMETRY_ENERGY_COST = 10;

@Injectable()
export class SpacecraftAstrometryService {
  constructor(
    @InjectRepository(Spacecraft)
    private readonly shipRepo: Repository<Spacecraft>,
    @InjectRepository(SpacecraftAstrometryJob)
    private readonly jobRepo: Repository<SpacecraftAstrometryJob>,
    private readonly spacecraftCrewService: SpacecraftCrewService,
    private readonly runtimeState: SpacecraftRuntimeStateService,
    private readonly explorationService: ExplorationService,
  ) {}

  async start(shipId: number, userId: number) {
    const ship = await this.shipRepo.findOne({
      where: { id: shipId, userId },
      relations: ['location', 'location.systemField', 'modules'],
    });
    if (!ship) throw new NotFoundException('Spacecraft not found');

    const location = resolveSpacecraftLocation(ship);
    assertSpacecraftNotInStandby(ship, 'der Astrometrie');
    if (ship.status === SpacecraftStatus.DESTROYED)
      throw new BadRequestException('Zerstörte Schiffe können keine Astrometrie starten');
    if (ship.status === SpacecraftStatus.IN_FLIGHT)
      throw new BadRequestException('Schiff befindet sich im Flug');
    if (ship.status === SpacecraftStatus.IN_COMBAT)
      throw new BadRequestException('Astrometrie ist während eines Kampfes nicht möglich');
    if (ship.status !== SpacecraftStatus.IDLE)
      throw new BadRequestException('Schiff muss für Astrometrie bereit sein');
    if (location?.scope !== 'SYSTEM')
      throw new BadRequestException('Schiff befindet sich in keinem Sternensystem');
    if (!(await this.spacecraftCrewService.hasEnoughCrew(ship)))
      throw new BadRequestException('Nicht genug Crew für Astrometrie');

    const systems = this.runtimeState.initialize(ship);
    const sensors = systems.LONG_RANGE_SENSORS;
    if (!sensors?.active)
      throw new BadRequestException('Langstreckensensoren sind nicht aktiv');
    if (sensors.integrity <= 0)
      throw new BadRequestException('Langstreckensensoren sind zerstört');
    if (ship.energy < ASTROMETRY_ENERGY_COST)
      throw new BadRequestException('Nicht genug EPS für Astrometrie');

    const [active, explored] = await Promise.all([
      this.jobRepo.findOne({
        where: {
          spacecraftId: ship.id,
          status: SpacecraftAstrometryJobStatus.ACTIVE,
        },
      }),
      this.explorationService.isSystemExplored(userId, location.systemId),
    ]);
    if (active)
      throw new BadRequestException('Für dieses Schiff läuft bereits ein Astrometrieauftrag');
    if (explored)
      throw new BadRequestException('Dieses Sternensystem wurde bereits entdeckt');

    ship.energy -= ASTROMETRY_ENERGY_COST;
    ship.runtimeSystems = systems;
    await this.shipRepo.save(ship);

    const startedAt = new Date();
    const job = await this.jobRepo.save(
      this.jobRepo.create({
        userId,
        spacecraftId: ship.id,
        starSystemId: location.systemId,
        status: SpacecraftAstrometryJobStatus.ACTIVE,
        startedAt,
        completesAt: startedAt,
        completedAt: null,
        abortReason: null,
      }),
    );
    return this.toDto(job);
  }

  async assertNoActiveJob(spacecraftId: number): Promise<void> {
    const active = await this.jobRepo.findOne({
      where: { spacecraftId, status: SpacecraftAstrometryJobStatus.ACTIVE },
    });
    if (active)
      throw new BadRequestException(
        'Navigation ist während eines Astrometrieauftrags nicht möglich',
      );
  }

  async getStatus(
    shipId: number,
    userId: number,
  ): Promise<SpacecraftAstrometryJobDto | null> {
    const job = await this.jobRepo.findOne({
      where: { spacecraftId: shipId, userId },
      order: { id: 'DESC' },
    });
    return job ? this.toDto(job) : null;
  }

  async processTick(ship: Spacecraft): Promise<void> {
    const job = await this.jobRepo.findOne({
      where: {
        spacecraftId: ship.id,
        status: SpacecraftAstrometryJobStatus.ACTIVE,
      },
    });
    if (!job) return;

    if (job.completesAt > new Date()) return;

    const abortReason = await this.getAbortReason(ship, job);
    if (abortReason) {
      job.status = SpacecraftAstrometryJobStatus.ABORTED;
      job.abortReason = abortReason;
      job.completedAt = new Date();
      await this.jobRepo.save(job);
      return;
    }

    await this.explorationService.discoverSystem({
      userId: job.userId,
      starSystemId: job.starSystemId,
      source: 'ASTROMETRY',
    });
    job.status = SpacecraftAstrometryJobStatus.COMPLETED;
    job.completedAt = new Date();
    await this.jobRepo.save(job);
  }

  private toDto(job: SpacecraftAstrometryJob): SpacecraftAstrometryJobDto {
    return {
      id: job.id,
      spacecraftId: job.spacecraftId,
      starSystemId: job.starSystemId,
      status: job.status,
      startedAt: job.startedAt.toISOString(),
      completesAt: job.completesAt.toISOString(),
      completedAt: job.completedAt?.toISOString() ?? null,
      abortReason: job.abortReason,
    };
  }

  private async getAbortReason(
    ship: Spacecraft,
    job: SpacecraftAstrometryJob,
  ): Promise<string | null> {
    if (ship.userId !== job.userId) return 'OWNER_CHANGED';
    if (ship.status === SpacecraftStatus.DESTROYED) return 'DESTROYED';
    if (ship.operatingMode === 'STANDBY') return 'STANDBY';
    if (ship.status !== SpacecraftStatus.IDLE) return 'SHIP_NOT_IDLE';
    const location = resolveSpacecraftLocation(ship);
    if (location?.scope !== 'SYSTEM') return 'LEFT_SYSTEM';
    if (location.systemId !== job.starSystemId) return 'SYSTEM_CHANGED';
    if (!(await this.spacecraftCrewService.hasEnoughCrew(ship))) return 'CREW';
    const sensors = this.runtimeState.initialize(ship).LONG_RANGE_SENSORS;
    if (!sensors?.active || sensors.integrity <= 0) return 'SENSORS';
    return null;
  }
}
