# Tachyon-Scan: getarnte Schiffe aufdecken

**Status:** resolved
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

- [x] Modul, Laufzeitsystem und SW-Name existieren; Entscheidung in `map.md`.
- [x] Aktion „Tachyon-Scan“ kostet EPS wie STU, setzt einen Zeitstempel; für die STU-Dauer zeigt die LSS getarnte Schiffe in Reichweite in der Zählung.
- [x] `fadedSignatures.cloaked` im Sektor-Scan wird nach STU-Fenster (18 h) befüllt.
- [x] Backend-Tests (Sichtbarkeit nur innerhalb der Dauer), Frontend-Test.
- [x] `lint`, `typecheck`, `test` und `build` sind grün.

## Comments

Blocked after two serious validation attempts: the full backend suite has one unrelated pre-existing failure in `spacecraft-fleet.service.spec.ts` (`detaches an incapable member but blocks a fixed fleet`, `Not enough EPS for navigation`). Focused tachyon backend/frontend tests, affected lint/typecheck, and all builds pass. Product code was discarded per Ralph step 7; rerun after the backend baseline is green.
- 2026-11-09: Die integrierte Baseline 14b86081/c8e14f1c beseitigt den zuletzt dokumentierten fachfremden Blocker (Spacecraft-Flotten-Testbaseline); reguläre Nx-Lint-/Typecheck-/Build-Gates und vollständige Tests sind laut Baseline-Review grün, lokale Test-Spieldaten waren dafür vorhanden. Status ready-for-agent; vorhandene Issue-Abhängigkeiten bleiben verbindlich. Dies belegt keine Feature-Fertigstellung: verworfene Änderungen müssen neu umgesetzt und die aktuellen Issue-Tests und Pflicht-Gates erneut ausgeführt werden; keine Ausnahme.


## Answer

- SW-Äquivalent: **Gravitationswellenscanner**, angelehnt an die Erkennung getarnter Schiffe über Gravitationsanomalien. Modul, Warenname (STU-Ware 19003), Forschung (60400), Fertigungszuordnung und Laufzeitsystem `TACHYON_SCANNER` sind verdrahtet; Spieldaten-Commit `8180a0b`.
- Eigentümergeschützte Aktion `POST /spacecraft/:id/tachyon-scan`: installiertes aktives/intaktes System ohne Cooldown, einsatzbereites Schiff und ausreichende Crew/EPS. Transaktion mit Schiffssperre zieht **10 EPS** ab und speichert Scanzeit sowie Standort gemeinsam im vorhandenen Runtime-JSON. Aktives System verbraucht **3 EPS pro Tick**.
- **300 Sekunden**, exklusiv ab der Ablaufgrenze: getarnte Schiffe in der LSS-Reichweite zählen auf System- und Galaxiekarten mit. Schiffsdetails und NBS bleiben geschützt; bestehende Sensor-Feldeffekte gelten weiter. Erkennung ist an das scannende Schiff und den Scanstandort gebunden und endet auch bei deaktiviertem/zerstörtem Scanner. Die Karte lädt beim Scan und nach Ablauf neu.
- Sektor-Scans erhalten getarnte Flugsignaturen ausschließlich während aktiver Erkennung. Bestehende STU-Altersfenster bleiben erhalten: Klasse bis 12 h, danach `fadedSignatures.cloaked` bis ausschließlich **18 h**; ohne frischen Scan keine getarnten Spuren. Subraumanalyse erhält dadurch keine zusätzliche Freigabe.
- Tests prüfen Scannerinstallation und Zustand, Kosten/Crew/Eigentum/Standby, genaue Fünf-Minuten- und 18-h-Grenzen, beide LSS-Kartentypen ohne Detailpreisgabe sowie UI-Aktion und Ablaufaktualisierung. Echter PostgreSQL-Test bestätigt konkurrierende Scans: bei 10 EPS gelingt genau einer, ohne verlorene Abbuchung.

## Validation

- `npx nx affected -t lint typecheck test --base=HEAD --parallel=2`: grün; Backend **231 Suites / 2190 Tests**, Frontend **110 Dateien / 789 Tests**. Bestehende Lint-Warnungen ohne Fehler.
- `npx nx run backend:test-integration --runInBand --testPathPatterns=tachyon-scan`: grün, **1 PostgreSQL-Test** mit echten Migrationen.
- `npx nx run-many --targets=build`: grün für alle drei Projekte. Backend-Deklarationen danach mit `npx tsc --build apps/backend/tsconfig.json --emitDeclarationOnly --force` regeneriert.
- 2026-11-16: sc-WP-CLOAK-2a abgeschlossen auf `stu-parity`; getarnte Ziele angreifen bleibt sc-WP-CLOAK-2b.
