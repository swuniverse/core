# Wurmlochpassage: Frontend und Oberflächenverträge

**Status:** ready-for-agent
**Priority:** P2
**Size:** S
**Blocked by:** tmw-K7a2

## Ziel

Macht Wurmlochpassagen in den passenden Spieleroberflächen auffindbar und nutzbar. Das Backend- und Flottenverhalten aus `tmw-K7a1`/`tmw-K7a2` wird über stabile Shared-DTOs und Endpunkte abgebildet.

## STU-Quellen

- `src/Module/Spacecraft/View/ShowWormholeControl/*`
- `src/html/spacecraft/wormholecontrol.twig`

## SWU-Pfade

- `packages/shared/src/lib/spacecraft/`
- `apps/frontend/src/components/spacecraft/FieldContextPanel.tsx`
- `apps/frontend/src/components/spacecraft/ShipQuickActions.tsx`
- `apps/frontend/src/components/spacecraft/ship-action-registry.ts`
- `apps/frontend/src/components/starmap/StarmapCanvas.tsx`

## Akzeptanzkriterien

- [ ] Shared-Verträge repräsentieren verfügbare aktive Wurmlochpassagen einschließlich Name und Zielebene, ohne interne Backend-Details offenzulegen.
- [ ] Feldkontext beziehungsweise Schnellaktionen bieten auf einem Wurmlochfeld „Wurmloch betreten“ mit passendem Namen und Ziel.
- [ ] Nach erfolgreicher Passage aktualisieren sich Schiffsdetail und Karte auf die vom Backend bestätigte Position; Fehler werden verständlich angezeigt.
- [ ] Frontend-Tests decken Sichtbarkeit nur am passenden Ort, mehrere Ausgänge, API-Aufruf und Zustandsaktualisierung ab.
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Entscheidung

Frontend folgt den stabilen Backend-Verträgen aus `tmw-K7a1`/`tmw-K7a2`; keine eigene Bewegungs- oder Validierungslogik.

## Comments

- 2026-11-06: Aus `tmw-K7a` als letzter geordneter Teilauftrag extrahiert; blockiert durch `tmw-K7a2`.
