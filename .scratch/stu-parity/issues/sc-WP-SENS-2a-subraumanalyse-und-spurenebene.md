# Subraumanalyse und Subraumspuren-Ebene im LSS

**Status:** needs-info
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

- [ ] Laufzeitsystem für den Subraumsensor aus dem Modul; ohne Modul keine Ebene.
- [ ] Bei aktivem Sensor liefert die Local-Map je Feld die Spurrichtungen fremder Signaturen (ohne eigene); `LssMap` zeichnet sie als Linien.
- [ ] Subraumanalyse auf ein Schiff (aus Sektor-Scan) markiert dessen Spur im Sensorbereich; EPS-Kosten wie STU.
- [ ] Backend-Tests (Ebene nur mit Sensor, eigene Spuren ausgeblendet), Frontend-Test.
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Comments

- 2026-10-29: Blockiert durch eine widersprüchliche Modulspezifikation: Das Issue nennt „Subraumsensor (bzw. Matrixsensoren, Modul 19008)“, fordert aber zugleich „Laufzeitsystem für den Subraumsensor aus dem Modul“. STU behandelt `SubspaceSensorShipSystem` und `MatrixScannerShipSystem` als verschiedene Systeme, während SWU nur das Fabrication-Item `module.special.matrixsensoren` (19008) sowie den unabhängig definierten `Hyperraumfeldscanner` kennt. Bitte festlegen, welches bestehende SWU-Modul das neue Laufzeitsystem tragen soll (19008 Matrixsensoren oder Hyperraumfeldscanner) und ob beide STU-Systeme bewusst zu einem SWU-System zusammengeführt werden. Ohne diese Entscheidung würden Modulidentität, Aktivierung und Balancing eigenmächtig festgeschrieben.
