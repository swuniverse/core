# Flottenandocken und -abdocken schiffsweise wie STU

**Status:** resolved
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

- [x] Flottenandocken durch den Leader läuft schiffsweise: Bereits angedockte überspringen; Tarnung, fehlende Crew, laufende Reparatur/Umrüstung (wird abgebrochen) überspringen das Schiff mit Grund; EPS-Mangel oder volle Dockplätze brechen ab, bereits angedockte bleiben angedockt.
- [x] Beim Andocken werden Schilde und Hyperantrieb des Schiffs abgeschaltet (wie bisher).
- [x] Neuer Endpunkt „Station dockt Flotte“ (eigene Station, eigene Flotte am Feld, Stationscrew ausreichend, Station ungeschildet): Station zahlt 1 EPS je Schiff, sonst gleiche Schleifenregeln.
- [x] Flottenabdocken schiffsweise mit 1 EPS je Schiff und Grund je Schiff.
- [x] `SpacecraftDockResultDto` liefert eine Liste `{ shipId, name, docked|skipped|aborted, reason }`; das UI zeigt sie.
- [x] Nebenläufigkeit: Sperren pro Schiff bzw. Flotte so, dass Teilergebnisse konsistent persistiert werden (PostgreSQL-Integrationstest).
- [x] Backend-Tests für jeden Grund und Abbruch, Station-dockt-Flotte mit Stations-EPS; Frontend-Test für die Teilergebnisanzeige.

## Herkunft

- Audit 2026-11-17: [README.md](../audit-2026-11-17/README.md) Abschnitte K2 und N2 („Flottenandocken atomar“); [spacecraft.md](../audit-2026-11-17/spacecraft.md) „Bewusste/entschiedene Abweichungen“ und große Abweichung 6 (Station dockt Flotte).
- PO-Entscheidung K2 vom 2026-11-17: wie STU, schiffsweise mit Teilergebnis. Ersetzt die `map.md`-Entscheidung sc-WP-STAT-3a vom 2026-10-30 („Atomare Flottenaktionen statt STU-Teilergebnissen“); betrifft [sc-WP-STAT-3a](sc-WP-STAT-3a-andocken-und-abdocken.md).

## Answer

Flotten docken und docken schiffsweise wie STU (`fleetDock`, `DockFleet`, `UndockShip`): Leader zuerst, übersprungene Schiffe mit Grund, EPS-Mangel oder volle Dockplätze brechen ab und lassen bereits gedockte Schiffe stehen. Reparatur/Umrüstung wird abgebrochen (Schiff überspringt beim eigenen Andocken/Abdocken, dockt beim Stationsandocken trotzdem). Neuer Endpunkt `POST /spacecraft/:stationId/dock-fleet/:fleetId`, Station zahlt 1 EPS je Schiff. `SpacecraftDockResultDto.ships[]` liefert `{ shipId, name, status, reason }`, angezeigt über `DockResult` in `DockingPanel` und NBS. Sperren aufsteigend nach ID über alle beteiligten Zeilen, keine zusätzliche Flottenzeilen-Sperre (Deadlock-Risiko, siehe `fleet-lock.ts`). Verborgene RPG-Szenenschiffe werden aus Flottenläufen ausgelassen. Einzelschiff-Andocken unverändert. map.md-Entscheidung sc-WP-STAT-3a als ersetzt markiert.

## Comments

- Der `map.md`-Eintrag wird vom umsetzenden Agenten bzw. Maintainer angepasst, nicht in diesem Ticket vorab.
- 2026-11-20 – Anschluss aus sc-AUD-06: Die NBS-Flottenkopfzeile (`NearbySensorPanel`, `fleets[]` im Nearby-DTO) ist fertig; die Aktion „andocken“ für eine eigene Station dort nachrüsten, sobald der Endpunkt steht.
- 2026-11-20 – umgesetzt, Prüfung ausstehend (Commit „feat(spacecraft): dock fleets ship by ship like STU (stu-parity sc-AUD-11, sc-AUD-06)“). Modell: Claude Opus 5.5 direkt (Sol/Luna nicht verfügbar; Transaktionen/Nebenläufigkeit, daher nicht delegiert).
  - `SpacecraftDockingService`: Flottenandocken durch den Leader schiffsweise nach STU `fleetDock` (Leader zuerst; angedockt → übersprungen; Crew fehlt → übersprungen; Schiffs-EPS fehlt → Abbruch; getarnt → übersprungen; SWU-Regeln Feld/Status/Andockrechte/Stationsschilde → übersprungen mit Grund; Reparatur/Umrüstung wird abgebrochen und das Schiff übersprungen; volle Dockplätze → Abbruch). Einzelschiff-Andocken unverändert.
  - Neuer Endpunkt `POST /spacecraft/:stationId/dock-fleet/:fleetId` nach STU `DockFleet`: eigene Station, eigene Flotte mit Leader am Feld, Stationscrew, Station ungeschildet; Station zahlt 1 EPS je Schiff (Abbruch bei Mangel); Reparatur/Umrüstung wird abgebrochen, das Schiff dockt trotzdem (wie STU).
  - Flottenabdocken schiffsweise nach STU `UndockShip` (Crew → übersprungen, EPS → Abbruch, Reparatur/Umrüstung → abgebrochen und übersprungen).
  - `SpacecraftDockResultDto.ships[]` mit `{ shipId, name, status: docked|undocked|skipped|aborted, reason }`; Anzeige über neue `DockResult`-Komponente in `DockingPanel` und `NearbySensorPanel`.
  - Werft-Reparatur/Umrüstung-Abbruch aus `BattlePreparationService` in `shipyard-job-cancel.ts` herausgelöst (Kampf weiter mit NOWAIT, Docking blockierend).
  - Sperren: alle beteiligten Schiffe inkl. Station in einer Abfrage aufsteigend nach ID (wie bisher im Service), Flottenmitgliedschaft aus den gesperrten Zeilen. Bewusst keine zusätzliche Flottenzeilen-Sperre: Sie würde gegenüber Schiff-zuerst-Schreibern ein Deadlock-Risiko einführen (siehe `fleet-lock.ts`).
  - `map.md`-Entscheidung sc-WP-STAT-3a als ersetzt markiert.
  - Checks: `spacecraft-docking.service.spec.ts` 37/37 (alle Gründe, Abbruch EPS/Dockplätze, Station-dockt-Flotte mit Stations-EPS, Abdocken schiffsweise); neuer PostgreSQL-Test `spacecraft-docking.int-spec.ts` 3/3, dreimal hintereinander (Teilpersistenz bei EPS-Abbruch, Stations-EPS, gleichzeitiges Flotten- und Einzelandocken überfüllt keine Dockplätze und Rückmeldung = DB); `ColonyShipBuildQueue` in die Integrations-DataSource aufgenommen. Frontend `DockingPanel.spec.tsx`/`NearbySensorPanel.spec.tsx` 29/29. `npm run test` komplett grün (Backend 2691, Frontend 968), `nx build` shared/backend/frontend grün, verwandte Integrationssuiten 23/23.
  - Ausstehend: separater Prüflauf.
- 2026-11-20 – Prüflauf bestanden (Claude Opus 5.5; Sol/Luna nicht verfügbar). Diff gegen alle Kriterien geprüft, Fokus Rechte, Grenzfälle, Integration. Gefunden und behoben: Der RPG-Interceptor sperrt nur IDs aus der URL; verborgene RPG-Szenenschiffe in einer Flotte wären über Flottenandocken/„Station dockt Flotte“ mitbewegt worden. `fleetOrder` lässt sie jetzt still aus (keine Nennung im Ergebnis), Unit-Test „leaves hidden RPG scene members out …“. Nachlauf nach dem Fix: `spacecraft-docking.service.spec.ts` 38/38, `spacecraft-docking.int-spec.ts` 3/3, `nx typecheck backend` grün. Die übrigen Checks aus der Umsetzung (komplette Unit-Suiten, Build, verwandte PostgreSQL-Suiten) blieben gültig, da sich nur dieser Filter geändert hat.
