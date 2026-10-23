# Schiffskopf: STU-Zusatzwerte und Info-Tooltips

**Status:** resolved
**Priority:** P2
**Size:** S
**Blocked by:** sh-AP-11

## Ziel

Der Schiffskopf der Detailansicht zeigt die STU-Zusatzinformationen direkt in den Zellen (Schildregeneration, EPS-Zuwachs mit Verbrauch/Reaktornutzung, Crew min/max) und ist auf dem Desktop so kompakt wie in STU.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `html/spacecraft/spacecraft.twig` Z. 40–100 (Kopftabelle)
- `Module/Spacecraft/View/ShowSpacecraft`

## SWU-Pfade

- `apps/frontend/src/components/spacecraft/ShipHeaderTable.tsx`, `ShipHeaderTable.spec.tsx`
- `apps/frontend/src/pages/spacecraft-detail.tsx`
- `apps/backend/src/modules/spacecraft/spacecraft.controller.ts` (`GET :id/energy-flow`)

## Akzeptanzkriterien

- [x] Schildzelle: `aktuell/max` plus `+Regeneration` je Tick, Tooltip mit Regenerationsregel.
- [x] EPS-Zelle: `aktuell/max`, `+Zuwachs`, `(Verbrauch/Reaktorleistung)`; Klick öffnet die vorhandene EPS-Verbrauchsansicht.
- [x] Crew-Zelle: `aktuell (min/max)` mit Ampelfarbe.
- [x] Reichhaltige Tooltips nutzen die Komponente aus sh-AP-11.
- [x] Desktop-Abstände der Kopf-Karten verdichtet (Zellen `px-1.5 py-1`, `text-xs`).
- [x] `ShipHeaderTable.spec.tsx` deckt die neuen Werte ab.
- [x] `lint`, `typecheck`, `test` und `build` sind grün.

## Comments

- Der Schiffskopf lädt den bestehenden Energieflussvertrag, zeigt Schildregeneration, EPS-Zuwachs samt Verbrauch/Reaktorleistung und Crew-Ampelfarbe kompakt an und nutzt die gemeinsame Tooltip-Komponente. Die Komponenten-Tests decken Werte, Tooltips, Klickverhalten und Unterbesetzung ab; keine offenen Folgepunkte.
