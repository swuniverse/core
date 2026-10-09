import { DataSource } from 'typeorm';
import {
  connectIntegrationDatabase,
  createUser,
  resetDatabase,
} from '../../testing/integration/database';
import { User } from './user.entity';
import { LastActivityService } from './last-activity.service';

describe('LastActivityService (postgres)', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = await connectIntegrationDatabase();
  });
  afterAll(() => dataSource.destroy());
  beforeEach(() => resetDatabase(dataSource));

  it('throttles concurrent requests to a single update per window', async () => {
    const user = await createUser(dataSource, { username: 'active' });
    const service = new LastActivityService(dataSource);
    const spy = jest.spyOn(dataSource, 'query');

    await Promise.all(
      Array.from({ length: 10 }, () => service.record(user.id)),
    );

    // Postgres UPDATE via DataSource.query resolves to [rows, affectedCount].
    const results = await Promise.all(spy.mock.results.map((r) => r.value));
    const written = results.reduce((sum, r) => sum + r[1], 0);
    expect(written).toBe(1);
    const stored = await dataSource
      .getRepository(User)
      .findOneByOrFail({ id: user.id });
    expect(stored.lastActiveAt).toBeInstanceOf(Date);
  });

  it('writes again once the stored timestamp is older than five minutes', async () => {
    const user = await createUser(dataSource, { username: 'stale' });
    await dataSource.query(
      `UPDATE "users" SET "lastActiveAt" = now() - interval '6 minutes' WHERE id = $1`,
      [user.id],
    );
    const before = await dataSource
      .getRepository(User)
      .findOneByOrFail({ id: user.id });

    await new LastActivityService(dataSource).record(user.id);

    const after = await dataSource
      .getRepository(User)
      .findOneByOrFail({ id: user.id });
    expect(after.lastActiveAt!.getTime()).toBeGreaterThan(
      before.lastActiveAt!.getTime(),
    );
  });
});
