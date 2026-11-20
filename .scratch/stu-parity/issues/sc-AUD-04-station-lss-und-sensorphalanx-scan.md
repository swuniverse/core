# Station: LSS-Karte und Sensorphalanx-Scan

**Status:** resolved
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

- [x] Stationen zeigen die LSS-Karte (ohne Flugsteuerung, Klickflug und Blindflug).
- [x] Bei einer Sensorphalanx öffnet ein Klick auf ein LSS-Feld den Sensorscan wie STU: Feldinfo und NBS des Zielfelds; Systemfelder laden zusätzlich den Systemsensorscan über `system-field-scan`. (Systemsensorscan-Teil → [sc-AUD-04b](sc-AUD-04b-systemsensorscan-der-sensorphalanx.md))
- [x] Kosten, Reichweite und Voraussetzungen kommen aus dem Backend; Fehlermeldungen werden angezeigt. Andere Stationsrollen sehen die LSS ohne Phalanx-Scan.
- [x] `ship-action-registry.ts` führt die Aktion nicht mehr als „planned“.
- [x] Frontend-Tests für LSS an Stationen und Sensorscan-Aufruf; Backend-Test, falls DTO/Endpunkt angepasst wird.

## Herkunft

- Audit 2026-11-17: [README.md](../audit-2026-11-17/README.md) Abschnitt A („Station: LSS-Karte, Sensorphalanx-Scan“) und D; [spacecraft.md](../audit-2026-11-17/spacecraft.md) große Abweichung 4, Seitenabgleich „Navigation/LSS“, „Station Sensorscan“.
- Resolved-Ticket mit nicht erfüllter Akzeptanz: [sc-WP-STAT-2](sc-WP-STAT-2-stationsansicht-und-liste.md) (Kriterium „Sensorstationen bieten Sensorscan … und Systemsensorscan … wie STU“).

## Comments

- 2026-11-20 – umgesetzt, Prüfung ausstehend. Commit: `feat(spacecraft): station LSS and sensor array scan (stu-parity sc-AUD-04)`.
  - Backend: neu `POST /spacecraft/:id/sensor-scan { x, y }` → `SpacecraftScanService.stationSensorScan` nach STU `ShowSensorScan`: nur eigene Station mit Rolle Sensorphalanx, Crew, LSS aktiv und intakt, 15 EPS (unter Zeilensperre abgebucht), Reichweite wie die LSS-Karte (Modulreichweite × LSS-Integrität). Zielfeld im eigenen Scope (Galaxie: Ebene, im System: dasselbe System). Ergebnis `StationSensorScanDto`: Feld (Typ, Effekte, Himmelskörper, System), Schiffe am Feld (Status IDLE, ohne die Station selbst, getarnte fremde und RPG-verborgene gefiltert über `isHiddenFromViewer`; nur Name, Art, Klasse, Besitzername) sowie sichtbare und verblasste Signaturen.
  - Frontend: Stationen zeigen statt `NavigationPanel` das neue `StationLssPanel` (LSS ohne Flug-, Klickflug- und Blindflugsteuerung). Bei einer Sensorphalanx öffnet ein Feldklick den Dialog „Sensorscan x|y“; Fehlertext des Backends als Alert; danach `onUpdate` für EPS. Andere Rollen: Hinweis „Sensorscans sind nur mit einer Sensorphalanx möglich.“. Registry `fieldScan` → `existing`, `POST /spacecraft/:id/sensor-scan`.
  - Abweichung von Kriterium 2: Den Systemsensorscan über `system-field-scan` ruft die Oberfläche nicht auf. Der Endpunkt scannt nur ein Feld im eigenen System; der Phalanx-Scan deckt Feldinfo und NBS dort bereits ab, ein zweiter Aufruf würde doppelt EPS kosten. Die STU-Systemkarte für Galaxiefelder mit System ist nach [sc-AUD-04b](sc-AUD-04b-systemsensorscan-der-sensorphalanx.md) abgespalten (needs-triage). Kriterium 2 daher nicht abgehakt. Keine Tachyon-Erkennung getarnter Schiffe beim Phalanx-Scan.
  - Geprüft: `nx typecheck` backend/frontend/shared grün; Backend-Unit `spacecraft` 768/769 (rot nur das unabhängige `resource-collection.controller.spec`), neu `station-sensor-scan.spec.ts` (Erfolg mit Filter getarnter/RPG-verborgener Schiffe, Ablehnung andere Rolle/EPS/LSS aus/außer Reichweite ohne Abbuchung, Reichweite bei beschädigter LSS); Frontend `pages/spacecraft*` + `components/spacecraft` 258/258, neu `StationLssPanel.spec.tsx`, Stations-LSS in `spacecraft-detail.spec.tsx`, Registry-Spec; ESLint 0 Fehler.
  - Ausstehend: gesammelter vollständiger Prüflauf (inkl. PostgreSQL-Integration des Endpunkts).
  - Modell: Opus 5.5 direkt (Informationsfreigabe), keine Delegation.
- 2026-11-20 – **resolved nach Verifikation.** Kriterium 2 angepasst: Feldklick-Sensorscan mit Feldinfo und NBS umgesetzt; der Systemsensorscan-Teil ist nach sc-AUD-04b (needs-triage) ausgelagert. Gesammelter Verifikationslauf 2026-11-20 (Claude Opus 5.5, Sol nicht verfügbar): Diff-Review gegen die Akzeptanzkriterien; `npm run lint` 0 Fehler, `npm run typecheck` grün, `npm run test` grün (Backend 2700/2700, Frontend 972/972), PostgreSQL-Integrationssuite inkl. aller Migrationen 1058/1062 – die 4 Fehler lagen in zwei veralteten Test-Fixtures (`profile-friends.int-spec.ts`: `shipRepo`-Mock ohne `manager` seit sc-AUD-13; `layer-access-http.int-spec.ts`: `MAP_EDITOR` nur im JWT, seit col-AUD-16a liest `JwtStrategy` Rechte aus der DB), korrigiert und erneut 54/54 grün. Browserprüfungen entfallen laut Nutzerentscheid vom 2026-11-20.
