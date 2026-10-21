# Andocken und Abdocken an Stationen

**Status:** ready-for-agent
**Priority:** P2
**Size:** M
**Blocked by:** sc-WP-STAT-2

## Ziel

Schiffe docken wie in STU an eine Station am Feld an und ab; Flotten docken gemeinsam an; die Station kann einzelne oder alle Schiffe abdocken. Ein Flug dockt automatisch ab. Angedockte Schiffe zeigen ein Andock-Icon in der Schiffsliste. Rechte für Fremde folgen in sc-WP-STAT-3b; bis dahin darf nur der Eigner andocken.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Ship/Action/{DockShip,UndockShip}`, `Module/Station/Action/{DockFleet,UndockStationShip,UndockAllShips}`
- `Module/Spacecraft/Lib/Movement/Component/Consequence/Flight/DockConsequence.php`
- `html/station/dockControl.twig`
- Migration `rename-spacecraft-docked-status-to-idle` (SWU, Status DOCKED wurde entfernt)

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/entities/spacecraft.entity.ts` (Bezug `dockedToId`), Migration
- `apps/backend/src/modules/spacecraft/spacecraft.service.ts` (Flugpfade), Interaktions-Checks aus sc-WP-ENG-2
- `apps/frontend/src/components/spacecraft/NearbySensorPanel.tsx`, `pages/spacecraft.tsx` (Andock-Icon `dock1.png`)

## Akzeptanzkriterien

- [ ] Andocken eigener Schiffe/Flotten an eigene Stationen am Feld, mit Dockplatzlimit gemäß ADR und STU-Vorbedingungen (Schilde aus, nicht getarnt, nicht im Hyperraum).
- [ ] Abdocken einzeln, alle (Station) und automatisch beim Flug.
- [ ] Angedockte Schiffe sind gegen Ionensturm-Interaktionssperre ausgenommen (Hook in sc-WP-ENG-2) und zeigen das Icon in der Schiffsliste.
- [ ] Backend-Tests (Limit, Flotte, Auto-Abdocken), Frontend-Tests.
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Comments
