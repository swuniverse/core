# Station: LSS-Karte und Sensorphalanx-Scan

**Status:** ready-for-agent
**Priority:** P2
**Size:** M
**Blocked by:** —

## Ziel

Stationen haben in SWU keine LSS-Karte, weil `NavigationPanel` für `kind === 'STATION'` nicht gerendert wird. Der Systemsensorscan `POST :id/system-field-scan` existiert, hat aber keinen Frontend-Aufrufer. Eine Sensorphalanx hat für Spieler so keinen Mehrwert. STU zeigt bei Stationen die LSS; ein Klick auf ein Feld öffnet den Sensorscan (Feld + NBS des Zielfelds) und lädt den Systemsensorscan.

## STU-Quellen

- `src/html/spacecraft/spacecraft.twig` (Stationszweig mit `control_nav`)
- `src/html/station/sensorScan.twig`, `src/Module/Station/View/ShowSensorScan/`, `src/Module/Station/View/ShowSystemSensorScan/`
- `src/Public/static/js/spacecraft.js` (Z. ~64–95, `SHOW_SENSOR_SCAN`, `SHOW_SYSTEM_SENSOR_SCAN`)

## SWU-Pfade

- `apps/frontend/src/pages/spacecraft-detail.tsx` (Z. ~217, `NavigationPanel` nur für Nicht-Stationen)
- `apps/frontend/src/components/spacecraft/NavigationPanel.tsx`, `LssMap.tsx`
- `apps/frontend/src/components/spacecraft/ship-action-registry.ts` (Z. ~188–196, `system-field-scan` als „planned“)
- `apps/backend/src/modules/spacecraft/spacecraft.controller.ts` (`POST :id/system-field-scan`, Z. ~1046)
- `apps/backend/src/modules/spacecraft/spacecraft-scan.service.ts` (Z. ~273)

## Akzeptanzkriterien

- [ ] Stationen zeigen die LSS-Karte (ohne Flugsteuerung, Klickflug und Blindflug).
- [ ] Bei einer Sensorphalanx öffnet ein Klick auf ein LSS-Feld den Sensorscan wie STU: Feldinfo und NBS des Zielfelds; Systemfelder laden zusätzlich den Systemsensorscan über `system-field-scan`.
- [ ] Kosten, Reichweite und Voraussetzungen kommen aus dem Backend; Fehlermeldungen werden angezeigt. Andere Stationsrollen sehen die LSS ohne Phalanx-Scan.
- [ ] `ship-action-registry.ts` führt die Aktion nicht mehr als „planned“.
- [ ] Frontend-Tests für LSS an Stationen und Sensorscan-Aufruf; Backend-Test, falls DTO/Endpunkt angepasst wird.

## Herkunft

- Audit 2026-11-17: [README.md](../audit-2026-11-17/README.md) Abschnitt A („Station: LSS-Karte, Sensorphalanx-Scan“) und D; [spacecraft.md](../audit-2026-11-17/spacecraft.md) große Abweichung 4, Seitenabgleich „Navigation/LSS“, „Station Sensorscan“.
- Resolved-Ticket mit nicht erfüllter Akzeptanz: [sc-WP-STAT-2](sc-WP-STAT-2-stationsansicht-und-liste.md) (Kriterium „Sensorstationen bieten Sensorscan … und Systemsensorscan … wie STU“).

## Comments
