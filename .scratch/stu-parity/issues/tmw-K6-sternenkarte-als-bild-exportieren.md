# Sternenkarte als Bild und Daten exportieren

**Status:** ready-for-agent
**Priority:** P3
**Size:** S
**Blocked by:** —

## Ziel

Spieler können ihre persönliche Sternenkarte (erkundete Felder einer Ebene, eigene Kolonien) als PNG-Bild und als Datendatei (JSON) herunterladen, wie in STU. Der Export enthält nur Wissen, das der Spieler ohnehin sieht.

## STU-Quellen

- `src/Module/Starmap/View/ShowUserStarmapImage/*`
- `src/Module/Starmap/View/ShowUserStarmapData/*`

## SWU-Pfade

- `apps/backend/src/modules/starmap/starmap.controller.ts` (`GET layers/:layerId/fields`, `layers/:layerId/exploration`), `exploration.service.ts`
- `apps/frontend/src/pages/starmap.tsx`, `apps/frontend/src/components/starmap/StarmapCanvas.tsx`
- Bestehender Admin-Layer-Export als Vorbild (`starmap-admin.service.ts`)

## Akzeptanzkriterien

- [ ] `GET starmap/layers/:layerId/export.json` liefert die erkundeten Felder des Spielers (Koordinaten, Feldtyp, System-ID/-Name bei FULL-Erkundung) und keine unerkundeten Daten. Es gibt eine Ratenbegrenzung (z. B. einmal pro Minute).
- [ ] Im Kontrollpanel der Sternenkarte stehen die Knöpfe „Als Bild speichern“ (PNG aus dem Canvas, ganze erkundete Ausdehnung, ohne Overlays von Fremdschiffen) und „Daten exportieren“ (JSON-Download).
- [ ] Backend-Test: Der Export enthält nur erkundete Felder, und der Nebel bleibt gewahrt. Frontend-Test: Beide Knöpfe lösen den Download aus (gemockt).

## Comments
