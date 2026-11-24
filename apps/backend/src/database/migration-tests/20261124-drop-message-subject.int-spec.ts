import { DataSource } from 'typeorm';
import {
  connectIntegrationDatabase,
  createUser,
  resetDatabase,
} from '../../testing/integration/database';
import { DropMessageSubject20261124180000 } from '../migrations/20261124180000-drop-message-subject';

/** soc-AUD-07b: the subject column is merged into the body before it is dropped. */
describe('drop message subject migration (PostgreSQL)', () => {
  let source: DataSource;
  const migration = new DropMessageSubject20261124180000();
  const run = async (direction: 'up' | 'down') => {
    const runner = source.createQueryRunner();
    try {
      await migration[direction](runner);
    } finally {
      await runner.release();
    }
  };

  beforeAll(async () => {
    source = await connectIntegrationDatabase();
  });
  beforeEach(async () => {
    await resetDatabase(source);
    await run('down');
  });
  afterAll(async () => {
    await run('up');
    await source?.destroy();
  });

  it('prepends a non-empty subject in bold unless the body already contains it', async () => {
    const user = await createUser(source);
    const insert = async (subject: string, body: string) =>
      (
        await source.query(
          `INSERT INTO messages ("senderId", "recipientId", subject, body) VALUES ($1, $1, $2, $3) RETURNING id`,
          [user.id, subject, body],
        )
      )[0].id as number;
    const merged = await insert(' Lotteriegewinn ', 'Du hast gewonnen.');
    const contained = await insert('Ionensturm', 'Die X ist im Ionensturm.');
    const empty = await insert('  ', 'Nur Text');

    await run('up');
    await run('up');

    const bodies = new Map<number, string>(
      (await source.query(`SELECT id, body FROM messages`)).map(
        (row: { id: number; body: string }) => [row.id, row.body],
      ),
    );
    expect(bodies.get(merged)).toBe('[b]Lotteriegewinn[/b]\nDu hast gewonnen.');
    expect(bodies.get(contained)).toBe('Die X ist im Ionensturm.');
    expect(bodies.get(empty)).toBe('Nur Text');
    const columns = await source.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'subject'`,
    );
    expect(columns).toHaveLength(0);
  });
});
