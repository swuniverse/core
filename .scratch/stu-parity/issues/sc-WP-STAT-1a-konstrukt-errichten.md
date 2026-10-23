# Konstrukt vom Schiff errichten

**Status:** claimed
**Priority:** P2
**Size:** M
**Blocked by:** sc-WP-STAT-0

## Ziel

Wie in STU errichtet ein Schiff mit Workbees im Lager und Baumaterial ein Konstrukt am aktuellen Feld; die Workbees starten als eigene Schiffe und docken am Konstrukt an. Ein Konstrukt kann wieder entfernt werden.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Ship/Action/BuildConstruction/BuildConstruction.php` (5 Workbees, Baumaterial 100 + Duranium 50; Prüfungen: Feld erlaubt Stationsbau, kein Wurmloch, keine Station am Feld, Konstrukt-Limit, Shuttle-Rampe intakt, EPS, nicht getarnt, nicht im Warp, Schilde aus; Dockrecht für Eigner)
- `Component/Spacecraft/System/Type/ConstructionHubShipSystem.php`
- `Module/Station/Action/Scrapping` (Konstrukt entfernen)

## SWU-Pfade

- Stationsmodell gemäß ADR aus sc-WP-STAT-0
- `apps/backend/src/modules/spacecraft/spacecraft.service.ts`, `spacecraft.controller.ts`
- `game-data/data/ship-building/ship-classes.yaml` (Workbee-Klassen, Konstrukt-Klasse), `game-data/data/commodities/stu-commodity-map.yaml` (Baumaterial, Durastahl-Legierung)
- `apps/frontend/src/components/spacecraft/FieldContextPanel.tsx`

## Akzeptanzkriterien

- [ ] Datenmodell und Migration für Stationen/Konstrukte gemäß ADR.
- [ ] Aktion „Konstrukt errichten“ mit allen STU-Prüfungen (inkl. Feldeffekt „kein Stationsbau“, sobald tmw-K3c Daten liefert) und Kosten; Workbees werden als Schiffe erzeugt und angedockt.
- [ ] Limit je Spieler gemäß ADR.
- [ ] Konstrukt entfernen (Eigner, Bestätigung) gibt Workbees frei.
- [ ] Konstrukte erscheinen in NBS-Liste und Sternkarte für Berechtigte.
- [ ] Backend-Tests je Prüfung; Frontend-Test für Aktion.
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Comments
