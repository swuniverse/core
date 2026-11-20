# Sensorphalanx: Systemsensorscan zeigt das ganze System eines Galaxiefelds

**Status:** needs-triage
**Priority:** P3
**Size:** M
**Blocked by:** sc-AUD-04

## Ziel

In STU lädt ein Sensorscan auf ein Galaxiefeld mit Sternensystem zusätzlich den Systemsensorscan (`SHOW_SYSTEM_SENSOR_SCAN`): eine Visual-Panel-Karte des ganzen Systems mit den dort sichtbaren Schiffen. SWU liefert seit sc-AUD-04 nur Feldinfo, Schiffe und Signaturen des angeklickten Feldes; der vorhandene `POST :id/system-field-scan` scannt nur ein Feld im eigenen System und passt nicht.

## STU-Quellen

- `src/Module/Station/View/ShowSystemSensorScan/ShowSystemSensorScan.php` (`createSystemScanPanel`, `tf`-Tachyonflag)
- `src/Public/static/js/spacecraft.js` (`showSectorScanWindow`, `loadSystemSensorScan`)

## Offene Fragen

- Kosten (STU: keine zusätzlichen über die 15 EPS des Sensorscans) und Sichtbarkeit getarnter Schiffe bei aktivem Tachyonscan.
- Wiederverwendung der SWU-Systemkarte (`LssMap` im `system`-Modus) für eine entfernte Station.

## Akzeptanzkriterien

- [ ] Sensorscan auf ein Galaxiefeld mit System zeigt zusätzlich die Systemkarte mit sichtbaren Schiffen.
- [ ] Getarnte/RPG-verborgene Schiffe bleiben verborgen; Backend- und Frontend-Tests.

## Herkunft

- Abgespalten bei der Umsetzung von [sc-AUD-04](sc-AUD-04-station-lss-und-sensorphalanx-scan.md) (2026-11-20).

## Comments
