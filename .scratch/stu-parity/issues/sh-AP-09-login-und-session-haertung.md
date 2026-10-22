# Login- und Session-Härtung

**Status:** claimed
**Priority:** P1
**Size:** S
**Blocked by:** —

## Ziel

Die Anmeldung wird sicherer und STU-näher: kein Start ohne `JWT_SECRET` in Produktion, serverseitiger Logout, ein zentraler Zugangshaken für Login und Refresh (für Sperre, Löschung, Verifikation aus späteren Issues) und Login wahlweise per Spieler-ID.

## STU-Quellen

- `src/Lib/Session/SessionLogin.php` (Login per ID oder Login-Name, `checkUser`)
- `src/Module/Game/Action/Logout`

## SWU-Pfade

- `apps/backend/src/modules/auth/jwt.strategy.ts` (`|| 'fallback'`), `apps/backend/src/modules/game-status/game-status.guard.ts` (`|| 'fallback'`), `apps/backend/src/modules/auth/auth.module.ts`
- `apps/backend/src/modules/auth/auth.service.ts#login`, `#refresh`, `#assertGameAccess`, `auth.controller.ts`, `dto/login.dto.ts`
- `apps/frontend/src/components/layout/header.tsx#handleLogout`, `apps/frontend/src/stores/auth.store.ts`, `apps/frontend/src/pages/login.tsx`

## Akzeptanzkriterien

- [ ] Ein gemeinsamer Helfer liefert das JWT-Secret für Strategy, Modul und Guard; ohne `JWT_SECRET` startet das Backend bei `NODE_ENV=production` nicht (klare Fehlermeldung), sonst Warnung im Log mit Entwicklungs-Default. Kein Literal `'fallback'` mehr im Code.
- [ ] `POST /auth/logout` (eingeloggt) löscht das gespeicherte Refresh-Token; ein danach genutztes Refresh-Token liefert 401. Der Header-Logout ruft den Endpunkt auf und räumt den Client auch bei Netzwerkfehler auf.
- [ ] Ein zentraler Haken `assertAccountAccess(user)` läuft in `login` und `refresh` (vor `assertGameAccess`) und ist über registrierbare Prüfungen erweiterbar (z. B. Injection-Token `ACCOUNT_ACCESS_CHECKS`), damit sh-AP-08a (Sperre), sh-AP-05a (Löschung) und sh-AP-03 (Verifikation) eigene Prüfungen mit Fehlercode einhängen; ohne Prüfungen keine Verhaltensänderung.
- [ ] Login akzeptiert im Feld Benutzername auch die Spieler-ID: Erst exakter Login-Name (case-insensitiv), sonst bei rein numerischer Eingabe die ID. Fehlermeldung bleibt einheitlich „Invalid credentials“. Platzhalter im Login-Feld „Login-Name oder Spieler-ID“.
- [ ] Backend-Tests: Start ohne Secret in Produktion schlägt fehl, Logout invalidiert Refresh, Login per ID, numerischer Benutzername hat Vorrang vor ID, registrierte Prüfung blockiert Login und Refresh. Frontend-Test: Logout ruft den Endpunkt.

## Comments
