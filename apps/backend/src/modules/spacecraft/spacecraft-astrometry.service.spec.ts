import { BadRequestException } from '@nestjs/common';
import {
  SpacecraftAstrometryJobStatus,
} from './entities/spacecraft-astrometry-job.entity';
import { SpacecraftAstrometryService } from './spacecraft-astrometry.service';

const shipInSystem = (overrides: Record<string, unknown> = {}) => ({
  id: 7,
  userId: 11,
  status: 'IDLE',
  operatingMode: 'NORMAL',
  energy: 20,
  location: {
    kind: 'SYSTEM_FIELD',
    systemField: { starSystemId: 42, sx: 3, sy: 4 },
  },
  ...overrides,
});

const activeSensors = () => ({
  LONG_RANGE_SENSORS: { active: true, integrity: 100, cooldown: 0 },
});

describe('SpacecraftAstrometryService', () => {
  it('charges 10 EPS when an operational ship starts astrometry and discovers its bound system on the next tick', async () => {
    const shipRepo = {
      findOne: jest.fn(async () => shipInSystem()),
      save: jest.fn(async (ship) => ship),
    };
    const activeJob = {
      id: 5,
      userId: 11,
      spacecraftId: 7,
      starSystemId: 42,
      status: SpacecraftAstrometryJobStatus.ACTIVE,
      startedAt: new Date('2026-10-16T10:00:00.000Z'),
      completesAt: new Date('2026-10-16T10:00:00.000Z'),
      completedAt: null,
      abortReason: null,
    };
    const jobRepo = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(activeJob),
      create: jest.fn((job) => job),
      save: jest.fn(async (job) => ({ id: 5, ...job })),
    };
    const crew = { hasEnoughCrew: jest.fn(async () => true) };
    const runtimeState = { initialize: jest.fn(activeSensors) };
    const exploration = {
      isSystemExplored: jest.fn(async () => false),
      discoverSystem: jest.fn(async () => undefined),
    };
    const service = new SpacecraftAstrometryService(
      shipRepo as never,
      jobRepo as never,
      crew as never,
      runtimeState as never,
      exploration as never,
    );

    const started = await service.start(7, 11);

    expect(started).toMatchObject({
      id: 5,
      spacecraftId: 7,
      starSystemId: 42,
      status: 'ACTIVE',
    });
    expect(shipRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ energy: 10 }),
    );

    await service.processTick(shipInSystem({ energy: 10 }) as never);

    expect(exploration.discoverSystem).toHaveBeenCalledWith({
      userId: 11,
      starSystemId: 42,
      source: 'ASTROMETRY',
    });
    expect(jobRepo.save).toHaveBeenLastCalledWith(
      expect.objectContaining({
        status: SpacecraftAstrometryJobStatus.COMPLETED,
      }),
    );
  });

  it('rejects a second active astrometry job before charging the ship again', async () => {
    const shipRepo = {
      findOne: jest.fn(async () => shipInSystem()),
      save: jest.fn(async (ship) => ship),
    };
    const jobRepo = {
      findOne: jest.fn(async () => ({
        id: 5,
        status: SpacecraftAstrometryJobStatus.ACTIVE,
      })),
      create: jest.fn(),
      save: jest.fn(),
    };
    const service = new SpacecraftAstrometryService(
      shipRepo as never,
      jobRepo as never,
      { hasEnoughCrew: jest.fn(async () => true) } as never,
      { initialize: jest.fn(activeSensors) } as never,
      { isSystemExplored: jest.fn(async () => false) } as never,
    );

    await expect(service.start(7, 11)).rejects.toEqual(
      new BadRequestException('Für dieses Schiff läuft bereits ein Astrometrieauftrag'),
    );
    expect(shipRepo.save).not.toHaveBeenCalled();
  });

  it('leaves an active job untouched until its scheduled completion time', async () => {
    const jobRepo = {
      findOne: jest.fn(async () => ({
        id: 5,
        userId: 11,
        spacecraftId: 7,
        starSystemId: 42,
        status: SpacecraftAstrometryJobStatus.ACTIVE,
        completesAt: new Date('2999-01-01T00:00:00.000Z'),
      })),
      save: jest.fn(),
    };
    const exploration = { discoverSystem: jest.fn() };
    const service = new SpacecraftAstrometryService(
      {} as never,
      jobRepo as never,
      { hasEnoughCrew: jest.fn(async () => true) } as never,
      { initialize: jest.fn(activeSensors) } as never,
      exploration as never,
    );

    await service.processTick(shipInSystem() as never);

    expect(exploration.discoverSystem).not.toHaveBeenCalled();
    expect(jobRepo.save).not.toHaveBeenCalled();
  });

  it('aborts without discovery when resource processing leaves long-range sensors inactive', async () => {
    const job = {
      id: 5,
      userId: 11,
      spacecraftId: 7,
      starSystemId: 42,
      status: SpacecraftAstrometryJobStatus.ACTIVE,
      completesAt: new Date('2026-10-16T10:00:00.000Z'),
      completedAt: null,
      abortReason: null,
    };
    const jobRepo = {
      findOne: jest.fn(async () => job),
      save: jest.fn(async (saved) => saved),
    };
    const exploration = { discoverSystem: jest.fn() };
    const service = new SpacecraftAstrometryService(
      {} as never,
      jobRepo as never,
      { hasEnoughCrew: jest.fn(async () => true) } as never,
      {
        initialize: jest.fn(() => ({
          LONG_RANGE_SENSORS: { active: false, integrity: 100, cooldown: 0 },
        })),
      } as never,
      exploration as never,
    );

    await service.processTick(shipInSystem() as never);

    expect(exploration.discoverSystem).not.toHaveBeenCalled();
    expect(jobRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: SpacecraftAstrometryJobStatus.ABORTED,
        abortReason: 'SENSORS',
      }),
    );
  });

  it('aborts without refund when the ship leaves the bound system', async () => {
    const job = {
      id: 5,
      userId: 11,
      spacecraftId: 7,
      starSystemId: 42,
      status: SpacecraftAstrometryJobStatus.ACTIVE,
      completesAt: new Date('2026-10-16T10:00:00.000Z'),
      completedAt: null,
      abortReason: null,
    };
    const jobRepo = {
      findOne: jest.fn(async () => job),
      save: jest.fn(async (saved) => saved),
    };
    const exploration = { discoverSystem: jest.fn() };
    const service = new SpacecraftAstrometryService(
      {} as never,
      jobRepo as never,
      { hasEnoughCrew: jest.fn(async () => true) } as never,
      { initialize: jest.fn(activeSensors) } as never,
      exploration as never,
    );

    await service.processTick(
      shipInSystem({ location: { kind: 'GALAXY_FIELD' }, energy: 10 }) as never,
    );

    expect(exploration.discoverSystem).not.toHaveBeenCalled();
    expect(jobRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: SpacecraftAstrometryJobStatus.ABORTED,
        abortReason: 'LEFT_SYSTEM',
      }),
    );
  });
});
