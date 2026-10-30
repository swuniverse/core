# Andocken und Abdocken an Stationen

**Status:** resolved
**Priority:** P2
**Size:** M
**Blocked by:** —

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

- [x] Andocken eigener Schiffe/Flotten an eigene Stationen am Feld, mit Dockplatzlimit gemäß ADR und STU-Vorbedingungen (Schilde aus, nicht getarnt, nicht im Hyperraum).
- [x] Abdocken einzeln, alle (Station) und automatisch beim Flug.
- [x] Angedockte Schiffe sind gegen Ionensturm-Interaktionssperre ausgenommen (Hook in sc-WP-ENG-2) und zeigen das Icon in der Schiffsliste.
- [x] Backend-Tests (Limit, Flotte, Auto-Abdocken), Frontend-Tests.
- [x] `lint`, `typecheck`, `test` und `build` sind grün.

## Comments

- 2026-10-23: Umsetzung nach zwei Prüfversuchen abgebrochen. `npx nx affected -t lint typecheck test --base=HEAD` und der Fallback `npm run typecheck` scheitern reproduzierbar an bestehenden TypeScript-Buildartefaktfehlern (`TS6305`, Backend-`dist/*.d.ts` wurde nicht aus den Quelldateien gebaut), obwohl die betroffenen Tests (Backend 14/14, Frontend 14/14) und `npx nx run-many --targets=build` grün sind. Produktcode wurde gemäß Abbruchregel verworfen. Bitte den Backend-Typecheck-Buildgraph reparieren oder bestätigen, dass diese bekannte Infrastrukturabweichung für Ralph-Läufe akzeptiert wird.
- 2026-10-27: Erneuter Durchlauf nach zwei ernsthaften Prüfversuchen abgebrochen. Die fokussierten Docking-Tests waren grün (Backend 14/14, Frontend 6/6) und `backend:build` war grün; die vorgeschriebene Gesamtsuite bleibt jedoch rot: `backend:typecheck` scheitert weiterhin massenhaft mit bestehenden `TS6305`-Deklarationsartefaktfehlern (auch nach Backend-Build), außerdem scheitert ein bestehender Frontend-Test in `research.spec.tsx` (fehlender Button `/eine von/`). Produktcode wurde gemäß Abbruchregel verworfen. Bitte Buildgraph und bestehenden Research-Test reparieren oder diese bekannten Basisfehler ausdrücklich für Ralph-Läufe ausnehmen.
- 2026-10-30 Product Owner: Option 1. Das M-Issue wird mit atomaren Flottenaktionen wieder `ready-for-agent`; die historischen Blocker sind aktuell grün (`backend:typecheck`, `research.spec.tsx` 10/10). Einzelnes Andocken und Abdocken kostet jeweils 1 EPS des Schiffs. Flottenaktionen sind alles oder nichts und validieren alle Mitglieder, gemeinsame Position, Dockplätze, Crew, EPS, Schilde, Tarnung und Flugstatus vor der Änderung in einer Transaktion mit geeigneten Sperren. Bereits an derselben Station angedockte Mitglieder gelten als erfüllt, eine andere Station lehnt ab. Reparatur oder Umrüstung wird erst beim erfolgreichen Übergang abgebrochen. Flugstart dockt für 1 EPS automatisch ab und startet ohne diese EPS nicht. Bis `sc-WP-STAT-3b` darf nur der Eigentümer andocken; erzwungenes Abdocken durch die eigene Station kostet das Zielschiff keine EPS.
- 2026-10-30: Umgesetzt. `SpacecraftDockingService` (`spacecraft-docking.service.ts`) mit Endpunkten `POST /spacecraft/:id/dock/:stationId`, `/undock`, `/docked/:targetId/undock`, `/docked/undock-all`. Einzel- und Flottenaktionen laufen in einer Transaktion mit Sperren in aufsteigender ID-Reihenfolge, alles oder nichts; bereits an derselben Station angedockte Mitglieder gelten als erfüllt, eine andere Station lehnt ab. Voraussetzungen über neue Regel `DOCK` in `nearby-interaction.ts` (Position, Tarnung, Hyperraum, Stationsschilde) plus Crew, 1 EPS, Dockplatzlimit; Schilde und Hyperantrieb werden beim Andocken abgeschaltet; Reparaturen werden erst beim erfolgreichen Übergang abgebrochen (`SpacecraftRepairService.cancelTasks` in der Transaktion). Flugstart (`navigate`, `flyGalaxy`, `enterSystem`, `leaveSystem`, `warp`) dockt für 1 EPS ab und bricht ohne EPS ab (`undockForFlight`, Flottenmitglieder ohne EPS bleiben wie bisher zurück). Erzwungenes Abdocken durch die Station kostet das Ziel keine EPS. `InteractionContext` hat optionale Felder `sourceDocked`/`targetDocked` für den Ionensturm-Hook. Frontend: Andock-Aktion in der NBS-Liste (`dock1.png`), `DockingPanel` (Abdocken, Station: einzeln/alle), Icon und Station in der Schiffsliste. Folgepunkte: Fremdandocken und Zugangsregeln in sc-WP-STAT-3b (bis dahin nur Eigentümer, daher keine Nachrichten an Stationseigner); Umrüstung existiert in SWU noch nicht, daher kein Retrofit-Abbruch; Traktor-Prüfung folgt mit dem Traktor-Issue.
