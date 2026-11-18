import { UserSettingsReader } from './user-settings-reader';
import { RpgBehavior } from '@swuniverse/shared';

describe('UserSettingsReader', () => {
  it('returns boolean defaults and overrides for one user', async () => {
    const repository = {
      find: jest.fn(async ({ where }: { where: { userId: number; key: string } }) => {
        if (where.key === 'storage_notification') return [{ userId: 7, key: where.key, value: '0' }];
        if (where.key === 'email_notification') return [{ userId: 7, key: where.key, value: '1' }];
        return [];
      }),
    };
    const reader = new UserSettingsReader(repository as any);

    await expect(reader.getBoolean(7, 'storage_notification')).resolves.toBe(
      false,
    );
    await expect(reader.getBoolean(8, 'email_notification')).resolves.toBe(false);
    await expect(reader.getBoolean(7, 'email_notification')).resolves.toBe(true);
  });

  it('keeps RPG behavior default aligned with settings and returns a stored value', async () => {
    const repository = {
      find: jest.fn(async ({ where }: { where: { userId: number } }) =>
        where.userId === 7
          ? [{ userId: 7, key: 'rpg_behavior', value: String(RpgBehavior.OPEN) }]
          : [],
      ),
    };
    const reader = new UserSettingsReader(repository as any);

    await expect(reader.getSettings(8)).resolves.toMatchObject({
      rpg_behavior: String(RpgBehavior.NOT_SET),
    });
    await expect(reader.getSettings(7)).resolves.toMatchObject({
      rpg_behavior: String(RpgBehavior.OPEN),
    });
  });

  it('loads boolean settings for many users in one query', async () => {
    const repository = {
      find: jest.fn(async () => [
        { userId: 2, key: 'storage_notification', value: '0' },
      ]),
    };
    const reader = new UserSettingsReader(repository as any);

    await expect(
      reader.getManyBoolean([1, 2, 3], 'storage_notification'),
    ).resolves.toEqual(new Map([
      [1, false],
      [2, false],
      [3, false],
    ]));
    expect(repository.find).toHaveBeenCalledTimes(1);
  });
});
