# Stationswerft: Schiffe an Werftstationen bauen

**Status:** needs-info
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

- 2026-10-29: Nach zwei ernsthaften Verifikationsversuchen abgebrochen. Der neue Stationswerft-Service löste beim Laden über `spacecraft.controller.ts` in bestehenden Controller-Tests eine TypeORM-Zirkularabhängigkeit in `@InjectRepository()` aus; zusätzlich blieben die vorgeschriebenen `nx affected`-Prüfungen für Backend-Test sowie Frontend-Test/Typecheck rot. Der vorgeschriebene Build war grün. Der Produktcode wurde gemäß Ralph-Abbruchregel vollständig verworfen. Vor einer erneuten Umsetzung muss geklärt werden, wie die Werftlogik ohne diese Modul-/Entity-Zirkularabhängigkeit über den Spacecraft-Controller eingebunden und zugleich die vorhandene Kolonie-Bauqueue-Logik ohne Kopie wiederverwendet werden soll.
