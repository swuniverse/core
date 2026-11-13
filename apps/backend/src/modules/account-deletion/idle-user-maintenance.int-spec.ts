import { DataSource } from 'typeorm';
import { AccountDeletionMark } from '@swuniverse/shared';
import { connectIntegrationDatabase, createUser, resetDatabase } from '../../testing/integration/database';
import { User } from '../auth/user.entity';
import { IdleUserMaintenanceService } from './idle-user-maintenance.service';
import { PlayerDeletionService } from './player-deletion.service';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const NOW = new Date('2026-11-14T02:00:00.000Z');
const INACTIVE_MS = 91.5 * DAY_MS;
const VACATION_MS = 183 * DAY_MS;
const ago = (ms: number) => new Date(NOW.getTime() - ms);

/** sh-AP-06: idle-account warnings and deletions after the STU deadlines. */
describe('idle user maintenance (PostgreSQL)', () => {
  let source: DataSource;
  beforeAll(async () => { source = await connectIntegrationDatabase(); });
  beforeEach(async () => resetDatabase(source));
  afterAll(async () => source?.destroy());

  let mails: Array<{ to: string; subject: string; text: string }>;
  let deleted: number[];

  function service(config: Record<string, string> = {}, deletions?: Partial<PlayerDeletionService>) {
    mails = [];
    deleted = [];
    const values: Record<string, string> = { IDLE_DELETION_ENABLED: 'true', ...config };
    return new IdleUserMaintenanceService(
      source.getRepository(User),
      { get: (key: string) => values[key] } as never,
      {
        sendMail: async (input: { to: string; subject: string; text: string }) => {
          mails.push(input);
          return true;
        },
        isEnabled: () => true,
      } as never,
      (deletions ?? {
        delete: async (id: number) => {
          deleted.push(id);
          await new PlayerDeletionService(source).delete(id);
        },
      }) as never,
    );
  }

  async function user(name: string, values: Partial<User> = {}) {
    const saved = await createUser(source, { username: name, email: `${name}@example.test`, emailVerifiedAt: new Date(0), ...values });
    if (values.createdAt) await source.getRepository(User).update(saved.id, { createdAt: values.createdAt });
    return saved;
  }

  it('deletes exactly at the STU deadlines and spares admins, NPCs, forbidden and never active accounts', async () => {
    const inactive = await user('inactive', { lastActiveAt: ago(INACTIVE_MS + 1) });
    const borderline = await user('borderline', { lastActiveAt: ago(INACTIVE_MS) });
    const vacationer = await user('vacationer', { vacationMode: true, lastActiveAt: ago(VACATION_MS + 1) });
    const resting = await user('resting', { vacationMode: true, lastActiveAt: ago(INACTIVE_MS + DAY_MS * 30) });
    const requested = await user('requested', { lastActiveAt: ago(HOUR_MS), deletionMark: AccountDeletionMark.Confirmed });
    await user('admin', { lastActiveAt: ago(VACATION_MS * 2), isAdmin: true });
    await user('npc', { lastActiveAt: ago(VACATION_MS * 2), isNpc: true });
    await user('forbidden', { lastActiveAt: ago(VACATION_MS * 2), deletionMark: AccountDeletionMark.Forbidden });
    await user('never', { lastActiveAt: null, createdAt: ago(VACATION_MS * 2) });

    await expect(service().run(NOW)).resolves.toBe('1 Warnungen, 3 Löschungen');

    expect(deleted).toEqual([inactive.id, vacationer.id, requested.id]);
    const remaining = (await source.getRepository(User).find({ order: { id: 'ASC' } })).map((entry) => entry.username);
    expect(remaining).toEqual(['borderline', 'resting', 'admin', 'npc', 'forbidden', 'never']);
    expect(mails.map((mail) => [mail.to, mail.subject])).toEqual([
      [borderline.email, 'Star Wars Universe – Löschung wegen Inaktivität in 24 Stunden'],
      [inactive.email, 'Star Wars Universe – Löschung wegen Inaktivität'],
      [vacationer.email, 'Star Wars Universe – Löschung wegen Inaktivität'],
      [requested.email, 'Star Wars Universe – Löschung deines Kontos'],
    ]);
    expect(mails[0].text).toContain('Das Team von Star Wars Universe');
    expect(resting.id).toBeGreaterThan(0);
  });

  it('warns 48 and 24 hours before the inactive and vacation deadlines, once per account', async () => {
    const in48 = await user('in48', { lastActiveAt: ago(INACTIVE_MS - 36 * HOUR_MS) });
    const in24 = await user('in24', { lastActiveAt: ago(INACTIVE_MS - 12 * HOUR_MS) });
    await user('later', { lastActiveAt: ago(INACTIVE_MS - 50 * HOUR_MS) });
    const vacation24 = await user('vacation24', { vacationMode: true, lastActiveAt: ago(VACATION_MS - HOUR_MS) });
    await user('vacationEarly', { vacationMode: true, lastActiveAt: ago(INACTIVE_MS - 12 * HOUR_MS) });
    await user('admin', { isAdmin: true, lastActiveAt: ago(INACTIVE_MS - 12 * HOUR_MS) });

    await expect(service().run(NOW)).resolves.toBe('3 Warnungen, 0 Löschungen');

    expect(mails.map((mail) => [mail.to, mail.subject])).toEqual([
      [in48.email, 'Star Wars Universe – Löschung wegen Inaktivität in 48 Stunden'],
      [in24.email, 'Star Wars Universe – Löschung wegen Inaktivität in 24 Stunden'],
      [vacation24.email, 'Star Wars Universe – Löschung wegen Inaktivität in 24 Stunden'],
    ]);
    expect(deleted).toEqual([]);
  });

  it('handles unverified registrations only with e-mail verification enabled', async () => {
    const stale = await user('stale', { emailVerifiedAt: null, lastActiveAt: null, createdAt: ago(3 * DAY_MS + 1) });
    const fresh = await user('fresh', { emailVerifiedAt: null, lastActiveAt: null, createdAt: ago(2.5 * DAY_MS) });
    await user('newest', { emailVerifiedAt: null, lastActiveAt: null, createdAt: ago(1.5 * DAY_MS) });

    await expect(service().run(NOW)).resolves.toBe('0 Warnungen, 0 Löschungen');

    await expect(service({ EMAIL_VERIFICATION_ENABLED: 'true' }).run(NOW)).resolves.toBe('1 Warnungen, 1 Löschungen');
    expect(deleted).toEqual([stale.id]);
    expect(mails.map((mail) => [mail.to, mail.subject])).toEqual([
      [fresh.email, 'Star Wars Universe – Löschung wegen fehlender Bestätigung in 24 Stunden'],
      [stale.email, 'Star Wars Universe – Löschung wegen fehlender Bestätigung'],
    ]);
  });

  it('honours configured deadlines', async () => {
    const idle = await user('idle', { lastActiveAt: ago(11 * DAY_MS) });

    await expect(service({ IDLE_DELETION_DAYS: '10' }).run(NOW)).resolves.toBe('0 Warnungen, 1 Löschungen');
    expect(deleted).toEqual([idle.id]);
  });

  it('only logs in dry-run mode', async () => {
    await user('inactive', { lastActiveAt: ago(INACTIVE_MS + 1) });
    await user('in24', { lastActiveAt: ago(INACTIVE_MS - 12 * HOUR_MS) });

    await expect(service({ IDLE_DELETION_ENABLED: 'false' }).run(NOW)).resolves.toBe('Trockenlauf: 1 Warnungen, 1 Löschungen');
    expect(mails).toEqual([]);
    expect(deleted).toEqual([]);
    expect(await source.getRepository(User).count()).toBe(2);
  });

  it('keeps going after a failing account and reports the failure to the maintenance run', async () => {
    const broken = await user('broken', { lastActiveAt: ago(INACTIVE_MS + 1) });
    const fine = await user('fine', { lastActiveAt: ago(INACTIVE_MS + 1) });
    const real = new PlayerDeletionService(source);

    const run = service({}, {
      delete: async (id: number) => {
        if (id === broken.id) throw new Error('Datenbank weg');
        deleted.push(id);
        await real.delete(id);
      },
    }).run(NOW);

    await expect(run).rejects.toThrow(`0 Warnungen, 1 Löschungen; Fehler: Konto ${broken.id}: Datenbank weg`);
    expect(deleted).toEqual([fine.id]);
    expect(mails.map((mail) => mail.to)).toEqual([fine.email]);
  });
});
