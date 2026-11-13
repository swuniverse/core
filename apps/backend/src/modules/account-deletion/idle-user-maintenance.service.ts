import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountDeletionMark } from '@swuniverse/shared';
import { User } from '../auth/user.entity';
import { MailService } from '../mail/mail.service';
import type { MaintenanceHandler } from '../tick/maintenance.service';
import { PlayerDeletionService } from './player-deletion.service';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** STU `PlayerDeletion::USER_IDLE_TIME`: 7,905,600 s. */
export const DEFAULT_IDLE_DELETION_DAYS = 91.5;
/** STU `USER_IDLE_TIME_VACATION`: 15,811,200 s. */
export const DEFAULT_IDLE_DELETION_VACATION_DAYS = 183;
/** STU `USER_IDLE_REGISTRATION`: 3 days. */
export const DEFAULT_IDLE_UNVERIFIED_DAYS = 3;

export type IdleDeletionReason = 'REQUESTED' | 'INACTIVE' | 'VACATION' | 'UNVERIFIED';

export interface IdleDeletionCandidate {
  user: Pick<User, 'id' | 'username' | 'email'>;
  reason: IdleDeletionReason;
}

export interface IdleWarning {
  user: Pick<User, 'id' | 'username' | 'email'>;
  hours: 48 | 24;
  unverified: boolean;
}

const SIGNATURE = ['', 'Möge die Macht mit dir sein!', 'Das Team von Star Wars Universe'];

/**
 * Daily idle-account maintenance (sh-AP-06, STU `IdleUserWarning` and
 * `IdleUserDeletion`): first warnings 48 h and 24 h before a deadline, then
 * deletions with a closing mail. Admins, NPCs and accounts with deletion
 * forbidden are never touched; verified accounts without recorded activity
 * neither (STU `la.timestamp > 0`). Behind `IDLE_DELETION_ENABLED`; without
 * it the run only logs whom it would warn and delete.
 */
@Injectable()
export class IdleUserMaintenanceService implements MaintenanceHandler {
  readonly name = 'idle-users';
  private readonly logger = new Logger(IdleUserMaintenanceService.name);

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly config: ConfigService,
    private readonly mail: MailService,
    private readonly deletions: PlayerDeletionService,
  ) {}

  async run(now: Date): Promise<string> {
    const enabled = this.config.get<string>('IDLE_DELETION_ENABLED') === 'true';
    const warnings = await this.warnings(now);
    const candidates = await this.candidates(now);
    const prefix = enabled ? '' : 'Trockenlauf: ';
    this.logger.log(`${prefix}${warnings.length} Warnungen: ${this.ids(warnings)}`);
    this.logger.log(`${prefix}${candidates.length} Löschungen: ${this.ids(candidates)}`);
    if (!enabled) {
      return `Trockenlauf: ${warnings.length} Warnungen, ${candidates.length} Löschungen`;
    }

    const errors: string[] = [];
    for (const warning of warnings) {
      await this.attempt(errors, warning.user.id, () => this.sendWarning(warning));
    }
    let deleted = 0;
    for (const candidate of candidates) {
      await this.attempt(errors, candidate.user.id, async () => {
        await this.deletions.delete(candidate.user.id);
        deleted += 1;
        await this.sendClosingMail(candidate);
      });
    }
    const summary = `${warnings.length} Warnungen, ${deleted} Löschungen`;
    // Every account was tried; the failures go into the maintenance result.
    if (errors.length) throw new Error(`${summary}; Fehler: ${errors.join('; ')}`);
    return summary;
  }

  /** Accounts due for deletion now. */
  async candidates(now: Date): Promise<IdleDeletionCandidate[]> {
    const inactive = this.threshold(now, 'IDLE_DELETION_DAYS', DEFAULT_IDLE_DELETION_DAYS);
    const vacation = this.threshold(now, 'IDLE_DELETION_VACATION_DAYS', DEFAULT_IDLE_DELETION_VACATION_DAYS);
    const users = await this.eligible()
      .andWhere(
        `(user.deletionMark = :confirmed
          OR (user.vacationMode = false AND user.lastActiveAt IS NOT NULL AND user.lastActiveAt < :inactive)
          OR (user.vacationMode = true AND user.lastActiveAt IS NOT NULL AND user.lastActiveAt < :vacation)
          ${this.unverifiedEnabled() ? 'OR (user.emailVerifiedAt IS NULL AND user.createdAt < :unverified)' : ''})`,
        {
          confirmed: AccountDeletionMark.Confirmed,
          inactive,
          vacation,
          unverified: this.threshold(now, 'IDLE_UNVERIFIED_DAYS', DEFAULT_IDLE_UNVERIFIED_DAYS),
        },
      )
      .getMany();
    return users.map((user) => ({ user, reason: this.reason(user, inactive, vacation) }));
  }

  /**
   * Warnings for accounts whose deadline falls into the next 48 hours: "in 48
   * Stunden" between 48 and 24 hours before, "in 24 Stunden" in the last day.
   * The daily run thus mails each account at most once per run and window.
   */
  async warnings(now: Date): Promise<IdleWarning[]> {
    const windows: Array<{ key: string; fallback: number; column: string; extra: string; unverified: boolean }> = [
      { key: 'IDLE_DELETION_DAYS', fallback: DEFAULT_IDLE_DELETION_DAYS, column: 'lastActiveAt', extra: 'user.vacationMode = false AND user.lastActiveAt IS NOT NULL', unverified: false },
      { key: 'IDLE_DELETION_VACATION_DAYS', fallback: DEFAULT_IDLE_DELETION_VACATION_DAYS, column: 'lastActiveAt', extra: 'user.vacationMode = true AND user.lastActiveAt IS NOT NULL', unverified: false },
    ];
    if (this.unverifiedEnabled()) {
      windows.push({ key: 'IDLE_UNVERIFIED_DAYS', fallback: DEFAULT_IDLE_UNVERIFIED_DAYS, column: 'createdAt', extra: 'user.emailVerifiedAt IS NULL', unverified: true });
    }
    const warned = new Map<number, IdleWarning>();
    for (const window of windows) {
      const deadline = this.threshold(now, window.key, window.fallback);
      const in48 = new Date(deadline.getTime() + 2 * DAY_MS);
      const in24 = new Date(deadline.getTime() + DAY_MS);
      const users = await this.eligible()
        .andWhere('user.deletionMark <> :confirmed', { confirmed: AccountDeletionMark.Confirmed })
        .andWhere(window.extra)
        .andWhere(`user.${window.column} >= :deadline AND user.${window.column} < :in48`, { deadline, in48 })
        .getMany();
      for (const user of users) {
        if (warned.has(user.id)) continue;
        // Unverified accounts only get the 24 h notice, like STU.
        const hours = (user[window.column as 'lastActiveAt' | 'createdAt'] as Date) < in24 ? 24 : 48;
        if (window.unverified && hours === 48) continue;
        warned.set(user.id, { user, hours, unverified: window.unverified });
      }
    }
    return [...warned.values()].sort((left, right) => left.user.id - right.user.id);
  }

  private eligible() {
    return this.users
      .createQueryBuilder('user')
      .select(['user.id', 'user.username', 'user.email', 'user.deletionMark', 'user.vacationMode', 'user.lastActiveAt', 'user.emailVerifiedAt', 'user.createdAt'])
      .where('user.isAdmin = false AND user.isNpc = false')
      .andWhere('user.deletionMark <> :forbidden', { forbidden: AccountDeletionMark.Forbidden })
      .orderBy('user.id', 'ASC');
  }

  private reason(user: User, inactive: Date, vacation: Date): IdleDeletionReason {
    if (user.deletionMark === AccountDeletionMark.Confirmed) return 'REQUESTED';
    if (user.lastActiveAt && !user.vacationMode && user.lastActiveAt < inactive) return 'INACTIVE';
    if (user.lastActiveAt && user.vacationMode && user.lastActiveAt < vacation) return 'VACATION';
    return 'UNVERIFIED';
  }

  private threshold(now: Date, key: string, fallback: number): Date {
    const configured = Number(this.config.get<string>(key));
    const days = Number.isFinite(configured) && configured > 0 ? configured : fallback;
    return new Date(now.getTime() - days * DAY_MS);
  }

  private unverifiedEnabled(): boolean {
    return this.config.get<string>('EMAIL_VERIFICATION_ENABLED') === 'true';
  }

  private async attempt(errors: string[], userId: number, work: () => Promise<unknown>): Promise<void> {
    try {
      await work();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`Konto ${userId}: ${message}`);
      this.logger.error(`Idle maintenance failed for user ${userId}: ${message}`);
    }
  }

  private async sendWarning({ user, hours, unverified }: IdleWarning): Promise<void> {
    const text = unverified
      ? [
          `Hallo ${user.username},`,
          '',
          'du hast dich bei Star Wars Universe registriert, deine E-Mail-Adresse aber noch nicht bestätigt.',
          `Bestätigst du sie nicht innerhalb von ${hours} Stunden, wird dein Konto gelöscht.`,
          'Gab es Probleme bei der Registrierung, melde dich gern bei uns.',
        ]
      : [
          `Hallo ${user.username},`,
          '',
          'du warst längere Zeit nicht mehr in Star Wars Universe unterwegs.',
          `Meldest du dich nicht innerhalb von ${hours} Stunden wieder an, wird dein Konto gelöscht.`,
          'Wir würden uns freuen, dich wiederzusehen!',
        ];
    await this.send(
      user.email,
      unverified
        ? `Star Wars Universe – Löschung wegen fehlender Bestätigung in ${hours} Stunden`
        : `Star Wars Universe – Löschung wegen Inaktivität in ${hours} Stunden`,
      text,
    );
  }

  private async sendClosingMail({ user, reason }: IdleDeletionCandidate): Promise<void> {
    const cause = {
      REQUESTED: ['Löschung deines Kontos', 'dein Konto wurde wie von dir beantragt gelöscht.'],
      INACTIVE: ['Löschung wegen Inaktivität', 'du warst längere Zeit nicht mehr aktiv, daher wurde dein Konto gelöscht.'],
      VACATION: ['Löschung wegen Inaktivität', 'du warst sehr lange im Urlaubsmodus und nicht mehr aktiv, daher wurde dein Konto gelöscht.'],
      UNVERIFIED: ['Löschung wegen fehlender Bestätigung', 'du hast deine E-Mail-Adresse nicht bestätigt, daher wurde dein Konto gelöscht.'],
    }[reason];
    await this.send(user.email, `Star Wars Universe – ${cause[0]}`, [
      `Hallo ${user.username},`,
      '',
      cause[1],
      'Wir würden uns freuen, dich bald wieder bei uns zu sehen!',
    ]);
  }

  private async send(to: string, subject: string, lines: string[]): Promise<void> {
    const sent = await this.mail.sendMail({ to, subject, text: [...lines, ...SIGNATURE].join('\n') });
    if (!sent && this.mail.isEnabled()) throw new Error(`Mail an ${to} fehlgeschlagen`);
  }

  private ids(entries: Array<{ user: { id: number } }>): string {
    return entries.map((entry) => entry.user.id).join(', ') || '–';
  }
}
