import { CallHandler, ExecutionContext, Logger } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { LastActivityInterceptor } from './last-activity.interceptor';
import { LastActivityService } from './last-activity.service';

const MINUTE = 60_000;

/**
 * In-memory stand-in for the users table. It honours the documented contract
 * of the conditional update: `query(sql, [userId, now, threshold])` writes
 * `now` only when the stored value is NULL or not newer than `threshold`.
 */
function fakeDatabase(options: { failing?: boolean } = {}) {
  const lastActiveAt = new Map<number, Date>();
  const dataSource = {
    query: jest.fn(async (_sql: string, params: [number, Date, Date]) => {
      if (options.failing) throw new Error('db down');
      const [userId, now, threshold] = params;
      const current = lastActiveAt.get(userId);
      if (!current || current <= threshold) lastActiveAt.set(userId, now);
    }),
  };
  return { dataSource, lastActiveAt };
}

describe('LastActivityService', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-07T10:00:00Z'));
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  function setup(options: { failing?: boolean } = {}) {
    const db = fakeDatabase(options);
    const logger = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    const service = new LastActivityService(db.dataSource as never);
    return { ...db, service, logger };
  }

  it('sets the timestamp on the first request', async () => {
    const { service, lastActiveAt } = setup();

    await service.record(7);

    expect(lastActiveAt.get(7)).toEqual(new Date('2026-10-07T10:00:00Z'));
  });

  it('does not update again within five minutes', async () => {
    const { service, lastActiveAt } = setup();
    await service.record(7);

    jest.setSystemTime(new Date('2026-10-07T10:04:59Z'));
    await service.record(7);

    expect(lastActiveAt.get(7)).toEqual(new Date('2026-10-07T10:00:00Z'));
  });

  it('updates again after five minutes', async () => {
    const { service, lastActiveAt } = setup();
    await service.record(7);

    jest.setSystemTime(new Date(Date.now() + 5 * MINUTE));
    await service.record(7);

    expect(lastActiveAt.get(7)).toEqual(new Date('2026-10-07T10:05:00Z'));
  });

  it('tracks players independently', async () => {
    const { service, lastActiveAt } = setup();
    await service.record(1);
    jest.setSystemTime(new Date('2026-10-07T10:01:00Z'));
    await service.record(2);

    expect(lastActiveAt.get(2)).toEqual(new Date('2026-10-07T10:01:00Z'));
  });

  it('logs and swallows a failing update', async () => {
    const { service, logger } = setup({ failing: true });

    await expect(service.record(7)).resolves.toBeUndefined();

    expect(logger).toHaveBeenCalledTimes(1);
  });
});

describe('LastActivityInterceptor', () => {
  function run(user: unknown, service: Partial<LastActivityService>) {
    const context = {
      getType: () => 'http',
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as unknown as ExecutionContext;
    const next: CallHandler = { handle: () => of('response') };
    return lastValueFrom(
      new LastActivityInterceptor(service as LastActivityService).intercept(context, next),
    );
  }

  it('records activity for authenticated requests and passes the response through', async () => {
    const record = jest.fn().mockResolvedValue(undefined);

    await expect(run({ sub: 42 }, { record })).resolves.toBe('response');

    expect(record).toHaveBeenCalledWith(42);
  });

  it('ignores unauthenticated requests', async () => {
    const record = jest.fn();

    await expect(run(undefined, { record })).resolves.toBe('response');

    expect(record).not.toHaveBeenCalled();
  });

  it('lets the request succeed when recording throws or rejects', async () => {
    const throwing = jest.fn(() => {
      throw new Error('sync boom');
    });
    await expect(run({ sub: 1 }, { record: throwing })).resolves.toBe('response');

    const rejecting = jest.fn().mockRejectedValue(new Error('async boom'));
    await expect(run({ sub: 1 }, { record: rejecting })).resolves.toBe('response');
  });
});
