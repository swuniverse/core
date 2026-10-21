# Stationswerft: Schiffe an Werftstationen bauen

**Status:** ready-for-agent
**Priority:** P3
**Size:** M
**Blocked by:** sc-WP-STAT-2

## Ziel

Wie in STU baut eine Werftstation Schiffe aus Bauplänen, mit dem Modulbildschirm der Kolonie-Werft und Ressourcen aus dem Stationslager.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Station/Action/BuildShipyardShip`, `html/station/shipyardOptions.twig`
- `Lib/ModuleScreen/*`

## SWU-Pfade

- `apps/backend/src/modules/colony/colony-shipyard.service.ts` (`validateModuleSelections`, Bauqueue; Logik für Quelle Station wiederverwenden)
- `apps/frontend/src/pages/colonies/components/PanelShipyard.tsx` (`ShipHullDesigner`)

## Akzeptanzkriterien

- [ ] Werftstationen bieten Bauoptionen gemäß Rolle; Bau verbraucht Module/Waren aus dem Stationslager und läuft über die vorhandene Bauqueue-Logik (keine Kopie).
- [ ] Das fertige Schiff erscheint angedockt an der Station.
- [ ] Regeln aus col-A3a (Crew, Spezialmodule) gelten auch hier.
- [ ] Backend-Tests, Frontend-Test.
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Comments
