import { QueryRunner } from 'typeorm';
import { AddPlotPostRequests20261105120000 } from '../migrations/20261105120000-add-plot-post-requests';

describe('AddPlotPostRequests20261105120000', () => {
  const migration = new AddPlotPostRequests20261105120000();
  const query = jest.fn();
  const runner = { query } as unknown as QueryRunner;

  beforeEach(() => query.mockClear());

  it('creates durable requests with status constraints and one pending request per post and plot', async () => {
    await migration.up(runner);
    const sql = query.mock.calls.map(([statement]) => statement).join('\n');

    expect(sql).toContain('CREATE TABLE "plot_post_requests"');
    expect(sql).toContain('"postId" integer NOT NULL');
    expect(sql).toContain('"requesterId" integer NOT NULL');
    expect(sql).toContain('"authorId" integer NOT NULL');
    expect(sql).toContain('CHECK ("status" IN (\'PENDING\', \'ACCEPTED\', \'REJECTED\', \'CANCELLED\'))');
    expect(sql).toContain('ON "plot_post_requests" ("postId", "plotId") WHERE "status" = \'PENDING\'');
    expect(sql).toContain('ON "plot_post_requests" ("authorId", "status", "createdAt")');
  });

  it('drops the request table', async () => {
    await migration.down(runner);

    expect(query.mock.calls.map(([statement]) => statement)).toEqual([
      'DROP TABLE "plot_post_requests"',
    ]);
  });
});
