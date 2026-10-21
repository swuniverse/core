# Konstrukt zur Station ausbauen

**Status:** ready-for-agent
**Priority:** P2
**Size:** M
**Blocked by:** sc-WP-STAT-1a

## Ziel

Wie in STU wählt der Spieler am Konstrukt eine Stationsrolle bzw. -klasse; Pflichtmodule müssen im Lager liegen, genug Workbees angedockt sein, Ort und Limit passen. Der Bau läuft über Ticks (`UNDER_CONSTRUCTION`) und meldet Fortschritt und Abschluss.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Station/Action/BuildStation/BuildStation.php` (Typwahl, Limit, Ortsregel, angedockte Workbees, Module verbrauchen)
- `Module/Station/View/ShowStationCosts`, `html/station/stationCost.twig`
- `Module/Tick/Spacecraft/Handler/StationConstructionHandler.php`
- `Component/Station/{StationLocationEnum,StationUtility}.php`

## SWU-Pfade

- Stationsmodell aus sc-WP-STAT-0/1a
- `game-data/data/ship-building/ship-classes.yaml` (Stationsklassen je Fraktion und Rolle, Submodul)
- `apps/backend/src/modules/tick/tick.service.ts`
- Frontend: Konstrukt-Ansicht mit Kostenübersicht

## Akzeptanzkriterien

- [ ] Stationsklassen je Rolle und Fraktion in `game-data` gemäß ADR.
- [ ] `GET` Kostenübersicht je verfügbarer Klasse (Module, Workbees, Ortsregel, Limitstatus) wie `stationCost.twig`.
- [ ] Ausbau prüft Typwahl, Limit, Ort (im/über/außerhalb System, überall), angedockte Workbees und Module; verbraucht Module.
- [ ] Tick zählt Restticks herunter, pausiert ohne ausreichende Workbees (Meldung) und schließt mit voller Station ab (Werte aus Klasse).
- [ ] Backend-Tests je Prüfung und Tickverlauf; Frontend-Test Kostenansicht.
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Comments
