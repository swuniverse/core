# E-Mail-Benachrichtigung bei neuer persönlicher Nachricht (hinter Flag)

**Status:** ready-for-agent
**Priority:** P3
**Size:** S
**Blocked by:** —

## Ziel

Wird eine Nachricht im Ordner Persönlich zugestellt und hat der Empfänger `email_notification` aktiv, geht nach dem erfolgreichen Speichern eine Mail über `MailService` raus. Gemäß Leitplanke 4 steht der gesamte Versand hinter einer Konfiguration, die standardmäßig aus ist; der Standardwert der Spielereinstellung ist deshalb unkritisch und bleibt unverändert.

Abgrenzung: sh-AP-16 nennt `email_notification` als wirksam zu machende Einstellung. Dieses Issue liefert den konkreten Mailversand bei PMs; die Flag-Variable soll von sh-AP-10 (Massenmail) wiederverwendet werden.

## STU-Quellen

- `src/Module/Message/Lib/EmailNotificationSender.php`
- `src/Module/Message/Lib/PrivateMessageSender.php#createPrivateMessage`
- `src/Module/PlayerSetting/Lib/UserSettingEnum.php` (`EMAIL_NOTIFICATION`)

## SWU-Pfade

- `apps/backend/src/modules/messaging/messaging.service.ts#send`
- `apps/backend/src/modules/mail/mail.service.ts` (neue Methode, z. B. `sendPrivateMessageNotification`)
- `apps/backend/src/modules/settings/settings.service.ts`
- `.env.example` (neue Variable dokumentieren)

## Akzeptanzkriterien

- [ ] Neue Konfiguration `PLAYER_MAIL_NOTIFICATIONS_ENABLED` (Default `false`, in `.env.example` dokumentiert). Ist sie aus oder SMTP nicht konfiguriert, wird keine Mail versucht.
- [ ] Nur persönliche PMs von Spielern lösen eine Mail aus; Systemnachrichten und andere Ordner nicht.
- [ ] Mail nur bei `email_notification = '1'` des Empfängers; Betreff „Neue Nachricht von <Absender>“, Text ohne Nachrichteninhalt (nur Hinweis und Link auf `/messages`), Adressat ist die Konto-E-Mail.
- [ ] Der Versand läuft nach dem Speichern und blockiert bzw. scheitert den PM-Versand nie; Fehler werden nur geloggt.
- [ ] Backend-Tests mit gemocktem `MailService`: Flag aus → kein Aufruf; Flag an + Einstellung an → ein Aufruf; Einstellung aus → kein Aufruf; Mailfehler → PM trotzdem gespeichert.
- [ ] Hinweis im Einstellungs-UI bei der Option, dass E-Mails nur verschickt werden, wenn der Betreiber sie aktiviert hat (optional über einen Statusendpunkt).

## Comments

- 2026-10-29: Umsetzung test-first begonnen; die gezielten Backend-Tests waren grün (2 Suites, 18 Tests). Die verpflichtende Prüfung `npx nx affected -t lint typecheck test --base=HEAD` scheiterte in zwei ernsthaften Versuchen projektweit am bestehenden Frontend-Typecheck mit zahlreichen `TS6305`-Fehlern (fehlende `apps/frontend/dist/**/*.d.ts`-Buildartefakte), auch nach `npx nx run frontend:build`. Produktcode gemäß Abbruchverfahren verworfen. Bitte den Frontend-Typecheck/Buildgraph reparieren oder bestätigen, wie diese bestehende Baseline-Störung für Ralph-Läufe behandelt werden soll.
- 2026-11-09: Die integrierte Baseline 14b86081/c8e14f1c beseitigt den zuletzt dokumentierten fachfremden Blocker (Frontend-TS6305-Gate); reguläre Nx-Lint-/Typecheck-/Build-Gates und vollständige Tests sind laut Baseline-Review grün, lokale Test-Spieldaten waren dafür vorhanden. Status ready-for-agent; vorhandene Issue-Abhängigkeiten bleiben verbindlich. Dies belegt keine Feature-Fertigstellung: verworfene Änderungen müssen neu umgesetzt und die aktuellen Issue-Tests und Pflicht-Gates erneut ausgeführt werden; keine Ausnahme.
