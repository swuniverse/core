# Admin: Spielerliste und Spielersperre

**Status:** claimed
**Priority:** P2
**Size:** M
**Blocked by:** sh-AP-09

## Ziel

Die Admin-Benutzerseite wird zur STU-Spielerliste (ID, Name, Fraktion, Registrierung, letzte Aktivität, Urlaub, Löschmarke, Sperre). Admins können Spieler für n Hauptticks mit Grund sperren und entsperren; der Haupttick zählt die Sperren herunter, und ein gesperrter Spieler sieht beim Login Resttick und Grund.

## STU-Quellen

- `src/Module/Admin/View/Playerlist`, `src/Module/Admin/Lib/UserlistEntry.php`, `src/html/admin/playerList.twig`
- `src/Module/Admin/Action/LockUser.php`, `UnlockUser.php`, `src/Module/Admin/View/ShowUserLock`, `src/html/admin/userLock.twig`
- `src/Orm/Entity/UserLock.php` (`remaining_ticks`, `reason`, `former_user_id`)
- `src/Module/Tick/TickManager.php#reduceUserLocks`
- `src/Lib/Session/SessionLogin.php#checkUser` („Dein Spieleraccount ist noch für %d Ticks gesperrt. Begründung: %s“), `src/html/index/accountLocked.twig`

## SWU-Pfade

- `apps/backend/src/modules/auth/auth.controller.ts` (`admin/users`), `auth.service.ts` (Zugangshaken aus sh-AP-09)
- neue Entity z. B. `apps/backend/src/modules/auth/user-lock.entity.ts` mit Migration
- `apps/backend/src/modules/tick/tick.service.ts#handleTick`
- `apps/frontend/src/pages/admin-users.tsx`, `apps/frontend/src/pages/login.tsx`
- `packages/shared/src/lib/auth/index.ts` (DTOs, Fehlercode z. B. `ACCOUNT_LOCKED`)

## Akzeptanzkriterien

- [ ] `GET /auth/admin/users` liefert zusätzlich Fraktion, `createdAt`, `lastActiveAt`, Urlaubsstatus, Löschmarke und aktive Sperre (Restticks, Grund); Sortierung nach ID, Suche nach Name/ID.
- [ ] `POST /auth/admin/users/:id/lock` (Ticks ≥ 1, Grund Pflicht, max. 500 Zeichen) legt eine Sperre an oder überschreibt sie; `DELETE …/lock` hebt sie auf. Admins können nicht gesperrt werden.
- [ ] Eine Sperre löscht das Refresh-Token; Login und Refresh liefern 403 mit Code `ACCOUNT_LOCKED`, Restticks und Grund. Laufende Access-Tokens enden spätestens nach 15 min (kein zusätzlicher Check je Request nötig).
- [ ] Jeder erfolgreiche Haupttick zählt aktive Sperren um 1 herunter; bei 0 ist die Sperre beendet (Eintrag bleibt für die Historie oder wird gelöscht, konsistent dokumentiert).
- [ ] Login-Seite zeigt bei `ACCOUNT_LOCKED` „Dein Spieleraccount ist noch für n Ticks gesperrt. Begründung: …“.
- [ ] Spielerliste im Tabellenstil (UI-Konventionen 3.4), Datumswerte über `formatDateTime`, Aktionen Sperren/Entsperren mit Dialog; die bestehende Rechteverwaltung (MAP_EDITOR) bleibt erhalten.
- [ ] Backend-Tests: Sperren, Entsperren, Admin nicht sperrbar, Tick-Herunterzählen, Login-Ablehnung mit Daten. Frontend-Tests: Liste, Sperrdialog, Login-Meldung.

## Comments
