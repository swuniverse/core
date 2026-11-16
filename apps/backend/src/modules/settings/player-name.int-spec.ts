import 'reflect-metadata';
import { DataSource } from 'typeorm';
import {
  connectIntegrationDatabase,
  createUser,
  resetDatabase,
} from '../../testing/integration/database';
import { User } from '../auth/user.entity';
import { UserSetting } from './entities/user-setting.entity';
import { SettingsService } from './settings.service';

describe('Player-name persistence (PostgreSQL)', () => {
  let db: DataSource;
  beforeAll(async () => {
    db = await connectIntegrationDatabase();
  });
  afterAll(async () => {
    if (db?.isInitialized) await db.destroy();
  });
  beforeEach(async () => resetDatabase(db));
  it('persists both representations and rejects the same visible name irrespective of formatting/case', async () => {
    const owner = await createUser(db),
      other = await createUser(db);
    const service = new SettingsService(
      db.getRepository(User),
      db.getRepository(UserSetting),
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    await service.updateProfile(owner.id, {
      displayName: '[color=red][b]Leia Organa[/b][/color]',
    });
    const stored = await db
      .getRepository(User)
      .findOneByOrFail({ id: owner.id });
    expect(stored.displayName).toBe('Leia Organa');
    expect(stored.displayNameMarkup).toBe(
      '[color=red][b]Leia Organa[/b][/color]',
    );
    await expect(
      service.updateProfile(other.id, { displayName: '[i]leia organa[/i]' }),
    ).rejects.toThrow('bereits vergeben');
    // The database protects concurrent callers even if application checks race.
    await expect(
      db.getRepository(User).update(other.id, { displayName: 'LEIA ORGANA' }),
    ).rejects.toMatchObject({ code: '23505' });
    await service.updateProfile(owner.id, { displayName: '' });
    expect(
      (await db.getRepository(User).findOneByOrFail({ id: owner.id }))
        .displayNameMarkup,
    ).toBeNull();
  });
});
