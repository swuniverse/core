# Einstellung „Login nicht speichern“

**Status:** ready-for-agent
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
