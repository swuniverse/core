# Demontage nach STU-Regel

**Status:** needs-info
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
- 2026-10-27 Blocker: Die test-first Umsetzung war lokal grün (`colony-tick.spec.ts`: 178/178; `PanelShipyard.spec.tsx`: 2/2; `npx nx run-many --targets=build`: 3/3), aber die vorgeschriebene Prüfung `npx nx affected -t lint typecheck test --base=dd5d110` scheitert auch nach vollständigem Build reproduzierbar im bestehenden Backend-Typecheck an repository-weiten `TS6305`-Fehlern (fehlende `apps/backend/dist/**/*.d.ts` für Quellimporte; der Webpack-Build erzeugt diese Deklarationen nicht). Der dokumentierte Fallback `npm run lint && npm run typecheck && npm run test` scheitert am selben Typecheck. Produktcode und Tests wurden gemäß Abbruchregel verworfen. Benötigt wird eine Entscheidung bzw. Reparatur des Backend-Typecheck-Setups, damit die Pflichtprüfung grün werden kann.
