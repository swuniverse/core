# Bojen im UI: auslegen, aufnehmen, anzeigen

**Status:** ready-for-agent
**Priority:** P2
**Size:** M
**Blocked by:** —

## Ziel

Bojen sind im Backend vollständig vorhanden (sc-WP-SENS-1), für Spieler aber unerreichbar: Kein Frontend-Code ruft die Bojen-Endpunkte auf oder zeigt `buoys` an. Wie STU sollen Spieler Bojen im Informationsblock setzen, im Sektor-Scan und Feldkontext sehen, analysieren und aufnehmen sowie eine Bojenliste unter der Schiffsliste sehen.

## STU-Quellen

- `src/html/spacecraft/control/control_mid.twig` („Boje setzen“, `B_DROP_BOUY`)
- `src/html/spacecraft/sectorScan.twig` (Bojentabelle mit „Boje aufbringen“)
- `src/html/ship/analysebuoy.twig`, `src/Module/Spacecraft/View/ShowAnalyseBuoy/ShowAnalyseBuoy.php`
- `src/Module/Spacecraft/Action/DropBuoy/DropBuoy.php`, `src/Module/Spacecraft/Action/TakeBuoy/`
- `src/html/view/shiplist.twig` → `src/html/buoylist.twig`, `src/Module/Ship/View/ShowBuoyList/ShowBuoyList.php`
- `src/Public/static/js/buoy.js`

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/spacecraft.controller.ts` (`GET/POST :id/buoys`, `POST :id/buoys/:buoyId/pick-up`, Z. ~995–1020)
- `apps/backend/src/modules/spacecraft/spacecraft-scan.service.ts` (`buoys` im Sektor-Scan)
- `packages/shared/src/lib/spacecraft/index.ts` (`buoys` in Sektor-Scan- und Feldkontext-DTO, Z. ~715, ~952; `SpacecraftBuoyDto`)
- `apps/frontend/src/components/spacecraft/FieldContextPanel.tsx` (Informationsblock, `SectorScanDialog`)
- `apps/frontend/src/pages/spacecraft.tsx` (Schiffsliste, Bojenliste darunter)

## Akzeptanzkriterien

- [ ] Im Feldkontext gibt es „Boje setzen“ mit Texteingabe (1–60 Zeichen); Fehlergründe des Backends (keine Bojenware, Rampe defekt, Limit 16, zu wenig EPS) werden angezeigt.
- [ ] Bojen am Feld erscheinen im Feldkontext und im Sektor-Scan als Tabelle (Eigner, Text, Datum) mit „Boje aufbringen“ (1 EPS) für jedes Schiff am Feld.
- [ ] Bojen lassen sich analysieren (Text/Eigner wie `analysebuoy.twig`), ohne das Feld verlassen zu müssen.
- [ ] Unter der Schiffsliste steht wie STU eine Bojenliste der eigenen Bojen mit Position.
- [ ] Nach Setzen/Aufnehmen aktualisieren sich Feldkontext, Sektor-Scan, Lager und EPS ohne Reload.
- [ ] Frontend-Tests (Vitest/Testing Library) für Setzen, Anzeige im Sektor-Scan, Aufnehmen und Bojenliste; Backend-Test, falls für die Bojenliste ein neuer Endpunkt nötig ist.

## Herkunft

- Audit 2026-11-17: [README.md](../audit-2026-11-17/README.md) Abschnitt A („Bojen auslegen/aufnehmen/anzeigen“) und D; [spacecraft.md](../audit-2026-11-17/spacecraft.md) große Abweichung 1, Seitenabgleich „Sektor-Scan“ und „Schiffsliste“.
- Resolved-Ticket mit nicht erfüllter Akzeptanz: [sc-WP-SENS-1](sc-WP-SENS-1-bojen.md) („Frontend-Test deckt Anzeige und Aktionen ab“ trifft nicht zu; Feature-Commit `5408d3ca` ohne Frontend-Datei).

## Comments
