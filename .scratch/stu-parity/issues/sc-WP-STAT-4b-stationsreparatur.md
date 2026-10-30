# Reparatur an Stationen (Schiffe und Station selbst)

**Status:** claimed
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

- [ ] Reparaturqueue an Stationen der Rolle(n) gemäß ADR, mit Abbrechen und Reaktivieren; Abschluss im Tick mit Meldung an den Schiffseigner.
- [ ] Passive Stationsreparatur von Hülle und Systemen bei ausreichenden Workbees und Ersatzteilen.
- [ ] Flug bzw. Abdocken bricht die Reparatur ab.
- [ ] Backend-Tests (Queue-Ablauf, Abbruch, passive Reparatur), Frontend-Test.
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Comments
