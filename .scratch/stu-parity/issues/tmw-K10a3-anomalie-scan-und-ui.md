# Anomalien: Scan- und UI-Verträge

**Status:** ready-for-agent
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

- [ ] Lokaler Sternenscan, Feldkontext und Kolonie-Umgebungsscan liefern aktive Anomalien mit stabilem Typ, Name und Restdauer.
- [ ] Die LSS-Karte rendert Anomalien mit dem vorgesehenen Icon; Feldkontext und Umgebungsscan zeigen Name und Restdauer.
- [ ] Fehlende Anomalie-Assets werden dokumentiert und führen nicht zu einem UI-Fehler.
- [ ] Backend-Tests decken die Anomalieverträge aller drei Scan-/Kontextpfade ab; Frontend-Tests decken Darstellung in `LssMap` und `FieldContextPanel` ab.
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Entscheidung

Anomalien werden im lokalen Scan, Feldkontext und Kolonie-Umgebungsscan dargestellt. Die Oberflächen konsumieren die Backend-Verträge und duplizieren keine Typ- oder Lebensdauerlogik.

## Comments

- 2026-11-06: Drittes und letztes geordnetes Child aus `tmw-K10a`; setzt `tmw-K10a2` voraus.
