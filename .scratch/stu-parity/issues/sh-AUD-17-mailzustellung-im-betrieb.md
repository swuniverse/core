# Mailzustellung im Betrieb: Versand, Zustellbarkeit, Absender, SPF/DKIM

**Status:** ready-for-human
**Priority:** P2
**Size:** S
**Blocked by:** —

## Ziel

Mit sh-AUD-01 sind E-Mail-Verifikation, Passwort-Reset, Kontolöschung, Inaktivitätswarnungen, PM-Benachrichtigung und Massenmail immer aktiv. Ob Mails tatsächlich ankommen (SMTP, Spam-Einstufung, Zeichensatz), ließ sich im Abgleich nicht prüfen. Der Product Owner hat am 2026-11-17 entschieden: **Mailzustellung machen wir selbst**, als Betriebsticket unabhängig von STU.

Ohne zuverlässige Zustellung können sich neue Spieler nach dem Merge von `origin/main` (`da02e52f`, Verifikation als Pflicht) nicht freischalten. Die Aufgaben liegen beim Betreiber (DNS, Mailserver, Zugangsdaten), daher `ready-for-human`.

## STU-Quellen

- – (kein Maßstab; PO-Entscheidung)

## SWU-Pfade

- `apps/backend/src/modules/mail/mail.service.ts` (Transport, Absender `MAIL_FROM_NAME`/`MAIL_FROM_EMAIL`)
- `.env.production.example` (Z. ~16–23, SMTP-Werte), `.env.example`
- `.github/workflows/deploy.yml` (Secrets/Umgebung im Deployment)
- `apps/backend/src/modules/auth/` (Verifikation, Reset), `account-deletion/`, `messaging/admin-broadcast.service.ts`

## Akzeptanzkriterien

- [ ] Absenderadresse und -name festgelegt (z. B. `noreply@swuniverse.net`, „Star Wars Universe“); Antwortadresse für Support festgelegt.
- [ ] SMTP-Zugang in Produktion hinterlegt (Secret, nicht im Repo); Versand aus dem Produktionscontainer getestet.
- [ ] DNS: SPF-Eintrag für den versendenden Server, DKIM-Signatur aktiv, DMARC-Richtlinie gesetzt (mindestens `p=none` mit Reporting).
- [ ] Zustelltest an mindestens drei große Anbieter (z. B. Gmail, Outlook, GMX/Web.de): Verifikations-, Reset- und Löschbestätigungsmail kommen im Posteingang an, Umlaute korrekt, Links funktionieren (`PUBLIC_URL`).
- [ ] Bounce-/Fehlerbehandlung festgelegt: Versandfehler erscheinen im Backend-Log; Vorgehen bei harten Bounces (z. B. Adresskorrektur über `verify-email`) dokumentiert.
- [ ] Ergebnis und Einstellungen im Ticket unter `## Comments` dokumentiert (ohne Geheimnisse).

## Herkunft

- [`../audit-2026-11-17/README.md`](../audit-2026-11-17/README.md), Abschnitt H („Weiterhin offen: Tatsächliche Mailzustellung“), Abschnitt I (Zeile „Mailzustellung“: „Machen wir selbst“) und Abschnitt N1.
- [`../audit-2026-11-17/social.md`](../audit-2026-11-17/social.md) (Mail-Erzeuger, „tatsächliche Zustellung nur im laufenden Betrieb prüfbar“).
- PO-Entscheidung 2026-11-17: eigenes Betriebsticket (Versand, Zustellbarkeit), unabhängig von STU.

## Comments
