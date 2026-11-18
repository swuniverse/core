# Shuttle-Management an Stationen

**Status:** ready-for-agent
**Priority:** P3
**Size:** M
**Blocked by:** —

## Ziel

An Stationen gibt es in SWU kein Shuttle-Management. `ShuttleService.transferStored` kennt nur den Kolonieorbit. In STU schiebt eine Station über das Schiffsmanagement Shuttles zwischen Stationslager und angedocktem Schiff hin und her. Fremde Schiffe dürfen dabei nur Shuttles erhalten, und ihr Eigner bekommt eine PM.

## STU-Quellen

- `src/Module/Station/Action/ManageShuttles/ManageShuttles.php` (Z. ~36–237, `B_MANAGE_SHUTTLES`)
- `src/Module/Station/View/ShowShuttleManagement/ShowShuttleManagement.php`
- `src/Module/Colony/Lib/ShuttleManagementItem.php`
- `src/html/ship/management/management.twig` (Z. ~118, Einstieg), `src/Public/static/js/shipmanagement.js` (Z. ~59–63)

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/shuttle.service.ts` (`transferStored`, Z. ~156–167)
- `apps/backend/src/modules/spacecraft/shuttle.controller.ts`
- `apps/backend/src/modules/spacecraft/station-ship-management.service.ts`, `spacecraft.controller.ts` (`:id/ship-management`, Z. ~1711)
- `apps/frontend/src/components/spacecraft/StationShipManagementPanel.tsx`, `apps/frontend/src/pages/colonies/components/OrbitalManagementPanel.tsx` (Z. ~140–148)

## Akzeptanzkriterien

- [ ] Backend: Shuttle-Transfer Station ↔ angedocktes Schiff mit STU-Regeln (Kapazität der Shuttlerampe/Rumpfplätze wie sc-WP-SHUT-1, Lagergrenzen, nur Shuttle-Waren); an fremde Schiffe nur Hinzufügen, nicht Entnehmen; PM an den fremden Eigner.
- [ ] Ansicht je angedocktem Schiff mit aktuellem und maximalem Shuttlebestand je Typ und Stationsbestand, wie `ShowShuttleManagement`.
- [ ] Einstieg aus dem Schiffsmanagement der Station; gilt für alle Stationsrollen mit Schiffsmanagement wie STU.
- [ ] Backend-Tests (eigen/fremd, Kapazität, Lager); Frontend-Test für den Dialog.

## Herkunft

- Audit 2026-11-17: [README.md](../audit-2026-11-17/README.md) Abschnitt H („An Stationen gibt es kein Shuttle-Management“); [spacecraft.md](../audit-2026-11-17/spacecraft.md) Seitenabgleich „Schiffsmanagement an der Station“, kleine Abweichungen und Unsicherheiten „Shuttle-Management an Stationen“.
- PO-Linie „wie STU“ vom 2026-11-17; bisher kein Ticket. [sc-WP-STAT-4a](sc-WP-STAT-4a-schiffsmanagement-an-station.md) (resolved) enthält keinen Shuttle-Transfer.

## Comments
