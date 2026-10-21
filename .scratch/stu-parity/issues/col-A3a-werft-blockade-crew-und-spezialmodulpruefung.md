# Werft: Blockade-, Crew-Maximum- und Spezialmodulprüfung im Backend

**Status:** ready-for-agent
**Priority:** P1
**Size:** S
**Blocked by:** —

## Ziel

Beim Schiffsbau prüft SWU heute weder eine Kolonieblockade noch serverseitig das Crew-Maximum (nur das Frontend färbt rot) noch die Anzahl der Spezialmodule gegen den Rumpf. STU lehnt den Bau in allen drei Fällen ab. Diese Prüfungen sind reine Regelkorrektheit und schließen eine Umgehung über die API.

## STU-Quellen

- `src/Module/Colony/Action/BuildShip/BuildShip.php` (Blockade Z. 107, Spezialmodule Z. 136–148 `getSpecialSlots`, Crew-Maximum Z. 173–178 „Crew-Maximum wurde überschritten“)
- `src/Module/Colony/Action/RetrofitShip/`
- `src/Component/Spacecraft/Crew/SpacecraftCrewCalculator.php` (`getCrewUsage`, `getMaxCrewCountByRump`)

## SWU-Pfade

- `apps/backend/src/modules/colony/colony-shipyard.service.ts` (`buildShip`, `buildShipFromBuildplan`, `queueShipRetrofit`, `validateModuleSelections`, `calculateCrewRequired`; Blockadeprüfung existiert bisher nur für Reparatur, Z. ~811)
- `game-data/data/ship-building/stu-rump-stats.yaml` (`specialSlots`), `stu-rump-crew.yaml`
- `apps/frontend/src/pages/colonies/components/PanelShipyard.tsx` (`ShipHullDesigner`: Fehlermeldungen anzeigen)
- `docs/ship-build-job-followup.md` (veraltet)

## Akzeptanzkriterien

- [ ] Bau und Umrüstung werden mit verständlicher Meldung abgelehnt, wenn die Kolonie blockiert ist (`isBlockaded`).
- [ ] Bau, Bauplananlage und Umrüstung werden abgelehnt, wenn der berechnete Crewbedarf das Crew-Maximum des Rumpfs überschreitet („Crew-Maximum wurde überschritten“).
- [ ] Bau, Bauplananlage und Umrüstung werden abgelehnt, wenn mehr Spezialmodule gewählt sind, als der Rumpf `specialSlots` hat.
- [ ] Das Frontend zeigt die Backend-Meldung im Modulbildschirm und sperrt den Bauknopf weiterhin vorab.
- [ ] `docs/ship-build-job-followup.md` beschreibt den aktuellen Stand (oder wird als überholt markiert).
- [ ] Backend-Tests (`colony-shipyard`-Spec): je ein Ablehnungsfall für Blockade, Crew-Maximum und Spezialmodule sowie ein Gutfall.
- [ ] Frontend-Test: Fehlermeldung aus der API wird im Modulbildschirm angezeigt.

## Comments
