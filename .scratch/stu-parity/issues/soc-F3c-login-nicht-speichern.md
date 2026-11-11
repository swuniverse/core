# Einstellung „Login nicht speichern“

**Status:** claimed
**Priority:** P3
**Size:** S
**Blocked by:** —

## Ziel

STU erlaubt mit `SAVE_LOGIN`, die Anmeldung nicht dauerhaft zu speichern. In SWU persistiert der Zustand-Store `auth.store.ts` Access- und Refresh-Token im `localStorage`. Mit der Option „Angemeldet bleiben“ beim Login (bzw. der Einstellung) werden Tokens nur für die Browsersitzung (`sessionStorage`) gehalten.

## STU-Quellen

- `src/Module/PlayerSetting/Lib/UserSettingEnum.php` (`SAVE_LOGIN`)
- `src/Lib/Session/SessionLogin.php`
- `src/html/index/index.twig` (Login-Formular)

## SWU-Pfade

- `apps/frontend/src/stores/auth.store.ts` (`persist`)
- `apps/frontend/src/pages/login.tsx`
- optional `apps/backend/src/modules/settings/settings.service.ts` (`save_login`)
- Bezug: sh-AP-09 (Session-Härtung)

## Akzeptanzkriterien

- [ ] Login-Formular hat die Checkbox „Angemeldet bleiben“ (Default an, bisheriges Verhalten).
- [ ] Ohne Häkchen werden Tokens nur im `sessionStorage` gehalten und sind nach Schließen des Browsers weg; mit Häkchen wie bisher im `localStorage`.
- [ ] Logout leert beide Speicher.
- [ ] Die Wahl wird lokal gemerkt (kein Serverzwang); eine Serverseite ist nicht nötig.
- [ ] Frontend-Tests: Speicherort je Option, Logout leert beide.

## Comments

- 2026-10-29: Umsetzung und fokussierte Frontend-Tests waren erfolgreich, aber die Pflichtprüfung `npx nx affected -t lint typecheck test --base=HEAD` scheitert nach zwei ernsthaften Versuchen an bereits bestehenden Frontend-Typecheck-Fehlern (u. a. `database.tsx:1015` Faction-Typfehler und zahlreiche TS6305-Fehler zu fehlenden Declaration-Ausgaben). `npx nx run-many --targets=build` ist grün. Bitte den Frontend-Typecheck-Basiszustand reparieren oder bestätigen, dass diese bekannten Fehler für diesen Durchlauf ausgenommen werden dürfen. Produktcode wurde gemäß Abbruchregel verworfen.
- 2026-11-09: Die integrierte Baseline 14b86081/c8e14f1c beseitigt den zuletzt dokumentierten fachfremden Blocker (Frontend-Faction-/TS6305-Gate); reguläre Nx-Lint-/Typecheck-/Build-Gates und vollständige Tests sind laut Baseline-Review grün, lokale Test-Spieldaten waren dafür vorhanden. Status ready-for-agent; vorhandene Issue-Abhängigkeiten bleiben verbindlich. Dies belegt keine Feature-Fertigstellung: verworfene Änderungen müssen neu umgesetzt und die aktuellen Issue-Tests und Pflicht-Gates erneut ausgeführt werden; keine Ausnahme.
