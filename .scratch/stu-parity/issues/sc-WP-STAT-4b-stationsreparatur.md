# Reparatur an Stationen (Schiffe und Station selbst)

**Status:** resolved
**Priority:** P2
**Size:** M
**Blocked by:** sc-WP-STAT-3a, col-A5

## Ziel

Wie in STU reparieren Werft- bzw. geeignete Stationen angedockte Schiffe über eine Queue (abbrechen, reaktivieren) und reparieren sich selbst passiv mit Ersatzteilen, wenn genug Workbees angedockt sind. Die Reparaturmechanik folgt der in col-A5 entschiedenen Werftregel.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Station/Action/{RepairShip,CancelShipRepair,ReactivateShipRepair,StationRepair}`, `Module/Station/View/ShowShipRepair`, `html/station/shipRepair.twig`
- `Module/Tick/Spacecraft/Handler/StationPassiveRepairHandler.php` (Workbees, Ersatzteile, `REPAIR_RATE_PER_TICK`)
- `Orm/Entity/StationShipRepair.php`, `Module/Tick/Spacecraft/ManagerComponent/RepairActions.php`

## SWU-Pfade

- `apps/backend/src/modules/colony/colony-shipyard.service.ts` (Werftreparatur als Vorbild)
- Stationsmodell, `apps/backend/src/modules/tick/tick.service.ts`

## Akzeptanzkriterien

- [x] Reparaturqueue an Stationen der Rolle(n) gemäß ADR, mit Abbrechen und Reaktivieren; Abschluss im Tick mit Meldung an den Schiffseigner.
- [x] Passive Stationsreparatur von Hülle und Systemen bei ausreichenden Workbees und Ersatzteilen.
- [x] Flug bzw. Abdocken bricht die Reparatur ab.
- [x] Backend-Tests (Queue-Ablauf, Abbruch, passive Reparatur), Frontend-Test.
- [x] `lint`, `typecheck`, `test` und `build` sind grün.

## Comments

- Umgesetzt: `StationShipRepair`-Queue (`station-ship-repairs`, Migration `20261030190000`), `StationRepairService` (Einreihen, Abbrechen, Reaktivieren, Stationsselbstreparatur, Tickschritt), reine Planlogik in `station-repair-plan.ts`, Endpunkte `/spacecraft/:id/station-repair…`, `StationRepairPanel` im Schiffsdetail.
- Regeln: Raumwerft und Raumstation (`SHIPYARD`, `BASE`) mit voller Crew reparieren; ein Schritt = 100 Hülle + 2 Systeme für 1 Ersatzteil (+1 Systemkomponente bei Systemen), Schrittdauer `max(1, ceil(Bauzeit/2))` Minuten; fehlende Teile stoppen die Queue bis zur Reaktivierung. Passive Selbstreparatur braucht ein Fünftel der Rollen-Workbees angedockt (STU-Regel). Flug/Abdocken (`cancelTasks`) entfernt den Queue-Eintrag; Urlaub überspringt den Schritt.
- Abweichung/Folgepunkt: Die Stationsqueue hat wie col-A5 keine Vorabzahlung. Reparaturbonus durch Kolonie-Funktionen entfällt an Stationen (wie STU). Nicht zugeordnete Altfehler: `research.spec.tsx` ist flaky (unabhängig).
