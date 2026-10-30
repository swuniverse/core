# Fraktionswählbarkeit in Admin und Onboarding

**Status:** ready-for-agent
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

- [ ] Die Fraktionsentität erhält per Migration `isSelectable` mit Default `true`; vorhandene Fraktionen werden als wählbar übernommen.
- [ ] Die Admin-API und -Oberfläche zeigen und ändern `isSelectable` mit bestehender Admin-Autorisierung.
- [ ] `POST onboarding/faction` lehnt eine nicht wählbare Fraktion mit stabiler, verständlicher Fehlermeldung ab; direkte Requests können die Sperre nicht umgehen.
- [ ] Das Onboarding zeigt nicht wählbare Fraktionen deaktiviert und erklärt den Grund.
- [ ] Bereits zugeordnete Spieler bleiben unverändert; `isSelectable` betrifft ausschließlich neue Fraktionswahlen.
- [ ] Es gibt weder `playerLimit` noch automatische Balancing-Sperren.
- [ ] Backend-Tests decken Migration, Adminänderung und serverseitige Sperre ab; Frontend-Tests decken Anzeige und deaktivierte Auswahl ab.

## Entscheidung

Option 1c: Ausschließlich ein administrativ gepflegtes `isSelectable`; keine Spielerbegrenzung und keine Balancing-Sperre.
