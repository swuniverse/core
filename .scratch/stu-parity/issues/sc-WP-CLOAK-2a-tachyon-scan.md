# Tachyon-Scan: getarnte Schiffe aufdecken

**Status:** claimed
**Priority:** P3
**Size:** S
**Blocked by:** sc-WP-CLOAK-1a, sc-WP-NAV-2a

## Ziel

Ein Schiff mit Tachyon-Scanner (SW-Name wählt der Agent nach Leitplanke 2) macht für eine begrenzte Zeit getarnte Schiffe in seiner LSS-Reichweite sichtbar (STU „tachyonFresh“); der Sektor-Scan zählt getarnte Signaturen.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Spacecraft/Action/DoTachyonScan`, `Component/Spacecraft/System/Type/TachyonScannerShipSystem.php`
- `Module/Spacecraft/Lib/Ui/PanelLayerConfiguration.php` (`addShipCountLayer($tachyonFresh, ...)`)
- `Component/Ship/FlightSignatureVisibilityEnum.php` (`SIG_VISIBILITY_CLOAKED`)

## SWU-Pfade

- `packages/shared/src/lib/spacecraft/index.ts`, `spacecraft-runtime-state.service.ts`
- `apps/backend/src/modules/spacecraft/spacecraft-scan.service.ts`, `spacecraft.service.ts` (LSS)
- `game-data/data/modules/` (Submodul)
- `apps/frontend/src/components/spacecraft/SensorOperationsPanel.tsx`, `LssMap.tsx`

## Akzeptanzkriterien

- [ ] Modul, Laufzeitsystem und SW-Name existieren; Entscheidung in `map.md`.
- [ ] Aktion „Tachyon-Scan“ kostet EPS wie STU, setzt einen Zeitstempel; für die STU-Dauer zeigt die LSS getarnte Schiffe in Reichweite in der Zählung.
- [ ] `fadedSignatures.cloaked` im Sektor-Scan wird nach STU-Fenster (18 h) befüllt.
- [ ] Backend-Tests (Sichtbarkeit nur innerhalb der Dauer), Frontend-Test.
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Comments
