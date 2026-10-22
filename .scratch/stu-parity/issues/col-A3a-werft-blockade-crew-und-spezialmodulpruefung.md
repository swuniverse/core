# Werft: Blockade-, Crew-Maximum- und Spezialmodulprüfung im Backend

**Status:** resolved
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

- [x] Bau und Umrüstung werden mit verständlicher Meldung abgelehnt, wenn die Kolonie blockiert ist (`isBlockaded`).
- [x] Bau, Bauplananlage und Umrüstung werden abgelehnt, wenn der berechnete Crewbedarf das Crew-Maximum des Rumpfs überschreitet („Crew-Maximum wurde überschritten“).
- [x] Bau, Bauplananlage und Umrüstung werden abgelehnt, wenn mehr Spezialmodule gewählt sind, als der Rumpf `specialSlots` hat.
- [x] Das Frontend zeigt die Backend-Meldung im Modulbildschirm und sperrt den Bauknopf weiterhin vorab.
- [x] `docs/ship-build-job-followup.md` beschreibt den aktuellen Stand (oder wird als überholt markiert).
- [x] Backend-Tests (`colony-shipyard`-Spec): je ein Ablehnungsfall für Blockade, Crew-Maximum und Spezialmodule sowie ein Gutfall.
- [x] Frontend-Test: Fehlermeldung aus der API wird im Modulbildschirm angezeigt.

## Comments

- Backend-Prüfungen für Blockade, Crew-Maximum und Spezialslot-Kapazität gelten für Bau, Bauplananlage und Umrüstung; die UI zeigt API-Fehler weiterhin im Modul-Designer. Queue-Dokumentation und Regressionstests wurden aktualisiert.
- Verifikation: gezielte Backend- und Frontend-Tests sowie `npx nx run-many --targets=build` grün. Der verpflichtende Affected-Lauf bleibt wegen bestehender, issue-fremder `backend:typecheck`-Fehler (TS6305/TS7006 in zahlreichen unveränderten Specs) rot.
