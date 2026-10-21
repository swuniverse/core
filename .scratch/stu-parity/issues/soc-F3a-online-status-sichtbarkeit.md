# Online-Status: öffentliche Online-Liste und Opt-out

**Status:** ready-for-agent
**Priority:** P3
**Size:** S
**Blocked by:** —

## Ziel

SWU zeigt die Online-Spieler allen (Dashboard-Widget „Zufällige Spieler (online)“, `GET database/online`). `CONTEXT.md` begrenzt den **Online-Status** auf Mitglieder derselben **Allianz**. STU zeigt den Status öffentlich mit Opt-out-Einstellung `SHOW_ONLINE_STATUS`. Der Widerspruch muss aufgelöst werden.

## STU-Quellen

- `src/Module/PlayerSetting/Lib/UserSettingEnum.php` (`SHOW_ONLINE_STATUS`)
- `src/Component/Player/Settings/UserSettingsProvider.php`
- `src/html/user/settings/*.twig`

## SWU-Pfade

- `apps/backend/src/modules/database/database.controller.ts` (`GET database/online`)
- `apps/backend/src/modules/dashboard/dashboard.service.ts` (`onlinePlayers`)
- `apps/frontend/src/pages/dashboard/DashboardLowerSections.tsx`
- `apps/backend/src/modules/settings/settings.service.ts`
- `CONTEXT.md` (Online-Status, aktiver Spieler)
- sh-AP-18 (rechte Spalte mit Online-Spielern)

## Akzeptanzkriterien

- [ ] Einstellung `show_online_status` (Default `'1'`); Spieler mit `'0'` erscheinen nicht in öffentlichen Online-Listen (`GET database/online`, Dashboard-Widget, sh-AP-18).
- [ ] `CONTEXT.md` (Online-Status) wird angepasst: öffentlich sichtbar, sofern der Spieler ihn nicht abschaltet; in der Mitgliederübersicht der Allianz weiterhin sichtbar.
- [ ] Backend- und Frontend-Tests.

## Entscheidung

Vorgabe: Variante (a). Öffentliche Online-Listen bleiben; Einstellung `show_online_status` (Default `'1'`) als Opt-out. `CONTEXT.md` wird angepasst: Online-Status öffentlich, sofern nicht abgeschaltet; Mitgliederübersicht unverändert.

## Comments

- 2026-10-21 Product Owner: Option a – Die öffentliche Online-Liste bleibt mit STU-Opt-out `show_online_status`; `CONTEXT.md` wird entsprechend angepasst.
