import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';

export interface SendMailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST');
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');
    const port = Number(this.config.get<string>('SMTP_PORT') ?? 587);
    const secure = this.config.get<string>('SMTP_SECURE') === 'true';
    const fromName =
      this.config.get<string>('MAIL_FROM_NAME') ?? 'Star Wars Universe';
    const fromEmail =
      this.config.get<string>('MAIL_FROM_EMAIL') ??
      user ??
      'noreply@swuniverse.net';

    this.from = `${fromName} <${fromEmail}>`;
    this.transporter =
      host && user && pass
        ? nodemailer.createTransport({
            host,
            port,
            secure,
            auth: { user, pass },
          })
        : null;

    if (!this.transporter) {
      this.logger.log('SMTP not configured; outbound mail disabled');
    }
  }

  isEnabled(): boolean {
    return this.transporter !== null;
  }

  async sendMail(input: SendMailInput): Promise<boolean> {
    if (!this.transporter) {
      this.logger.debug(`Skipped mail to ${input.to}: SMTP not configured`);
      return false;
    }

    try {
      await this.transporter.sendMail({
        from: this.from,
        to: input.to,
        subject: input.subject,
        text: input.text,
        html: input.html,
      });
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send mail to ${input.to}`,
        error instanceof Error ? error.stack : String(error),
      );
      return false;
    }
  }

  sendPasswordResetMail(
    to: string,
    username: string,
    resetUrl: string,
  ): Promise<boolean> {
    const subject = 'Passwort für Star Wars Universe zurücksetzen';
    const text = [
      `Hallo ${username},`,
      '',
      'über diesen Link kannst du dein Passwort zurücksetzen:',
      resetUrl,
      '',
      'Der Link ist 24 Stunden gültig und kann nur einmal verwendet werden.',
    ].join('\n');
    const html = `
      <p>Hallo ${this.escapeHtml(username)},</p>
      <p>Über diesen Link kannst du dein Passwort zurücksetzen:</p>
      <p><a href="${this.escapeHtml(resetUrl)}">Passwort zurücksetzen</a></p>
      <p>Der Link ist 24 Stunden gültig und kann nur einmal verwendet werden.</p>
    `;
    return this.sendMail({ to, subject, text, html });
  }

  sendEmailVerificationMail(
    to: string,
    username: string,
    verificationUrl: string,
  ): Promise<boolean> {
    const subject = 'E-Mail-Adresse für Star Wars Universe bestätigen';
    const text = [
      `Hallo ${username},`,
      '',
      'über diesen Link bestätigst du deine E-Mail-Adresse:',
      verificationUrl,
      '',
      'Der Link ist 72 Stunden gültig und kann nur einmal verwendet werden.',
    ].join('\n');
    const html = `
      <p>Hallo ${this.escapeHtml(username)},</p>
      <p>Über diesen Link bestätigst du deine E-Mail-Adresse:</p>
      <p><a href="${this.escapeHtml(verificationUrl)}">E-Mail-Adresse bestätigen</a></p>
      <p>Der Link ist 72 Stunden gültig und kann nur einmal verwendet werden.</p>
    `;
    return this.sendMail({ to, subject, text, html });
  }

  sendAccountDeletionMail(
    to: string,
    username: string,
    confirmationUrl: string,
  ): Promise<boolean> {
    const subject = 'Kontolöschung für Star Wars Universe bestätigen';
    const text = [
      `Hallo ${username},`,
      '',
      'über diesen Link bestätigst du die Löschung deines Kontos:',
      confirmationUrl,
      '',
      'Der Link ist 48 Stunden gültig und kann nur einmal verwendet werden.',
    ].join('\n');
    const html = `
      <p>Hallo ${this.escapeHtml(username)},</p>
      <p>Über diesen Link bestätigst du die Löschung deines Kontos:</p>
      <p><a href="${this.escapeHtml(confirmationUrl)}">Kontolöschung bestätigen</a></p>
      <p>Der Link ist 48 Stunden gültig und kann nur einmal verwendet werden.</p>
    `;
    return this.sendMail({ to, subject, text, html });
  }

  sendWelcomeMail(to: string, username: string): Promise<boolean> {
    const subject = 'Willkommen bei Star Wars Universe';
    const text = [
      `Hallo ${username},`,
      '',
      'dein Account bei Star Wars Universe wurde erstellt.',
      'Beanspruche im Spiel deine Heimatwelt und gruende deine erste Kolonie.',
      '',
      'Viel Erfolg im Outer Rim!',
      'Star Wars Universe',
    ].join('\n');
    const html = `
      <p>Hallo ${this.escapeHtml(username)},</p>
      <p>dein Account bei <strong>Star Wars Universe</strong> wurde erstellt.</p>
      <p>Beanspruche im Spiel deine Heimatwelt und gruende deine erste Kolonie.</p>
      <p>Viel Erfolg im Outer Rim!<br />Star Wars Universe</p>
    `;

    return this.sendMail({ to, subject, text, html });
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
