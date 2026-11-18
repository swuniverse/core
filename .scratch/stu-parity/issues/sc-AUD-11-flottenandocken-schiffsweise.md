# Flottenandocken und -abdocken schiffsweise wie STU

**Status:** ready-for-agent
**Priority:** P2
**Size:** M
**Blocked by:** —

## Ziel

SWU dockt Flotten atomar an und ab (alles oder nichts, Entscheidung sc-WP-STAT-3a). STU arbeitet schiffsweise:
- Bereits angedockte Schiffe werden übersprungen.
- Getarnte Schiffe, Schiffe mit zu wenig Crew und Schiffe in Reparatur oder Umrüstung überspringen nur dieses Schiff; die Reparatur bzw. Umrüstung wird dabei abgebrochen.
- EPS-Mangel oder volle Dockplätze brechen die Schleife ab; bis dahin angedockte Schiffe bleiben angedockt.
- Die Rückmeldung nennt je Schiff den Grund.
- Dockt die Station eine Flotte an (`DockFleet`), zahlt die Station 1 EPS je Schiff.

Abdocken läuft ebenso schiffsweise mit 1 EPS.

## STU-Quellen

- `src/Module/Ship/Action/DockShip/DockShip.php` (Z. ~155–229)
- `src/Module/Station/Action/DockFleet/DockFleet.php` (Z. ~78–134, `fleetDock`)
- `src/Module/Ship/Action/UndockShip/UndockShip.php`
- `Spacecraft::SYSTEM_ECOST_DOCK = 1`

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/spacecraft-docking.service.ts` (`dock`, `undock`, `dockInTransaction` Z. ~122–235, `undockInTransaction`)
- `apps/backend/src/modules/spacecraft/spacecraft.controller.ts` (neuer Endpunkt „Station dockt Flotte“)
- `packages/shared/src/lib/spacecraft/index.ts` (`SpacecraftDockResultDto` mit Ergebnis je Schiff)
- `apps/frontend/src/components/spacecraft/DockingPanel.tsx`, `NearbySensorPanel.tsx` (Anzeige des Teilergebnisses)

## Akzeptanzkriterien

- [ ] Flottenandocken durch den Leader läuft schiffsweise: Bereits angedockte überspringen; Tarnung, fehlende Crew, laufende Reparatur/Umrüstung (wird abgebrochen) überspringen das Schiff mit Grund; EPS-Mangel oder volle Dockplätze brechen ab, bereits angedockte bleiben angedockt.
- [ ] Beim Andocken werden Schilde und Hyperantrieb des Schiffs abgeschaltet (wie bisher).
- [ ] Neuer Endpunkt „Station dockt Flotte“ (eigene Station, eigene Flotte am Feld, Stationscrew ausreichend, Station ungeschildet): Station zahlt 1 EPS je Schiff, sonst gleiche Schleifenregeln.
- [ ] Flottenabdocken schiffsweise mit 1 EPS je Schiff und Grund je Schiff.
- [ ] `SpacecraftDockResultDto` liefert eine Liste `{ shipId, name, docked|skipped|aborted, reason }`; das UI zeigt sie.
- [ ] Nebenläufigkeit: Sperren pro Schiff bzw. Flotte so, dass Teilergebnisse konsistent persistiert werden (PostgreSQL-Integrationstest).
- [ ] Backend-Tests für jeden Grund und Abbruch, Station-dockt-Flotte mit Stations-EPS; Frontend-Test für die Teilergebnisanzeige.

## Herkunft

- Audit 2026-11-17: [README.md](../audit-2026-11-17/README.md) Abschnitte K2 und N2 („Flottenandocken atomar“); [spacecraft.md](../audit-2026-11-17/spacecraft.md) „Bewusste/entschiedene Abweichungen“ und große Abweichung 6 (Station dockt Flotte).
- PO-Entscheidung K2 vom 2026-11-17: wie STU, schiffsweise mit Teilergebnis. Ersetzt die `map.md`-Entscheidung sc-WP-STAT-3a vom 2026-10-30 („Atomare Flottenaktionen statt STU-Teilergebnissen“); betrifft [sc-WP-STAT-3a](sc-WP-STAT-3a-andocken-und-abdocken.md).

## Comments

- Der `map.md`-Eintrag wird vom umsetzenden Agenten bzw. Maintainer angepasst, nicht in diesem Ticket vorab.
