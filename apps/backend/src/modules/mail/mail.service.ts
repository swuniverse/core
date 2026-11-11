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

  sendVerificationMail(
    to: string,
    username: string,
    token: string,
  ): Promise<boolean> {
    const baseUrl = (
      this.config.get<string>('PUBLIC_URL') ??
      this.config.get<string>('CORS_ORIGIN') ??
      'http://localhost:5173'
    ).replace(/\/+$/, '');
    const link = `${baseUrl}/verify-email?token=${encodeURIComponent(token)}`;

    if (!this.transporter) {
      this.logger.warn(`Verification link for ${to}: ${link}`);
    }

    const subject = 'Bestaetige deine E-Mail-Adresse - Star Wars Universe';
    const text = [
      `Hallo ${username},`,
      '',
      'bitte bestaetige deine E-Mail-Adresse, um deinen Account zu aktivieren:',
      link,
      '',
      'Der Link ist 24 Stunden gueltig.',
      'Falls du dich nicht registriert hast, kannst du diese Mail ignorieren.',
      '',
      'Star Wars Universe',
    ].join('\n');
    const html = `
      <p>Hallo ${this.escapeHtml(username)},</p>
      <p>bitte bestaetige deine E-Mail-Adresse, um deinen Account bei <strong>Star Wars Universe</strong> zu aktivieren:</p>
      <p><a href="${this.escapeHtml(link)}">E-Mail-Adresse bestaetigen</a></p>
      <p>Der Link ist 24 Stunden gueltig. Falls du dich nicht registriert hast, kannst du diese Mail ignorieren.</p>
      <p>Star Wars Universe</p>
    `;

    return this.sendMail({ to, subject, text, html });
  }

  sendWelcomeMail(to: string, username: string): Promise<boolean> {
    const subject = 'Willkommen bei Star Wars Universe';
    const text = [
      `Hallo ${username},`,
      '',
      'deine E-Mail-Adresse ist bestaetigt, dein Account bei Star Wars Universe ist aktiv.',
      'Waehle im Spiel deine Fraktion und gruende deine erste Kolonie.',
      '',
      'Viel Erfolg im Outer Rim!',
      'Star Wars Universe',
    ].join('\n');
    const html = `
      <p>Hallo ${this.escapeHtml(username)},</p>
      <p>deine E-Mail-Adresse ist bestaetigt, dein Account bei <strong>Star Wars Universe</strong> ist aktiv.</p>
      <p>Waehle im Spiel deine Fraktion und gruende deine erste Kolonie.</p>
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
