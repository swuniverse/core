# RPG: Plots im Profil und RPG-Verhalten

**Status:** ready-for-agent
**Priority:** P3
**Size:** S
**Blocked by:** soc-E3a

## Ziel

Das Spielerprofil zeigt die Plots, in denen der Spieler Mitglied ist, sowie sein RPG-Verhalten. Die neue Einstellung `rpg_behavior` hat die STU-Werte „nicht gesetzt“, „betreibt gerne Rollenspiel“, „betreibt gelegentlich Rollenspiel“, „betreibt ungern Rollenspiel“.

## STU-Quellen

- `src/Module/Game/Lib/View/Provider/UserProfileProvider.php` (`RPG_PLOTS`)
- `src/html/view/userprofile.twig` (Abschnitt „Plots“)
- `src/Component/Player/UserRpgBehaviorEnum.php` (NOT_SET=0, ACTIVE=1, OPEN=2, NONE=3 mit Beschreibungstexten)
- `src/Module/PlayerSetting/Lib/UserSettingEnum.php` (`RPG_BEHAVIOR`)

## SWU-Pfade

- `apps/backend/src/modules/settings/settings.service.ts` (`SETTING_DEFAULTS`, Allowlist)
- `apps/backend/src/modules/database/database.service.ts` (`GET database/settlers/:id`) bzw. `rpg`-Endpunkt „Plots eines Spielers“
- `apps/frontend/src/pages/player-profile.tsx`, `apps/frontend/src/pages/settings.tsx`
- Enum `RpgBehavior` in `packages/shared`

## Akzeptanzkriterien

- [ ] Einstellung `rpg_behavior` mit Werten `0`–`3` (Default `0`), serverseitig gegen das Enum validiert, im Einstellungs-UI als Auswahl.
- [ ] Die Profil-API liefert `rpgBehavior`; das Profil zeigt bei gesetztem Wert den STU-Text (bei `0` nichts) als Icon/Text mit `title`.
- [ ] Profilbox „Plots“: Plots mit Mitgliedschaft (aktive zuerst, mit Link zur Plotdetailseite), „Keine“ wenn leer.
- [ ] Backend-Tests: Validierung der Einstellung, Plots eines Spielers. Frontend-Tests: Profilanzeige beider Elemente.

## Comments
