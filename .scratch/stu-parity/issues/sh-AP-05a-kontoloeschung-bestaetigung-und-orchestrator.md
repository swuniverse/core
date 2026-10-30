# Kontolöschung: Bestätigung, Sperre und Lösch-Orchestrator

**Status:** claimed
**Priority:** P2
**Size:** M
**Blocked by:** —

## Ziel

Der Löschantrag wird per E-Mail-Token bestätigt, danach ist der Login gesperrt und das Konto zur Löschung vorgesehen. Ein `PlayerDeletionService` führt die Löschung über registrierbare Domänen-Handler aus (Port-Muster wie bei der Allianzbereinigung); ein Admin kann sie sofort auslösen. Kanonisch auch für soc-H4 (Teil a und Orchestrator aus Teil b).

Vorgabe gemäß Leitplanke 4: Bestätigungsmail und Ausführung stehen hinter `ACCOUNT_DELETION_ENABLED` (Default `false`). Bei ausgeschaltetem Flag bleibt der heutige Antrag (Marke 1) bestehen, es wird nichts verschickt und nichts gelöscht.

## STU-Quellen

- `src/Module/PlayerSetting/Action/DeleteAccount`
- `src/Component/Player/Deletion/Confirmation/RequestDeletionConfirmation.php`
- `src/Module/Index/Action/DeletionConfirmation/DeletionConfirmation.php`
- `src/Component/Player/Deletion/PlayerDeletion.php` (Handler-Schleife), `Handler/PlayerDeletionHandlerInterface.php`
- `src/Module/PlayerSetting/Lib/UserConstants.php` (`DELETION_REQUESTED=1`, `CONFIRMED=2`, `FORBIDDEN=3`, `EXECUTED=4`)
- `src/Lib/Session/SessionLogin.php#checkUser` („Dein Spieleraccount ist zur Löschung vorgesehen“)

## SWU-Pfade

- `apps/backend/src/modules/settings/settings.service.ts#requestDeletion`, `settings.controller.ts`
- `apps/backend/src/modules/auth/auth.service.ts` (zentraler Zugangshaken aus sh-AP-09), Token-Dienst aus sh-AP-01 (Zweck `ACCOUNT_DELETION`)
- neues Modul z. B. `apps/backend/src/modules/account-deletion/*` (`PlayerDeletionService`, Handler-Token `PLAYER_DELETION_HANDLERS`)
- `apps/backend/src/modules/mail/mail.service.ts`
- `packages/shared/src/lib/auth/index.ts` (Konstanten der Löschmarken)
- `apps/frontend/src/pages/settings.tsx` (Abschnitt „Konto löschen“), neue öffentliche Seite `confirm-deletion.tsx`, `apps/frontend/src/app/app.tsx`, `apps/frontend/src/pages/admin-users.tsx`

## Akzeptanzkriterien

- [ ] Löschmarken als benannte Konstanten (1 beantragt, 2 bestätigt, 3 verboten, 4 ausgeführt) statt Magic Numbers.
- [ ] Flag an: Der Antrag (Passwort bestätigt) setzt Marke 1 und verschickt eine Mail mit Link `<APP_BASE_URL>/confirm-deletion?token=…` (Gültigkeit 48 h). Die Bestätigung setzt Marke 2. Ungültiger Token → 400.
- [ ] Solange Marke 1 gilt, kann der Spieler den Antrag in den Einstellungen zurückziehen (Marke 0). Marke 3 (Löschverbot) blockiert den Antrag wie heute.
- [ ] Login und Refresh mit Marke 2 werden über den Zugangshaken aus sh-AP-09 mit 403 „Dein Spieleraccount ist zur Löschung vorgesehen“ abgelehnt; das Refresh-Token wird bei Bestätigung gelöscht.
- [ ] `PlayerDeletionService.delete(userId)` ruft alle registrierten Handler in definierter Reihenfolge in einer Transaktion auf, löscht danach den Benutzer und ist idempotent (unbekannter Benutzer: No-Op). Handler implementieren ein Interface `PlayerDeletionHandler { order; delete(tx, userId) }`.
- [ ] Admin-Endpunkt `POST /auth/admin/users/:id/delete` (nur Admin, nur bei Flag an, nicht für Admins und nicht bei Marke 3) führt die Löschung sofort aus; Button mit Bestätigungsdialog in `admin-users.tsx`.
- [ ] Solange die Domänen-Handler aus sh-AP-05b/05c/05d fehlen, verhindern Fremdschlüssel keine Ausführung im Test, weil der Test nur einen Benutzer ohne Spielinhalte löscht; die Ausführung bei Spielern mit Inhalten wird erst durch diese Issues freigegeben (Admin-Endpunkt lehnt Konten mit Kolonien oder Schiffen bis dahin mit 409 ab).
- [ ] `GET /auth/features` liefert `accountDeletion: boolean`.
- [ ] Backend-Tests: Token-Ablauf, Widerruf, Login-Sperre, Handler-Reihenfolge, Idempotenz, Flag aus. Frontend-Tests: Bestätigungsseite, Widerruf-Button.

## Comments

- 2026-10-27: Erneuter Abbruch gemäß Prüfregel. Der vorgeschriebene Befehl `npx nx affected -t lint typecheck test --base=HEAD` führt direkt nach dem Claim-Commit keine Tasks aus (`NX No tasks were run`), weil noch keine Produktänderungen vorliegen; der Build ist grün. Die bereits dokumentierte unabhängige Gesamtsuite-Störung wurde zwar mit Commit `55e320f` adressiert, aber ohne bestätigte Test-Seams kann die umfangreiche Kontolöschungsänderung nicht regelkonform test-first begonnen werden. Bitte die öffentlichen Test-Seams bestätigen (Settings-Service/API für Antrag/Widerruf, Auth-API für Bestätigung/Adminlöschung, Login/Refresh-Zugangshaken, `PlayerDeletionService`, React-Seiten) oder eine Ausnahme von der Seam-Bestätigung vorgeben.

- 2026-10-27: Abbruch nach zwei ernsthaften Prüfversuchen. Der vollständige Backend-Testlauf ist unabhängig von diesem Issue rot: `spacecraft-destruction.service.spec.ts` erwartet für das intakte Modul Commodity `10101`, die aktuelle Implementierung liefert `10201`. Produktcode wurde gemäß Abbruchregel verworfen. Bitte festlegen bzw. den bestehenden Test/Spieldaten-Stand auflösen, damit die verpflichtende Gesamtsuite grün werden kann.
- 2026-10-30 Product Owner: Option 1. Das M-Issue wird vollständig wieder freigegeben. Der frühere Baseline-Fehler ist mit Commit `55e320f` behoben; Ralph bestätigt die dokumentierten Test-Seams nach der aktuellen autonomen Regel selbst. Verbindlich sind ein separater, einmaliger Token-Zweck `ACCOUNT_DELETION` mit 48 Stunden Gültigkeit, Ersetzen eines älteren Lösch-Tokens ohne Beeinflussung von Passwort-Reset-Tokens und eine sichtbare HTTP-400-Fehlermeldung bei ungültigen oder abgelaufenen Tokens. Marke 1 erlaubt Login und Widerruf, Marke 2 sperrt Login und Refresh. Das Issue ist `ready-for-agent`.
