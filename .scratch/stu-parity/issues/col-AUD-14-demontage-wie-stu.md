# Demontage wie STU: Werftgebäude auch deaktiviert, Fracht wird vernichtet

**Status:** claimed
**Priority:** P2
**Size:** S
**Blocked by:** —

## Ziel

Die Rückgaberegeln der Demontage folgen seit col-A6 STU. Abweichend gelten in SWU noch zwei Regeln aus col-A6 Option b1: SWU verlangt eine **aktive** Werft, und die Fracht geht ins Kolonielager.

STU verlangt nur ein vorhandenes Werftgebäude mit passender Rumpffunktion. Auch ein deaktiviertes zählt (`ColonySurface::hasShipyard` prüft die Zustände 0 und 1). Die Fracht vernichtet STU beim Entfernen des Schiffs. Der PO hat am 2026-11-17 „wie STU“ entschieden. Damit der Verlust nicht überrascht, braucht es vorher einen deutlichen Hinweis.

## STU-Quellen

- `src/Module/Colony/Action/DisassembleShip/DisassembleShip.php` (20 EPS, Crewplätze, Rückgabe)
- `src/Module/Colony/Lib/Gui/Component/ShipDisassemblyProvider.php` (nur eigene Schiffe mit passender Werftfunktion)
- `src/Component/Colony/ColonyMenuEnum.php` (Z. 73–105, `isBuildingFunctionMandatory`)
- `src/Module/Colony/Lib/ColonySurface.php` (`hasShipyard` Z. 152–159, Zustände 0 und 1)
- `src/Module/Spacecraft/Lib/SpacecraftRemover.php` (Z. 66–68, Laderaum wird gelöscht)

## SWU-Pfade

- `apps/backend/src/modules/colony/colony.service.ts` (`disassembleShip` Z. 1182 ff.: 20 Energie, `getActiveShipyardFunctionIds`, `transferShipCargoToColony`)
- `apps/backend/src/modules/colony/colony.controller.ts`
- `apps/frontend/src/pages/colonies/components/PanelShipyard.tsx` (View `demolitionSelection`, Bestätigung)
- `apps/frontend/src/pages/colonies/colony-navigation.ts` (Werftmenü auch bei deaktiviertem Gebäude erreichbar)
- `apps/backend/src/modules/colony/colony-tick.spec.ts` (bestehende Demontagetests), `PanelShipyard.spec.tsx`

## Akzeptanzkriterien

- [x] Die Demontage verlangt ein vorhandenes Werftgebäude (aktiv oder deaktiviert, nicht im Bau) mit einer Werftfunktion, die zum Rumpf passt. Eine aktive Werft ist nicht mehr nötig.
- [x] Das Werftmenü mit der Aktion Demontage ist auch bei deaktiviertem Werftgebäude erreichbar. Schiffbau, Reparatur und Umrüstung behalten ihre eigenen Regeln (aktive Werft bleibt dort Pflicht, sofern STU das verlangt).
- [x] Gelistet werden nur eigene Schiffe im Orbit, deren Rumpf zur Werftfunktion des gewählten Gebäudes passt.
- [x] Unverändert: 20 Energie, freie Crewplätze, Crew geht auf die Kolonie, Rückgabe von Modulen/Reaktorladung/Torpedos aus col-A6.
- [x] Die Fracht des Schiffs wird vernichtet und nicht ins Kolonielager übertragen.
- [x] Vor der Bestätigung zeigt der Dialog deutlich, z. B. als Warnbox: „Die Fracht des Schiffs (n Einheiten) geht bei der Demontage verloren.“, mit Liste der Waren. Hat das Schiff keine Fracht, fehlt die Warnung.
- [x] Backend-Tests: Demontage an deaktivierter Werft erlaubt, ohne passende Werftfunktion abgelehnt, Fracht nicht im Kolonielager, Schiff entfernt.
- [x] Frontend-Test `PanelShipyard.spec.tsx`: Warnung bei Fracht, keine Warnung ohne Fracht, Zugang bei deaktivierter Werft.
- [ ] Die `map.md`-Entscheidung col-A6 b1 wird vom PO ersetzt. Dieses Ticket ändert `map.md` nicht; der Umsetzer trägt die Ergebnisnotiz wie üblich ein.

## Herkunft

- [`../audit-2026-11-17/README.md`](../audit-2026-11-17/README.md), Abschnitt J1 (Demontage – Werftpflicht) und Abschnitt N2 (Zeile „Demontage nur an aktiver Werft, Fracht ins Lager“).
- [`../audit-2026-11-17/colony.md`](../audit-2026-11-17/colony.md), Abschnitt „Bewusste/entschiedene Abweichungen“ (Werftpflicht).
- PO-Entscheidung 2026-11-17: „wie STU“. Ersetzt `map.md`-Entscheidung „2026-10-21 – col-A6 – Option b1“ (Werftpflicht als SWU-Regel, „Fracht wie bisher“). col-A6 bleibt resolved für die Rückgaberegeln.

## Comments

- 2026-11-17: Aus dem Audit angelegt.
- 2026-11-20 – umgesetzt, Prüfung ausstehend. Commit: `fix(colony): disassemble at any shipyard and drop cargo like STU (col-AUD-14)`.
  - Backend: `disassembleShip` prüft die Rumpfkompatibilität gegen alle fertigen Werftgebäude, aktiv oder deaktiviert (STU `ShipDisassemblyProvider`/`ColonySurface::hasShipyard`, Zustände 0/1; im Bau zählt nicht). `transferShipCargoToColony` entfernt: Die Fracht wird per `onDelete: CASCADE` mit dem Schiff gelöscht (STU `SpacecraftRemover`). Projektion: `canDisassemble` mit derselben Regel, neues `disassemblyReturns.lostCargo` (geteilter Typ `ShipDisassemblyReturns`).
  - Frontend: Werft-Kontextaktion auch bei deaktiviertem Gebäude (`requiresActiveField: false`, wie STU `SwitchColonyMenu` für alle Werftmenüs). An einer deaktivierten Werft sind Schiffbau, Reparatur und Umrüstung gesperrt („Werft ist deaktiviert – nur Demontage möglich“); das Backend verlangt dort weiter eine aktive Werft. Demontageliste mit roter Warnbox „Die Fracht des Schiffs (n Einheiten) geht bei der Demontage verloren: …“ nur bei Fracht; derselbe Satz im Bestätigungsdialog. Text „Fracht … wird zurückgeführt“ entfernt.
  - Geprüft: `nx typecheck` backend/frontend/shared grün; Backend-Unit `colony` 422/422 inkl. angepasster Demontagetests (Fracht nicht im Lager, deaktivierte Werft erlaubt, ohne passende Werftfunktion abgelehnt, Vorschau `lostCargo`); Frontend `colonies` 142/142 plus `colony-navigation.spec.ts` (Warnung mit/ohne Fracht, Zugang bei deaktivierter Werft); PostgreSQL `colony-orbit-order-http` grün; ESLint 0 Fehler.
  - Ausstehend: Browserprüfung (Werft deaktivieren, Demontage mit beladenem Schiff); `map.md`-Ergebnisnotiz beim Abschluss (ersetzt col-A6 b1).
  - Modell: Opus 5.5 direkt, keine Delegation.

