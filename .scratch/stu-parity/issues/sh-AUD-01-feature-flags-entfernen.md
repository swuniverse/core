# Feature-Flags für Mail, Verifikation, Löschung und Rechtstexte entfernen

**Status:** resolved
**Priority:** P2
**Size:** M
**Blocked by:** —

## Ziel

E-Mail-Verifikation, Passwort-Reset, Kontolöschung, Inaktivitätslöschung, PM-/Massenmail und die Rechtstexte (Impressum, Datenschutz, Hilfe-Links) laufen heute hinter Feature-Flags, die per Default aus sind (`map.md` Leitplanke 4). Der Product Owner hat am 2026-11-17 entschieden, dass diese Funktionen **nicht mehr hinter Flags** stehen. Sie sind ab jetzt immer aktiv, wie in STU. Leitplanke 4 ist damit aufgehoben.

Betroffene Flags (Stand `stu-parity`):
- `EMAIL_VERIFICATION_ENABLED`
- `PASSWORD_RESET_ENABLED`
- `ACCOUNT_DELETION_ENABLED`
- `IDLE_DELETION_ENABLED`
- `PLAYER_MAIL_NOTIFICATIONS_ENABLED`
- `VITE_LEGAL_PAGES_ENABLED` (Frontend, zur Build-Zeit eingebacken)

**Vorher abgleichen:** Auf `origin/main` gibt es Commit `da02e52f` („open registration with email verification, remove invite keys“). Er ist in `stu-parity` noch nicht enthalten. Er öffnet die Registrierung, macht die E-Mail-Bestätigung (24-h-Link) zur Pflicht, entfernt die Invite-Keys samt Tabellen und schreibt `auth.service.ts`, `register.tsx`, `verify-email.tsx`, `settings.tsx`, `mail.service.ts` und `.env.example` stark um. Dieses Ticket setzt voraus, dass `origin/main` in `stu-parity` gemergt ist, und baut auf dessen Verifikationsfluss auf. Keine zweite Verifikationslogik danebenbauen. Den Merge selbst macht der Betreiber bzw. der Koordinator, nicht der umsetzende Agent (geteilter Checkout).

Inhalt von Impressum und Datenschutzerklärung liefert der Betreiber. Bis dahin bleiben die Platzhalter klar markiert, die Seiten sind aber verlinkt und erreichbar.

## STU-Quellen

- `src/Module/Index/Action/Register/Register.php` (Registrierung mit Aktivierung, ohne Schalter)
- `src/Module/Maindesk/Action/AccountVerification/` (Kontobestätigung)
- `src/Module/PlayerSetting/Action/DeleteAccount/` (Kontolöschung)
- `src/Module/Maintenance/IdleUserWarning.php`, `src/Module/Maintenance/IdleUserDeletion.php` (Inaktivität, immer aktiv)
- `src/Module/Admin/Action/SendMassMail.php` (Massenmail)
- `src/html/index/impressum.twig` (Impressum immer verlinkt)

## SWU-Pfade

- `.env.example`, `.env.production.example` (Flag-Einträge entfernen, SMTP-Pflichtwerte dokumentieren)
- `apps/backend/src/modules/auth/auth.service.ts` (`EMAIL_VERIFICATION_ENABLED`, `PASSWORD_RESET_ENABLED`, `ACCOUNT_DELETION_ENABLED`)
- `apps/backend/src/modules/auth/email-verification-access-check.ts`
- `apps/backend/src/modules/game-status/game-status.guard.ts` (Z. ~75–86) und `game-status.guard.spec.ts`
- `apps/backend/src/modules/settings/settings.service.ts` (`ACCOUNT_DELETION_ENABLED`) und `settings.service.spec.ts`
- `apps/backend/src/modules/account-deletion/idle-user-maintenance.service.ts` (`IDLE_DELETION_ENABLED`, Trockenlauf) und `idle-user-maintenance.int-spec.ts`
- `apps/backend/src/modules/messaging/admin-broadcast.service.ts`, `private-message-notification.service.ts` (`PLAYER_MAIL_NOTIFICATIONS_ENABLED`) und `admin-broadcast.int-spec.ts`
- `apps/backend/src/modules/auth/email-verification.service.spec.ts`, `password-reset.service.spec.ts`
- `apps/frontend/src/components/legal/LegalLinks.tsx` (`VITE_LEGAL_PAGES_ENABLED`)
- `apps/frontend/src/pages/settings.tsx` (`LEGAL_PAGES_ENABLED`), `pages/login.tsx` (Link „Passwort vergessen“, Z. ~671), `components/layout/app-shell.tsx` (Z. ~83–89)
- `apps/frontend/src/pages/imprint.tsx`, `pages/privacy.tsx` (Platzhalter)
- `apps/frontend/Dockerfile`, `.github/workflows/deploy.yml` (kein Build-Arg mehr nötig)

## Akzeptanzkriterien

- [x] `origin/main` (mindestens `da02e52f`) ist in `stu-parity` enthalten. Der Verifikationsfluss von `origin/main` ist die Grundlage; Konflikte mit den hier entfernten Flags sind zugunsten „immer aktiv“ aufgelöst.
- [x] Alle sechs oben genannten Flags sind aus Code, Tests, `.env.example` und `.env.production.example` entfernt. Kein Codepfad prüft sie noch. `SEASONAL_ANOMALIES_ENABLED` bleibt unberührt (nicht Teil von Leitplanke 4).
- [x] E-Mail-Verifikation, Passwort-Reset, Kontolöschung (mit Bestätigung und Widerruf), Inaktivitätswarnung und -löschung sowie Massenmail laufen immer. Der Trockenlauf der Inaktivitätslöschung gibt es nur noch als expliziten Admin-Aufruf, nicht als Default.
- [x] Ohne konfigurierten SMTP-Transport startet das Backend lokal weiter und schreibt Mails ins Log (Verhalten von `origin/main`). In Produktion meldet der Start einen fehlenden SMTP-Transport deutlich als Fehler im Log.
- [x] Impressum, Datenschutz und Hilfe sind auf Landing, im Spielrahmen und in den Einstellungen immer verlinkt. Die Platzhalter in `imprint.tsx` und `privacy.tsx` bleiben sichtbar als Platzhalter markiert, bis der Betreiber die Texte liefert.
- [x] `map.md`: Leitplanke 4 als aufgehoben markiert (Verweis auf dieses Ticket und die PO-Entscheidung vom 2026-11-17).
- [x] Backend-Tests: Verifikationspflicht beim Login, Passwort-Reset, Kontolöschung, Inaktivitätslauf und Massenmail ohne gesetzte Umgebungsvariablen. Tests, die bisher „Flag aus“ prüften, sind entfernt oder umgeschrieben.
- [x] Frontend-Tests: Rechtslinks und „Passwort vergessen“ werden ohne Umgebungsvariable gerendert.

## Herkunft

- [`../audit-2026-11-17/README.md`](../audit-2026-11-17/README.md), Abschnitt G (Zeile „E-Mail-Verifikation, Kontolöschung, Inaktivitätslöschung, Massenmail, Rechtstexte hinter Flags“), Abschnitt H („PM-Mail … relevant, sobald die Flags laut Abschnitt G entfallen“) und Abschnitt N2.
- [`../audit-2026-11-17/shell-admin-runtime.md`](../audit-2026-11-17/shell-admin-runtime.md), „Bewusste/entschiedene Abweichungen“ und „Unsicherheiten – nachgeprüft“ (`VITE_LEGAL_PAGES_ENABLED` im Prod-Build praktisch aus).
- PO-Entscheidung 2026-11-17: Flags entfallen, Funktionen standardmäßig aktiv. Hebt `map.md` Leitplanke 4 auf. Betrifft die resolved Tickets sh-AP-03, sh-AP-05a–d, sh-AP-06, sh-AP-10 und sh-AP-17, deren AK „hinter Flag, Default aus“ damit überholt ist.

## Comments

- Die PM-Mail ist in SWU Opt-out und ohne Nachrichtentext, in STU Opt-in mit vollem Text (social.md, Abweichung 6). Mit diesem Ticket wird sie für alle Spieler real verschickt. Die Angleichung an STU gehört nicht hierher, sollte aber vor oder mit diesem Ticket live gehen.
- Zustellbarkeit (Absender, SPF/DKIM) ist sh-AUD-17.

- 2026-11-17: Im bestehenden Checkout auf `stu-parity` umgesetzt. Merge `360a365a` enthält `origin/main` einschließlich `da02e52f`; kein weiterer Merge nötig. Die sechs Flags entfallen aus Anwendungscode, Tests und Env-Beispielen. Die API `/auth/features` bleibt kompatibel und liefert für alle drei Kontofunktionen `true`; Frontend-Einstiege brauchen diese Abfrage nicht mehr.
- Kontolöschbestätigung und Passwort-Reset benötigen die bereits vorhandene `AccountToken`-Entität. Ihre beim Merge fehlende Registrierung in `AppModule` wurde ergänzt und mit der vollständigen Anwendung gegen PostgreSQL geprüft. Bestätigte und widerrufene Löschanträge sowie bereits verbrauchte Tokens sind geprüft.
- Lokale SMTP-Fallbacks protokollieren Mailtext einschließlich Aktionslinks. Produktion meldet fehlendes SMTP beim Start und beim Versand als Fehler, ohne Aktions-Tokens zu protokollieren. Tatsächliche Mailzustellung wird als Erfolg gezählt; lokale Log-Ausgaben gelten nicht als zugestellt.
- Der tägliche Inaktivitätslauf ist immer aktiv; `POST /api/admin/idle-users/preview` ist durch JWT und AdminGuard geschützt und verändert keine Konten oder Mails. Persönliches Mail-Opt-in und NPC-Ausschlüsse bleiben erhalten. STU-Mailinhalt/-Empfängerregeln folgen in soc-AUD-06, Zustellbarkeit in sh-AUD-17. Betreiber-Platzhalter bleiben markiert; nur die veralteten Aussagen zur Standard-Deaktivierung in der Datenschutzseite wurden angepasst.

## Answer

Alle Akzeptanzkriterien erfüllt. Leitplanke 4 ist in `map.md` aufgehoben und der Abschluss verlinkt. Dockerfile und Deploy-Workflow enthalten bereits keinen Legal-Build-Arg und benötigen keine Änderung. Keine Migration erforderlich: Tabelle und Migration für `account_tokens` bestehen bereits.

Validierung:

- 9 gezielte Backend-Unit-Suites: 83 Tests grün (Auth/Verifikationspflicht, Reset, Kontolöschantrag/Widerruf, Spielzugangs-Guard, Mail, PM-Mail und Admin-Trockenlauf).
- `npx nx run backend:test-integration --runTestsByPath apps/backend/src/modules/account-deletion/idle-user-maintenance.int-spec.ts apps/backend/src/modules/messaging/admin-broadcast.int-spec.ts`: 11 PostgreSQL-/HTTP-Tests grün, ohne Betriebsflags.
- `npx nx run backend:test-integration --runTestsByPath apps/backend/src/modules/account-deletion/account-deletion.int-spec.ts`: 7 Tests grün, inklusive zwei neuer Fälle mit echten Löschbestätigungs-Tokens durch den vollständigen AppModule-Kontext.
- `npx vitest run --config apps/frontend/vite.config.mts apps/frontend/src/pages/login.spec.tsx apps/frontend/src/pages/settings-tutorial.spec.tsx apps/frontend/src/components/layout/app-shell-tutorial.spec.tsx`: 20 Tests grün.
- Backend-/Frontend-Lint: keine Fehler; bestehende Warnungen. `npx nx run-many --targets=typecheck,build --projects=backend,frontend`: grün einschließlich Shared-Abhängigkeiten.
- `git diff --check`: grün. Keine verbliebenen Referenzen der sechs Flags in Anwendungscode, Tests, Env-Beispielen oder Deploy-Workflow. `SEASONAL_ANOMALIES_ENABLED` unverändert.
