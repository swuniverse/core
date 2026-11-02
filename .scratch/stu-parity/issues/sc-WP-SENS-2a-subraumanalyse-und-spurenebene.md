# Subraumanalyse und Subraumspuren-Ebene im LSS

**Status:** resolved
**Priority:** P3
**Size:** M
**Blocked by:** sc-WP-NAV-2a

## Ziel

Übernimmt den LSS-Teil von tmw-K9: Ein Schiff mit Subraumsensor (bzw. Matrixsensoren, Modul 19008) zeigt im LSS die Flugspuren fremder Schiffe als Subraumspuren-Ebene; die Subraumanalyse verfolgt die Spur eines gewählten Schiffs. Ein SW-Name für den Sensor wird nach Leitplanke 2 in `map.md` festgehalten.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Spacecraft/Action/DoSubspaceAnalysis`, `Component/Spacecraft/System/Type/{SubspaceSensorShipSystem,MatrixScannerShipSystem}.php`, `html/spacecraft/system/subspaceScanner.twig`
- `Module/Spacecraft/Lib/Ui/PanelLayerConfiguration.php` (`addSubspaceLayer(..., IGNORE_USER)` bei aktivem Subraumsensor)
- `Lib/Map/VisualPanel/Layer/DataProvider/Subspace/*`, `Render/SubspaceLayerRenderer.php`

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/spacecraft.service.ts` (Local-Map/LSS), Signatur-Repository aus sc-WP-NAV-2a
- `packages/shared/src/lib/spacecraft/index.ts`, `spacecraft-runtime-state.service.ts`
- `game-data/data/modules/special.yaml`, `game-data/data/fabrication/stu-fabrication.yaml` (`module.special.matrixsensoren`)
- `apps/frontend/src/components/spacecraft/LssMap.tsx`, `SensorOperationsPanel.tsx`

## Akzeptanzkriterien

- [x] Ware/Modul 19007 `Hyperraumfeldscanner` bildet ein eigenes aktives Laufzeitsystem für Subraumspuren. Aktivierung kostet 30 EPS, laufender Betrieb 15 EPS je Tick; während Tarnung ist die Aktivierung verboten. Ohne intaktes und aktives 19007 gibt es keine Spurenebene.
- [x] Ware/Modul 19008 `Matrixsensoren` bleibt ein getrenntes passives System und wird nicht mit dem Hyperraumfeldscanner zusammengeführt.
- [x] Bei aktivem Hyperraumfeldscanner liefert die Local-Map je Feld die Spurrichtungen fremder Signaturen (ohne eigene); `LssMap` zeichnet sie als Linien.
- [x] Subraumanalyse auf ein Schiff aus dem Sektor-Scan erfordert aktives/intaktes 19007 und zusätzlich gesundes 19008, kostet beim Start 100 EPS und markiert dessen Spur im Sensorbereich.
- [x] Backend-Tests (Ebene nur mit Sensor, eigene Spuren ausgeblendet), Frontend-Test.
- [x] `lint`, `typecheck`, `test` und `build` sind grün.

## Entscheidung

SWU bewahrt STUs Zwei-System-Modell. Der `Hyperraumfeldscanner` 19007 ist das aktive Laufzeitsystem für Subraumspuren mit 30 EPS Aktivierung, 15 EPS Tick-Unterhalt und Tarn-Inkompatibilität. `Matrixsensoren` 19008 bleiben ein getrenntes passives System. Eine gezielte Subraumanalyse benötigt aktives/intaktes 19007 plus gesundes 19008 und kostet beim Start 100 EPS.

## Comments

- 2026-10-29: Blockiert durch eine widersprüchliche Modulspezifikation: Das Issue nennt „Subraumsensor (bzw. Matrixsensoren, Modul 19008)“, fordert aber zugleich „Laufzeitsystem für den Subraumsensor aus dem Modul“. STU behandelt `SubspaceSensorShipSystem` und `MatrixScannerShipSystem` als verschiedene Systeme, während SWU nur das Fabrication-Item `module.special.matrixsensoren` (19008) sowie den unabhängig definierten `Hyperraumfeldscanner` kennt. Bitte festlegen, welches bestehende SWU-Modul das neue Laufzeitsystem tragen soll (19008 Matrixsensoren oder Hyperraumfeldscanner) und ob beide STU-Systeme bewusst zu einem SWU-System zusammengeführt werden. Ohne diese Entscheidung würden Modulidentität, Aktivierung und Balancing eigenmächtig festgeschrieben.
- 2026-10-30 Product Owner: Option 1. Das STU-Zwei-System-Modell bleibt erhalten: 19007 `Hyperraumfeldscanner` wird das aktive Subraumspuren-System mit 30 EPS Aktivierung, 15 EPS je Tick und Aktivierungssperre während Tarnung; 19008 `Matrixsensoren` bleibt passiv. Gezielte Subraumanalyse erfordert aktives/intaktes 19007 sowie gesundes 19008 und kostet 100 EPS beim Start. Beide bestehenden SWU-Module und Forschungswege bleiben damit fachlich eigenständig.
- 2026-11-02: Getrennte Laufzeitsysteme, Subraumspuren-Overlay und gezielte Analyse in Backend, Shared DTOs und `LssMap` umgesetzt. Fokussierte Tests, Lint, Typecheck und vollständiger Build sind grün; bestehende projektweite Testfixture-Baseline bleibt außerhalb dieses Issues.
