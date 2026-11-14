# Admin: Spieler blockieren und Löschverbot setzen

**Status:** resolved
**Priority:** P2
**Size:** S
**Blocked by:** sh-AP-08a, sh-AP-05a

## Ziel

Admins können einen Spieler blockieren: Seine E-Mail-Adresse wird als Hash auf eine Sperrliste gesetzt, die Registrierung und E-Mail-Änderung prüfen, und das Konto wird zur Löschung freigegeben (Marke 2). Außerdem können Admins ein Löschverbot (Marke 3) setzen und wieder aufheben.

## STU-Quellen

- `src/Module/Admin/Action/BlockUser.php` (E-Mail-Hash, Löschmarke `DELETION_CONFIRMED`)
- `src/Orm/Entity/BlockedUser.php`
- `src/Module/PlayerSetting/Action/ChangeEmail/ChangeEmail.php` (Sperrlistenprüfung)
- `src/Module/PlayerSetting/Lib/UserConstants.php` (`DELETION_FORBIDDEN`)

## SWU-Pfade

- neue Entity z. B. `apps/backend/src/modules/auth/blocked-email.entity.ts` mit Migration
- `apps/backend/src/modules/auth/auth.service.ts#register`, `auth.controller.ts`
- `EmailBlocklistPort` aus soc-F6 (`apps/backend/src/modules/settings/settings.service.ts`), falls vorhanden; sonst hier anlegen
- `apps/frontend/src/pages/admin-users.tsx`

## Akzeptanzkriterien

- [x] E-Mail-Hash: SHA-256 der getrimmten, kleingeschriebenen Adresse mit serverseitigem Pepper aus der Konfiguration (kein Klartext gespeichert).
- [x] `POST /auth/admin/users/:id/block` speichert den Hash, setzt Marke 2 und löscht das Refresh-Token; doppeltes Blockieren → 409 „Dieser Spieler ist bereits blockiert“. Admins nicht blockierbar.
- [x] Registrierung und E-Mail-Änderung mit gesperrter Adresse liefern 400 „Die E-Mail-Adresse ist blockiert“ (über den Port `EmailBlocklistPort`).
- [x] `PATCH /auth/admin/users/:id/deletion-forbidden` setzt bzw. entfernt Marke 3; ein Spielerantrag ist dann wie heute blockiert.
- [x] Spielerliste: Aktionen „Blockieren“ (rot umrandet, mit Bestätigung) und „Löschverbot“ (Umschalter), Anzeige des Zustands.
- [x] Backend-Tests: Hash statt Klartext, Registrierung blockiert (auch andere Groß-/Kleinschreibung), Marke 2 gesetzt, Löschverbot. Frontend-Test: Aktionen in der Liste.

## Comments

- 2026-10-30: Blockiert durch die verpflichtenden Repository-Gates: `npx nx affected -t lint typecheck test --base=HEAD` und `npx nx run-many --targets=build` scheitern bereits außerhalb dieses Issues im Backend an `TS2307: Cannot find module 'dotenv'` in `apps/backend/src/database/typeorm-migration.config.ts` sowie zahlreichen bestehenden `TS6305`-Fehlern. Zwei Umsetzungs-/Prüfversuche mit grünen fokussierten Backend- und Frontend-Tests konnten die vorgeschriebenen Gesamtprüfungen daher nicht grün bekommen. Produktcode gemäß Abbruchregel verworfen. Bitte zuerst die Baseline (z. B. sh-AP-23 oder Abhängigkeits-/Build-Artefakt-Reparatur) beheben und das Issue danach erneut freigeben.
- 2026-11-09: Die integrierte Baseline 14b86081/c8e14f1c beseitigt den zuletzt dokumentierten fachfremden Blocker (Backend-Dependency-/TS6305-Gates); reguläre Nx-Lint-/Typecheck-/Build-Gates und vollständige Tests sind laut Baseline-Review grün, lokale Test-Spieldaten waren dafür vorhanden. Status ready-for-agent; vorhandene Issue-Abhängigkeiten bleiben verbindlich. Dies belegt keine Feature-Fertigstellung: verworfene Änderungen müssen neu umgesetzt und die aktuellen Issue-Tests und Pflicht-Gates erneut ausgeführt werden; keine Ausnahme.
- 2026-11-14: Umgesetzt (315ecbc6).
  - `blocked_users` (Migration `20261114120000`) wie STU `stu_blocked_user` mit Spieler-ID als Schlüssel, ohne Fremdschlüssel, damit der Eintrag die Löschung überdauert; gespeichert wird nur `emailHash` = HMAC-SHA256 der getrimmten, kleingeschriebenen Adresse mit `EMAIL_BLOCKLIST_PEPPER` (in Produktion Pflicht wie `JWT_SECRET`, sonst Entwicklungs-Default; in `.env*.example` und Compose ergänzt). Entity und `EmailBlocklistService` liegen im Settings-Modul beim bestehenden `EmailBlocklistPort` (vermeidet Zyklus mit `AuthModule`); der Allow-All-Stub entfällt.
  - `POST /auth/admin/users/:id/block`: Hash speichern, Marke 2, Refresh-Token löschen, in einer Transaktion; doppelt → 409 „Dieser Spieler ist bereits blockiert“, Admins → 400. Die Löschung selbst übernimmt der Inaktivitäts-Handler aus sh-AP-06 (Marke 2).
  - Gesperrte Adressen → 400 „Die E-Mail-Adresse ist blockiert“ bei Registrierung, E-Mail-Änderung in den Einstellungen und Korrektur der unbestätigten Adresse.
  - `PATCH /auth/admin/users/:id/deletion-forbidden` mit `{ forbidden: boolean }` setzt Marke 3 bzw. hebt sie auf (andere Marken bleiben unverändert); der Spielerantrag scheitert dann wie bisher.
  - Spielerliste: `blocked` im Listen-DTO, Status „Blockiert, zur Löschung freigegeben“/„Löschverbot“, rot umrandetes „Blockieren“ mit Bestätigungsdialog, Umschalter „Löschverbot“.
  - Tests: `email-blocklist.service.spec.ts`, `auth-admin-block.service.spec.ts`, `admin-users.spec.tsx`; die fünf Integrationsspecs mit `NODE_ENV=production` erhalten einen Test-Pepper.
  - Gates: Lint 0 Fehler (keine neuen Warnungen), Typecheck und Build grün, Backend-Unit 2098/2098, Frontend grün, Integration 703/703.
