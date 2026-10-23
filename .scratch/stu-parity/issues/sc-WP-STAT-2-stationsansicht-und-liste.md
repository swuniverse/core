# Stationsansicht, Stationsliste und Stationssensoren

**Status:** claimed
**Priority:** P2
**Size:** M
**Blocked by:** sc-WP-STAT-1b

## Ziel

Stationen erhalten wie in STU eine Detailansicht (Kopf, Lager, Module, NBS, Liste angedockter Schiffe), eine Stationsliste und die Scans der Sensorstation (Sensorscan, Systemsensorscan). Wiederverwendung der Schiffskomponenten.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Station/View/{ShowStation,ShowStationInfo,ShowStationShiplist,ShowSensorScan,ShowSystemSensorScan}`
- `html/station/{stationInfo,shipList,sensorScan,sectorScan,nbsBlock}.twig`, `html/view/stationList.twig`
- `Module/Station/Lib/SystemScanPanel.php`

## SWU-Pfade

- `apps/frontend/src/pages/spacecraft-detail.tsx`, `spacecraft.tsx` (Vorbilder), neue Seite bzw. Tab „Stationen“
- `apps/frontend/src/components/spacecraft/*` (Header, Lager, Module, NBS wiederverwenden)
- `apps/backend/src/modules/spacecraft/spacecraft.controller.ts`, `spacecraft-scan.service.ts`

## Akzeptanzkriterien

- [ ] Stationsliste mit STU-Spalten (Name, Klasse/Rolle, Position, Hülle, Schilde, EPS, Crew, Andockbelegung).
- [ ] Stationsansicht mit Kopf, Lager, Modulen, NBS-Liste und Liste angedockter Schiffe.
- [ ] Sensorstationen bieten Sensorscan (Feld mit Reichweite) und Systemsensorscan (ganzes System) wie STU.
- [ ] Navigation: Stationen fliegen nicht; Flugsteuerung ist ausgeblendet.
- [ ] Backend-Tests für Scans und Zugriffsschutz; Frontend-Tests für Liste und Ansicht.
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Comments
