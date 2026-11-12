# Anomalien: Scan- und UI-Verträge

**Status:** resolved
**Priority:** P2
**Size:** S
**Blocked by:** tmw-K10a2

## Ziel

Macht aktive Anomalien in den Spieleroberflächen sichtbar. Backend und Datenverträge für den Anomalie-Kern sowie die Subraumellipse werden durch `tmw-K10a1` und `tmw-K10a2` bereitgestellt.

## STU-Quellen

- `src/Lib/Map/VisualPanel/Layer/Render/AnomalyLayerRenderer.php`
- `src/Module/Spacecraft/View/` (Anomalien im Feldkontext)
- `src/Module/Colony/View/` (Umgebungsscan)
- Assets `st-universe/assets/anomalies/1.png`, `2.png`

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/spacecraft.service.ts` (`getLocalMap`, `getFieldContext`)
- `apps/backend/src/modules/colony/colony-environment-scan.service.ts`
- `apps/frontend/src/components/spacecraft/LssMap.tsx`, `FieldContextPanel.tsx`
- Assets unter `swuniverse/assets/anomalies/`

## Akzeptanzkriterien

- [x] Lokaler Sternenscan, Feldkontext und Kolonie-Umgebungsscan liefern aktive Anomalien mit stabilem Typ, Name und Restdauer.
- [x] Die LSS-Karte rendert Anomalien mit dem vorgesehenen Icon; Feldkontext und Umgebungsscan zeigen Name und Restdauer.
- [x] Fehlende Anomalie-Assets werden dokumentiert und führen nicht zu einem UI-Fehler.
- [x] Backend-Tests decken die Anomalieverträge aller drei Scan-/Kontextpfade ab; Frontend-Tests decken Darstellung in `LssMap` und `FieldContextPanel` ab.
- [x] `lint`, `typecheck`, `test` und `build` sind grün.

## Entscheidung

Anomalien werden im lokalen Scan, Feldkontext und Kolonie-Umgebungsscan dargestellt. Die Oberflächen konsumieren die Backend-Verträge und duplizieren keine Typ- oder Lebensdauerlogik.

## Comments

- 2026-11-06: Drittes und letztes geordnetes Child aus `tmw-K10a`; setzt `tmw-K10a2` voraus.
- 2026-11-12: Umgesetzt. Vertrag `AnomalyViewDto { type, name, remainingTicks }` in `packages/shared` (`starmap/anomalies.ts`); `ColonyEnvironmentScanDto.anomalies` ergänzt um `name`/`remainingTicks`, `SpacecraftFieldContextDto.anomalies` neu, LSS-Felder (Galaxie und System) tragen `anomalies`. Backend: `AnomalyQueryService` liefert aktive Anomalien (`remainingTicks > 0`) je Ort bzw. je Galaxie-/Systemfeld; der Anzeigename kommt aus dem registrierten Handler (`SubspaceEllipseHandler.name = 'Subraumellipse'`, Fallback Typschlüssel). Eingebunden in `getLocalMap` (nur nicht geschwärzte Felder), `getFieldContext` und `ColonyEnvironmentScanService`. Frontend: `components/starmap/AnomalyMarker.tsx` legt das Icon `map/anomalies/<typ>.png` über das Feld (LSS und Kolonie-Sektorscan); Name und Restdauer in Tooltip/`aria-label`, im Feldkontext und als Liste unter dem Sektorscan. Fehlende Assets: `swuniverse/assets` enthält keine Anomalie-Grafiken; dokumentiert in `inventory/shell-admin-runtime.md` §3.6; bei Ladefehler erscheint ein CSS-Ring (keine Glyphe), kein UI-Fehler.
  - Prüfungen: HTTP-Integrationstest gegen das echte `AppModule` (`anomaly/anomaly-scan-http.int-spec.ts`: Galaxie-LSS, Feldkontext, System-LSS, Kolonie-Umgebungsscan, abgelaufene Anomalie ausgeblendet) plus bestehende Anomalie-Suiten: 4 Suiten/29 Tests grün. `nx run-many -t lint typecheck build -p shared backend frontend` grün (0 Fehler, Warnungen unverändert); Frontend 686/686; Backend 2007/2008 – einziger Ausfall erneut der lastbedingte Timeout in `password-reset.service.spec.ts`, isoliert grün (vgl. `sh-AP-22`).
- 2026-11-12: Folgepunkt erledigt. Auf Anweisung des Product Owners die STU-Grafiken `anomalies/1.png` (Subraumellipse, 74×30) und `2.png` (Ionensturm, für tmw-K10b) nach `swuniverse/assets` unter `map/anomalies/subspace_ellipse.png` bzw. `ion_storm.png` übernommen. Der Marker skaliert mit `object-contain`, damit die nicht quadratische Ellipse nicht beschnitten wird.
