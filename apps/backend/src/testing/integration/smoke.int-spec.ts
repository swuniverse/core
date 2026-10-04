import { DataSource } from 'typeorm';
import { User } from '../../modules/auth/user.entity';
import {
  connectIntegrationDatabase,
  createUser,
  resetDatabase,
} from './database';

describe('integration database', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = await connectIntegrationDatabase();
  });
  afterAll(() => dataSource.destroy());
  beforeEach(() => resetDatabase(dataSource));

  it('has every migration applied', async () => {
    const pending = await dataSource.showMigrations();
    expect(pending).toBe(false);
  });

  it('stores and reads a player', async () => {
    const user = await createUser(dataSource, { username: 'smoke' });

    const loaded = await dataSource
      .getRepository(User)
      .findOneByOrFail({ id: user.id });
    expect(loaded.username).toBe('smoke');
    expect(loaded.prestige).toBe(0);
  });

  it('starts every test with a clean state', async () => {
    expect(await dataSource.getRepository(User).count()).toBe(0);
  });
});
