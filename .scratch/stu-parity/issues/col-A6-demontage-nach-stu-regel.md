# Demontage nach STU-Regel

**Status:** resolved
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

- [x] Demontage gibt einen zufälligen Teil der eingebauten Module (STU `retrieveSomeModules`), die Reaktorladung als Ware und die Torpedos ins Kolonielager, gekappt auf freien Lagerplatz; Fracht wie bisher.
- [x] Keine pauschale Rumpfkostenerstattung mehr.
- [x] Die Demontage verlangt weiterhin eine aktive Werft (SWU-Regel, bleibt unverändert).
- [x] Der Dialog zeigt vorab, was zurückkommt (Module als „einige“, Reaktorladung, Torpedos).
- [x] Backend- und Frontend-Tests.

## Entscheidung

Vorgabe: Variante (b) mit (b1). STU-Rückgabe (zufälliger Teil der Module, Reaktorladung, Torpedos; Fracht wie bisher), keine pauschale Rumpfkostenerstattung. Die aktive Werft bleibt Pflicht (SWU-Regel, unter „Entscheidungen“ in `map.md` vermerkt).

## Comments

- 2026-10-21 Product Owner: Option b1 – Die Demontage folgt der STU-Rückgabe (einige Module, Reaktorladung und Torpedos statt 50 % Rumpfkosten); die Werftpflicht bleibt als SWU-Regel bestehen.
- 2026-10-27 Blocker: Die test-first Umsetzung war lokal grün (`colony-tick.spec.ts`: 178/178; `PanelShipyard.spec.tsx`: 2/2; `npx nx run-many --targets=build`: 3/3), aber die vorgeschriebene Prüfung `npx nx affected -t lint typecheck test --base=dd5d110` scheitert auch nach vollständigem Build reproduzierbar im bestehenden Backend-Typecheck an repository-weiten `TS6305`-Fehlern (fehlende `apps/backend/dist/**/*.d.ts` für Quellimporte; der Webpack-Build erzeugt diese Deklarationen nicht). Der dokumentierte Fallback `npm run lint && npm run typecheck && npm run test` scheitert am selben Typecheck. Produktcode und Tests wurden gemäß Abbruchregel verworfen. Benötigt wird eine Entscheidung bzw. Reparatur des Backend-Typecheck-Setups, damit die Pflichtprüfung grün werden kann.
- 2026-11-09: Die integrierte Baseline 14b86081/c8e14f1c beseitigt den zuletzt dokumentierten fachfremden Blocker (Backend-TS6305/Deklarations-Gate); reguläre Nx-Lint-/Typecheck-/Build-Gates und vollständige Tests sind laut Baseline-Review grün, lokale Test-Spieldaten waren dafür vorhanden. Status ready-for-agent; vorhandene Issue-Abhängigkeiten bleiben verbindlich. Dies belegt keine Feature-Fertigstellung: verworfene Änderungen müssen neu umgesetzt und die aktuellen Issue-Tests und Pflicht-Gates erneut ausgeführt werden; keine Ausnahme.

- 2026-11-16: Demontage gibt eingebaute Module mit STU-Chance `ceil(50 × Integrität / 100)`, den Brennstoffmix vollständiger verbleibender Reaktorladungen und alle geladenen Torpedotypen innerhalb der Lagergrenze zurück; Fracht und Crew wie bisher. Pauschale Rumpferstattung samt Kostenfunktion entfernt. Werftkompatibilität wird vor Fracht-/Crewtransfer geprüft. Gemeinsame Reaktorberechnung versorgt die Vorschau im Koloniedetail; Werftansicht und Bestätigung nennen einige Module, Brennstoffmix, Torpedos, Lagergrenze und 20 Energie.
  - Tests: zunächst rote Rückgabe-/Werftschutztests; abschließend `colony-tick.spec.ts` 217/217 inkl. Vorschauprüfung und `PanelShipyard.spec.tsx` 5/5. Vollständige Backend-Suite 227 Suites / 2147 Tests grün, danach aktualisierte Kolonie-Suite erneut grün; vollständige Frontend-Suite 108 Dateien / 774 Tests grün mit `--maxWorkers=2`.
  - Gates: `npx nx run-many -t lint typecheck -p backend frontend shared` und `npx nx run-many --targets=build` grün. Nach dem Build Backend-Deklarationen mit `npx tsc --build apps/backend/tsconfig.app.json --force` regeneriert (siehe sh-AP-24). Der erste breite Prüflauf meldete die anschließend entfernte unbenutzte Rumpfkostenfunktion sowie Folgefehler wegen fehlender Deklarationen. Frontend-Läufe mit Standardparallelität scheiterten an wechselnden bestehenden Login-/Stationsreparaturtests; abschließende Suite mit zwei Workern grün.
