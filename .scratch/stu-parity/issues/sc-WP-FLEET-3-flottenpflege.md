# Flottenpflege: ausblenden, priorisieren, Sichtbarkeit

**Status:** ready-for-agent
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
