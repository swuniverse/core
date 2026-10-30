# Lager-Hover am Schiffbild in der Schiffsliste

**Status:** claimed
**Priority:** P2
**Size:** S
**Blocked by:** —

## Ziel

Wie in STU zeigt ein Hover über dem Schiffsbild in der Schiffsliste den Lagerinhalt (Waren mit Icon und Menge, Belegung/Kapazität). Umgesetzt mit der gemeinsamen Tooltip-Komponente aus sh-AP-11, ohne Ad-hoc-Hover-Panel.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Spacecraft/View/ShowSpacecraftStorage`, `html/spacecraft/spacecraftStorage.twig`
- `html/shiplistmacros.twig` (Bild mit Lager-Hover)

## SWU-Pfade

- `apps/frontend/src/pages/spacecraft.tsx`
- `apps/frontend/src/components/spacecraft/ShipStoragePanel.tsx`, `ShipSymbol.tsx`
- `apps/backend/src/modules/spacecraft/spacecraft.controller.ts` (`GET :id/cargo`)
- Tooltip-Komponente aus sh-AP-11

## Akzeptanzkriterien

- [ ] Hover (Desktop) bzw. Tap (Touch) auf das Schiffsbild zeigt sofort einen Tooltip mit Tabelle: Titel „Lager“, Waren mit Icon (`/assets/commodities/<id>.png`) und Menge, darunter Belegung/Kapazität.
- [ ] Das Lager wird erst beim ersten Hover geladen (lazy) und je Schiff gecacht; leeres Lager zeigt „Leer“.
- [ ] Frontend-Test: Hover löst genau einen Ladevorgang aus und rendert Ware und Menge.
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Comments

- 2026-10-23: Umsetzung und fokussierter Frontend-Test sind grün; Build ist grün. Der vorgeschriebene Gesamt-Testlauf scheitert nach zwei Versuchen reproduzierbar an dem unabhängigen bestehenden Test `apps/frontend/src/pages/research.spec.tsx:648` (Button `/eine von/` fehlt). Produktcode gemäß Abbruchregel verworfen; bitte den Forschungs-Test/Stand reparieren oder bestätigen, dass dieser externe Fehler für den Abschluss ignoriert werden darf.
- 2026-10-27: Erneuter test-first Versuch: fokussierter Frontend-Test grün (6/6), `nx run-many --targets=build` grün. `npx nx affected -t lint typecheck test --base=HEAD` scheitert erneut in zwei ernsthaften Versuchen, diesmal im Frontend-Typecheck mit zahlreichen bestehenden `TS6305`-Fehlern zu fehlenden `apps/frontend/dist/**/*.d.ts`-Ausgaben (zusätzlich bestehende Folgefehler in Tests). Produktcode gemäß Abbruchregel verworfen. Bitte den Frontend-Typecheck/Build-Referenzzustand reparieren oder bestätigen, wie dieser externe Fehler behandelt werden soll.
- 2026-10-30 Product Owner: Option 1. Das Issue wird gegen den aktuellen Repository-Stand erneut freigegeben. Die historischen Fehler in `research.spec.tsx:648` und der durch `sh-AP-21` behobene TS6305-/Typecheck-Fehler gelten weder automatisch als fortbestehende Blocker noch als dauerhafte Ausnahme. Fokussierte Tests sowie die aktuellen Lint-, Typecheck-, Test- und Build-Gates bleiben vorgeschrieben; nur frisch reproduzierte Fehler werden nach der bestehenden Abbruchregel behandelt.
