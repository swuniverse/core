# Flottenpflege: ausblenden, priorisieren, Sichtbarkeit

**Status:** needs-info
**Priority:** P3
**Size:** S
**Blocked by:** sc-WP-FLEET-1b

## Ziel

Spieler mit vielen Flotten können wie in STU Flotten in der Schiffsliste einklappen bzw. ausblenden, ihre Reihenfolge festlegen und die Sichtbarkeit umschalten.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Ship/Action/{HideFleet,ShowFleet,PriorizeFleet,ToggleFleetVisibility}`
- `html/view/shiplist.twig`

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/entities/fleet.entity.ts` (Spalten `sort`, `isHidden`)
- `apps/backend/src/modules/spacecraft/spacecraft.controller.ts`, `spacecraft.service.ts`
- `apps/frontend/src/pages/spacecraft.tsx`

## Akzeptanzkriterien

- [ ] Flotten haben eine persistente Sortierung; „nach oben“ verschiebt eine Flotte an die erste Stelle (STU `PriorizeFleet`).
- [ ] Ausgeblendete Flotten zeigen nur die Kopfzeile; der Zustand bleibt nach Neuladen erhalten.
- [ ] Migration nach `docs/typeorm-migrations.md`; Backend-Tests für Sortierung und Ausblenden; Frontend-Test für Einklappen.
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Comments

- 2026-10-29: Umsetzung und issue-spezifische Backend-/Frontend-Tests waren grün, ebenso `nx run-many --targets=build`. Die vorgeschriebene Gesamtabnahme scheitert jedoch nach zwei ernsthaften Versuchen an bestehenden, issue-fremden Fehlern: `frontend:typecheck` meldet zahlreiche TS6305-Fehler wegen fehlender `apps/frontend/dist/**/*.d.ts`-Buildartefakte sowie bestehende TS7006-Fehler; `frontend:test` scheitert in `src/pages/research.spec.tsx` (`button` mit Name `/eine von/` fehlt). Produktcode wurde gemäß Abbruchregel verworfen. Bitte die Baseline-Prüfungen reparieren oder bestätigen, dass diese bekannten Fehler für den Durchlauf ausgenommen werden dürfen.
