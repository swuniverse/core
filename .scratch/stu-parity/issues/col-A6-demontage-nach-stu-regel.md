# Demontage nach STU-Regel

**Status:** claimed
**Priority:** P3
**Size:** S
**Blocked by:** —

## Ziel

SWU erstattet bei der Demontage 50 % der Rumpfkosten plus Fracht und verlangt eine aktive Werft. STU gibt stattdessen einen Teil der eingebauten Module, die Reaktorladung und die geladenen Torpedos zurück. Die Abweichung ist nicht dokumentiert (Leitplanke 1).

## STU-Quellen

- `src/Module/Colony/Action/DisassembleShip/`
- `src/Module/Colony/View/ShowShipDisassembly/`

## SWU-Pfade

- `apps/backend/src/modules/colony/colony.service.ts` (`disassembleShip`, Z. ~1154), `colony.controller.ts`
- `apps/backend/src/modules/spacecraft/entities/*` (Module, Torpedolager, `reactorFuel`)
- `apps/frontend/src/pages/colonies/components/PanelShipyard.tsx` bzw. Orbitpanel (Demontage-Dialog)

## Akzeptanzkriterien

- [ ] Demontage gibt einen zufälligen Teil der eingebauten Module (STU `retrieveSomeModules`), die Reaktorladung als Ware und die Torpedos ins Kolonielager, gekappt auf freien Lagerplatz; Fracht wie bisher.
- [ ] Keine pauschale Rumpfkostenerstattung mehr.
- [ ] Die Demontage verlangt weiterhin eine aktive Werft (SWU-Regel, bleibt unverändert).
- [ ] Der Dialog zeigt vorab, was zurückkommt (Module als „einige“, Reaktorladung, Torpedos).
- [ ] Backend- und Frontend-Tests.

## Entscheidung

Vorgabe: Variante (b) mit (b1). STU-Rückgabe (zufälliger Teil der Module, Reaktorladung, Torpedos; Fracht wie bisher), keine pauschale Rumpfkostenerstattung. Die aktive Werft bleibt Pflicht (SWU-Regel, unter „Entscheidungen“ in `map.md` vermerkt).

## Comments

- 2026-10-21 Product Owner: Option b1 – Die Demontage folgt der STU-Rückgabe (einige Module, Reaktorladung und Torpedos statt 50 % Rumpfkosten); die Werftpflicht bleibt als SWU-Regel bestehen.
