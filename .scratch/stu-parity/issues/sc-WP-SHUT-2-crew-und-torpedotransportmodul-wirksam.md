# Crewtransport- und Torpedotransportmodul wirksam machen

**Status:** resolved
**Priority:** P3
**Size:** S
**Blocked by:** —

## Ziel

Die Spezialmodule „Crewtransport-Modul“ (19005) und „Torpedotransportmodul“ (19009) sind in `game-data` beschrieben und als Fabrikationsitems vorhanden, ihre Werte (`baseCrewCapacity`, `torpedoStorageBonus`) wirken laut Audit aber nicht. Entscheidungsfreier Teil von WP-SHUT-1.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Component/Spacecraft/System/Type/{TroopQuartersShipSystem,TorpedoStorageShipSystem}.php`
- `Lib/Crew/TroopTransferUtility.php` (freie Quartiere)

## SWU-Pfade

- `game-data/data/modules/special.yaml`, `game-data/data/fabrication/stu-fabrication.yaml` (`module.special.crewtransport-modul`, `module.special.torpedotransportmodul`)
- `game-data/data/ship-building/stu-special-module-audit.md`
- `apps/backend/src/modules/spacecraft/spacecraft-crew.service.ts`, `spacecraft-torpedo.service.ts` (`getCapacity`), `spacecraft-stats.service.ts`
- `apps/backend/src/modules/colony/colony-shipyard.service.ts` (Slotregeln für SPECIAL)

## Akzeptanzkriterien

- [x] Prüfen und ggf. herstellen, dass beide Module in der Werft wählbar und fabrizierbar sind (Audit aktualisieren).
- [x] Verbautes Crewtransport-Modul erhöht die Crewkapazität für Transporte um `baseCrewCapacity × Level`-Regel gemäß Moduldaten.
- [x] Verbautes Torpedotransportmodul erhöht die Torpedokapazität um `torpedoStorageBonus`.
- [x] Backend-Tests für beide Effekte.
- [x] `lint`, `typecheck`, `test` und `build` sind grün.

## Comments

Crew- und Torpedotransportmodule nutzen die vorhandenen SPECIAL-Slots und Fabrication-Items. Ihre Kapazitätsboni sind zentral in der Schiffsstatistik beziehungsweise Torpedolagerkapazität wirksam und durch Backend-Tests abgedeckt.
