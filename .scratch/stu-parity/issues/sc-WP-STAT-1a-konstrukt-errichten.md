# Konstrukt vom Schiff errichten

**Status:** resolved
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

- [x] Datenmodell und Migration für Stationen/Konstrukte gemäß ADR.
- [x] Aktion „Konstrukt errichten“ mit allen STU-Prüfungen (inkl. Feldeffekt „kein Stationsbau“, sobald tmw-K3c Daten liefert) und Kosten; Workbees werden als Schiffe erzeugt und angedockt.
- [x] Limit je Spieler gemäß ADR.
- [x] Konstrukt entfernen (Eigner, Bestätigung) gibt Workbees frei.
- [x] Konstrukte erscheinen in NBS-Liste und Sternkarte für Berechtigte.
- [x] Backend-Tests je Prüfung; Frontend-Test für Aktion.
- [x] `lint`, `typecheck`, `test` und `build` sind grün.

## Comments

- 2026-10-23: Stationsmodell und Migration ergänzt; Konstruktbau und -entfernung transaktionssicher mit STU-Prüfungen, Kosten, Spielerlimit sowie fünf angedockten Workbees umgesetzt. Bestehende NBS- und Sternkartenpfade erfassen Konstrukte als Spacecraft. Backend- und Frontend-Tests ergänzt; `nx affected -t lint typecheck test --base=HEAD` und `nx run-many --targets=build` sind grün.
