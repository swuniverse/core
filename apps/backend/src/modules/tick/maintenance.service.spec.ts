import { ConfigService } from '@nestjs/config';
import { GameTickStatus, GameTickType } from './entities/game-tick-state.entity';
import {
  MaintenanceHandler,
  MaintenanceService,
  getCalendarDateNumber,
  getHourInTimezone,
  validateGameTimezone,
} from './maintenance.service';

describe('MaintenanceService', () => {
  const createService = (
    handlers: MaintenanceHandler[],
    existing: Record<string, unknown> | null = null,
    timezone?: string,
  ) => {
    const repository = {
      findOne: jest.fn(async () => existing),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => value),
    };
    const service = new MaintenanceService(
      repository as any,
      new ConfigService(
        timezone === undefined ? {} : { GAME_TIMEZONE: timezone },
      ),
      handlers,
    );
    return { service, repository };
  };

  it('runs registered handlers sequentially in registration order', async () => {
    const order: string[] = [];
    const handlers: MaintenanceHandler[] = [
      { name: 'first', run: async () => void order.push('first') },
      { name: 'second', run: async () => void order.push('second') },
    ];
    const { service } = createService(handlers, null, 'Europe/Berlin');

    await service.run(new Date('2026-07-03T01:00:00.000Z'));

    expect(order).toEqual(['first', 'second']);
  });

  it('continues after handler failures and records all errors', async () => {
    const second = jest.fn(async () => 'done');
    const { service, repository } = createService([
      {
        name: 'broken',
        run: async () => {
          throw new Error('failure');
        },
      },
      { name: 'second', run: second },
    ]);

    const result = await service.run(new Date('2026-07-03T03:00:00.000Z'));

    expect(second).toHaveBeenCalledTimes(1);
    expect(result.status).toBe(GameTickStatus.FAILED);
    expect(repository.save).toHaveBeenLastCalledWith(
      expect.objectContaining({
        tickType: GameTickType.MAINTENANCE,
        status: GameTickStatus.FAILED,
        error: expect.stringContaining('broken: Error: failure'),
      }),
    );
  });

  it('notifies the configured mail service for a scheduled maintenance failure', async () => {
    const { service } = createService([{ name: 'broken', run: async () => { throw new Error('maintenance failed'); } }]);
    const notify = jest.fn(async () => undefined);
    Object.assign(service, { failureMail: { notify } });
    await service.handleScheduledMaintenance();
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ status: GameTickStatus.FAILED, error: expect.stringContaining('maintenance failed') }));
  });

  it('does not repeat a completed maintenance run on the same calendar day', async () => {
    const handler = { name: 'once', run: jest.fn(async () => undefined) };
    const existing = { status: GameTickStatus.COMPLETED };
    const { service, repository } = createService(
      [handler],
      existing,
      'Europe/Berlin',
    );

    const result = await service.run(new Date('2026-07-03T22:30:00.000Z'));

    expect(repository.findOne).toHaveBeenCalledWith({
      where: {
        tickType: GameTickType.MAINTENANCE,
        tickNumber: 20260704,
      },
    });
    expect(result).toBe(existing);
    expect(handler.run).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('mails database failures that prevent maintenance from being recorded', async () => {
    const { service, repository } = createService([]);
    const failure = new Error('maintenance database unavailable');
    repository.findOne.mockRejectedValueOnce(failure);
    const notify = jest.fn(async () => undefined);
    Object.assign(service, { failureMail: { notify } });
    await expect(service.run()).rejects.toBe(failure);
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ tickType: GameTickType.MAINTENANCE, status: GameTickStatus.FAILED, error: expect.stringContaining(failure.message) }));
  });
});

describe('game timezone', () => {
  it.each([
    ['2026-01-14T23:00:00.000Z', 20260115],
    ['2026-01-15T11:00:00.000Z', 20260115],
    ['2026-07-14T22:00:00.000Z', 20260715],
    ['2026-07-15T10:00:00.000Z', 20260715],
  ])('uses Berlin calendar dates for %s', (iso, expected) => {
    expect(getCalendarDateNumber(new Date(iso), 'Europe/Berlin')).toBe(expected);
  });

  it.each([
    ['2026-01-14T23:00:00.000Z', 0],
    ['2026-01-15T11:00:00.000Z', 12],
    ['2026-07-14T22:00:00.000Z', 0],
    ['2026-07-15T10:00:00.000Z', 12],
  ])('uses Berlin hour %s for %s', (iso, expected) => {
    expect(getHourInTimezone(new Date(iso), 'Europe/Berlin')).toBe(expected);
  });

  it.each([
    ['2026-01-15T11:00:00.000Z', 12],
    ['2026-07-15T10:00:00.000Z', 12],
  ])('defaults to the Berlin hour for %s', (iso, expected) => {
    expect(getHourInTimezone(new Date(iso))).toBe(expected);
  });

  it('defaults calendar dates to Europe/Berlin', () => {
    expect(getCalendarDateNumber(new Date('2026-07-14T22:00:00.000Z'))).toBe(
      20260715,
    );
  });

  it('rejects invalid configured timezones with a clear error', () => {
    expect(() => validateGameTimezone('Invalid/Moonbase')).toThrow(
      'Invalid GAME_TIMEZONE "Invalid/Moonbase"',
    );
  });
});
