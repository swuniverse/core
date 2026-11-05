# RPG: Plots im Profil und RPG-Verhalten

**Status:** resolved
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

- [x] Einstellung `rpg_behavior` mit Werten `0`–`3` (Default `0`), serverseitig gegen das Enum validiert, im Einstellungs-UI als Auswahl.
- [x] Die Profil-API liefert `rpgBehavior`; das Profil zeigt bei gesetztem Wert den STU-Text (bei `0` nichts) als Text mit `title`.
- [x] Profilbox „Plots“: Plots mit Mitgliedschaft (aktive zuerst, mit Link zur Plotdetailseite), „Keine“ wenn leer.
- [x] Backend-Tests: Validierung der Einstellung, Plots eines Spielers. Frontend-Tests: Profilanzeige beider Elemente.

## Comments

- Verifiziert: Einstellungs- und Profiltests grün (Backend 49 Tests, Frontend 17 Tests), PostgreSQL-Profilintegration 2 Tests, TypeScript-Builds für Shared, Backend und Frontend sowie ESLint für alle geänderten Quell- und Testdateien erfolgreich. Nx-Projektgraph war wegen fehlendem `node_modules/.modules.yaml` nicht verfügbar; direkte Builds/Tests wurden verwendet.
