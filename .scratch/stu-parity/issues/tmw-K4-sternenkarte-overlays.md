# Overlays der Sternenkarte: Territorium, Unpassierbar, Feldeffekte, Sensorabdeckung

**Status:** ready-for-agent
**Priority:** P2
**Size:** M
**Blocked by:** —

## Ziel

Die Sternenkarte erhält die STU-Umschalter für die Overlays Territorium (Einflussgebiete in Allianz- bzw. Fraktionsfarbe), unpassierbare Felder, Feldeffekte und eigene Sensorabdeckung. Dazu kommen die Knöpfe „Einpassen“ und „Aktualisieren“. Der Einfluss-Service existiert im Backend bereits, das Frontend nutzt ihn aber noch nicht.

## STU-Quellen

- `src/html/view/map.twig` (Checkboxen der Overlays)
- `src/Module/Starmap/View/ShowUserStarmapRealtime/ShowUserStarmapRealtime.php` (`buildSensorCoverage`)
- `src/Lib/Map/VisualPanel/Layer/DataProvider/Border/*`

## SWU-Pfade

- Backend: `apps/backend/src/modules/starmap/influence.service.ts`, `starmap.controller.ts` (`GET layers/:layerId/influence/:sectorX/:sectorY` ~Z. 634, `GET layers/:layerId/fields`), `apps/backend/src/modules/spacecraft/spacecraft.controller.ts` (`starmap-contacts`), `spacecraft.service.ts#getSensorRange`
- Allianzfarbe: `.scratch/alliance-stu-parity` (Ticket 06, Territorialfarbe)
- Frontend: `apps/frontend/src/pages/starmap.tsx`, `apps/frontend/src/components/starmap/StarmapCanvas.tsx`, `StarmapControlPanel.tsx`, `StarmapShipOverlay.tsx`

## Akzeptanzkriterien

- [ ] Im Kontrollpanel gibt es vier Checkboxen: „Territorium“, „Unpassierbar“, „Feldeffekte“, „Sensorabdeckung“. Der Zustand bleibt je Browser erhalten (localStorage).
- [ ] „Territorium“ färbt die Felder mit Einfluss nach Allianz- bzw. Fraktionsfarbe als halbtransparente Fläche mit Grenzlinie. Geladen wird nur für sichtbare Sektoren, und es erscheinen nur erkundete Felder (Nebel des Krieges).
- [ ] „Unpassierbar“ markiert erkundete unpassierbare Felder. „Feldeffekte“ markiert erkundete Felder, deren Feldtyp Effekte hat, mit einem Tooltip, der die Effektnamen nennt.
- [ ] „Sensorabdeckung“ zeigt die LSS-Reichweite aller eigenen (und mit Allianz geteilten, laut Beziehungsauflösung) Schiffe als Fläche. Das Backend liefert dafür Position und Reichweite je Kontakt (`starmap-contacts` erweitern) und gibt keine fremden Reichweiten ohne Berechtigung heraus.
- [ ] „Einpassen“ zentriert und zoomt auf die erkundete Ausdehnung der Ebene. „Aktualisieren“ lädt Felder, Kontakte und Overlays neu.
- [ ] Backend-Tests: Die Sensorreichweite im Kontakt-DTO respektiert die Beziehungsauflösung, und der Einfluss-Endpunkt filtert unerkundete Felder. Frontend-Tests (`starmap.spec.tsx`): Umschalter blenden die Overlays ein und aus, „Einpassen“ setzt den Viewport.

## Comments
