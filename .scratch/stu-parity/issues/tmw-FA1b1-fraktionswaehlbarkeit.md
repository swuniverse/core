# Fraktionswählbarkeit in Admin und Onboarding

**Status:** resolved
**Priority:** P2
**Size:** S
**Blocked by:** tmw-FA1a

## Ziel

Administratoren können eine Fraktion für neue Spieler als nicht wählbar markieren. Das Onboarding zeigt den Zustand an und erzwingt ihn serverseitig. Spielerlimits werden nicht eingeführt.

## STU-Quellen

- `src/Orm/Entity/Faction.php` (`chooseable`, `player_limit`)
- `src/Module/Index/Action/Register/Register.php`

## SWU-Pfade

- `apps/backend/src/modules/faction/`
- `apps/backend/src/modules/onboarding/onboarding.controller.ts`, `onboarding.service.ts`
- `apps/frontend/src/pages/onboarding.tsx`
- bestehende Admin-Fraktionsoberfläche
- Shared-DTOs unter `packages/shared/`

## Akzeptanzkriterien

- [x] Die Fraktionsentität erhält per Migration `isSelectable` mit Default `true`; vorhandene Fraktionen werden als wählbar übernommen.
- [x] Die Admin-API und -Oberfläche zeigen und ändern `isSelectable` mit bestehender Admin-Autorisierung.
- [x] `POST onboarding/faction` lehnt eine nicht wählbare Fraktion mit stabiler, verständlicher Fehlermeldung ab; direkte Requests können die Sperre nicht umgehen.
- [x] Das Onboarding zeigt nicht wählbare Fraktionen deaktiviert und erklärt den Grund.
- [x] Bereits zugeordnete Spieler bleiben unverändert; `isSelectable` betrifft ausschließlich neue Fraktionswahlen.
- [x] Es gibt weder `playerLimit` noch automatische Balancing-Sperren.
- [x] Backend-Tests decken Migration, Adminänderung und serverseitige Sperre ab; Frontend-Tests decken Anzeige und deaktivierte Auswahl ab.

## Entscheidung

Option 1c: Ausschließlich ein administrativ gepflegtes `isSelectable`; keine Spielerbegrenzung und keine Balancing-Sperre.

## Comments

`isSelectable` wurde per Migration und Entity ergänzt, über eine admin-geschützte Faction-API samt `/admin/factions` pflegbar gemacht und im Onboarding server- sowie clientseitig erzwungen. Migration, Adminänderung, Sperre und deaktivierte Anzeige sind fokussiert getestet. Die vollständige betroffene Prüfung bleibt wegen bereits vorhandener, fachfremder Fehler in `wreck-decay`, `tutorial` und `spacecraft-core-controls` rot; Builds und fokussierte Tests sind grün.
