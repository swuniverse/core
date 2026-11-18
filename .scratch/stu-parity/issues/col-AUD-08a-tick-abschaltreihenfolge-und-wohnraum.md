# Kolonie-Tick: Abschaltreihenfolge Waren → Wohnraum → Energie wie STU

**Status:** resolved
**Priority:** P1
**Size:** M
**Blocked by:** —

## Ziel

Der STU-Kolonie-Tick prüft in jeder Runde zuerst den Warenmangel einschließlich Vorkommen und schaltet je Ware mit negativer Bilanz einen Verbraucher ab. Danach prüft er den Wohnraum: Bei `workers > maxBev` schaltet er einen Arbeitgeber ab. Zuletzt prüft er die Energie. Die Koloniezentrale ist davon nicht ausgenommen.

SWU prüft in anderer Reihenfolge: zuerst Energie, dann Arbeiter gegen die aktuelle Bevölkerung, dann Vorkommen, dann Waren. Die Zentrale wird nie abgeschaltet. Fällt Wohnraum weg, schaltet SWU keine Arbeitgeber ab. Bei gleichzeitigem Mangel trifft es deshalb andere Gebäude als in STU.

## STU-Quellen

- `src/Module/Tick/Colony/ColonyTick.php` (`mainLoop` Z. 66–103, `checkStorage` Z. 109–144, `checkLivingSpace` Z. 150–166, `checkEnergyProduction` Z. 172–189)
- `src/Orm/Repository/PlanetFieldRepository.php` (Auswahl des abzuschaltenden Felds, Z. 73–98, 151–206)

## SWU-Pfade

- `apps/backend/src/modules/colony/colony-tick-processor.service.ts` (`balanceAndProduce` Z. 341–440, Arbeiterprüfung Z. 372, `deactivateFirstMatchingField` Z. 536)
- `apps/backend/src/modules/colony/colony-stats.service.ts` (Wohnraum, Arbeiter)
- `apps/backend/src/modules/colony/colony-tick.spec.ts`

## Akzeptanzkriterien

- [x] `balanceAndProduce` prüft je Runde wie STU: (1) Warenmangel inkl. Vorkommen, je Ware ein Verbraucher aus; (2) Wohnraum: `Arbeiter > maximaler Wohnraum` → ein Arbeitgeber aus; (3) Energie. Die Schleife läuft, bis keine Abschaltung mehr nötig ist.
- [x] Die Wohnraumprüfung vergleicht Arbeiter mit dem maximalen Wohnraum aktiver Gebäude, nicht mit der aktuellen Bevölkerung. Fällt ein Wohngebäude aus, werden Arbeitgeber abgeschaltet.
- [x] Der Zentralen-Schutz in `deactivateFirstMatchingField` entfällt wie in STU. Falls die PO das ablehnt, wird es als eigene Frage unter Comments festgehalten und nicht eigenmächtig beibehalten.
- [x] Die Auswahl des abzuschaltenden Felds ist deterministisch (z. B. nach Feldindex), damit Tests stabil sind. Dass STU hier keine Ordnung hat, wird im Code kommentiert.
- [x] Meldungen an den Spieler nennen das abgeschaltete Gebäude und den Grund (Ware, Wohnraum, Energie).
- [x] Backend-Tests in `colony-tick.spec.ts`: gleichzeitiger Waren- und Energiemangel (Ware zuerst), Wohnraumverlust schaltet Arbeitgeber ab, Zentrale kann abgeschaltet werden, Vorkommen erschöpft schaltet Verbraucher ab.
- [x] Bestehende Tick-Tests bleiben grün oder werden mit Begründung an die STU-Reihenfolge angepasst.

## Herkunft

- [`../audit-2026-11-17/README.md`](../audit-2026-11-17/README.md), Abschnitt H „Kolonie“ (Tick-Abschaltreihenfolge).
- [`../audit-2026-11-17/colony.md`](../audit-2026-11-17/colony.md), Große Abweichung Nr. 6, Unsicherheit Nr. 2.
- Audit vom 2026-11-17, Paritätsvorgabe „wie STU“.

## Comments

- 2026-11-17: Aus dem Audit angelegt. Lagerauffüllung und Wachstum stehen in col-AUD-08b. Beide ändern `colony-tick-processor.service.ts`; nacheinander umsetzen.

- 2026-11-18: **umgesetzt, Prüfung ausstehend** gemäß dem auf Nutzerwunsch getrennten Prüfablauf in `docs/agents/ticket-workflow.md`. Commit-Zuordnung: `fix(colony): balance shortages in STU order (stu-parity col-AUD-08a)`.
- `balanceAndProduce` prüft je Runde alle Waren und Vorkommen, dann Wohnraum, dann Energie. Je Ware wird höchstens ein Verbraucher abgeschaltet; eine neue Runde folgt, solange weitere Abschaltungen notwendig sind. Die Bilanz wird nur nach einer tatsächlichen Abschaltung neu berechnet, einschließlich Auswirkungen auf nachfolgende Waren. Die bisherige pauschale 100-Runden-Grenze entfällt. Die Auswahl erfolgt deterministisch nach Feldindex, danach Feld-ID; der STU-Unterschied ist im Code dokumentiert. Die Zentrale ist auch bei Waren-, Wohnraum- und Energiemangel abschaltbar.
- Wohnraum wird gegen die von Gebäudeaktivierung/-deaktivierung gepflegte echte Changeable-Kapazität `maxPopulation` geprüft. Die um aktuelle Bevölkerung erweiterte Darstellungsgröße `summary.maxHousing` wird dafür nicht verwendet. Bei Wohnraumverlust werden Arbeitgeber mit dem Grund „Wohnraum“ abgeschaltet. Bestehende Waren-/Energiegründe behalten Gebäudenamen und Warenreferenzen. Lagerbuchung und Wachstum aus col-AUD-08b werden nicht geändert.
- **Sofortprüfung:** Kurzer Diff-Review; `npx jest --config apps/backend/jest.config.cts --runInBand --runTestsByPath apps/backend/src/modules/colony/colony-tick.spec.ts`: 232 Tests und ein Snapshot erfolgreich. Neun neue Fälle prüfen Waren vor Energie, Wohnraumverlust vor Energie, je Ware eine Abschaltung pro Runde, Neuberechnung bei Mehrfachverbrauchern, alle drei Mangelarten an der Zentrale, erschöpfte Vorkommen und mehr als 100 nötige Abschaltungen. Der alte Test zur Abschaltung wegen geringer aktueller Bevölkerung wurde ausdrücklich auf den freigegebenen STU-Vergleich gegen Wohnraum umgestellt. Nach einer lokalen Effizienzkorrektur wurde derselbe betroffene Lauf erneut erfolgreich ausgeführt; keine breiten Prüfungen oder Builds ausgeführt.
- **Routing/Modelle:** Komplexe Tick-/Spielregeln direkt im aktiven Sitzungsmodell geplant und umgesetzt; kein Coding-Subagent. GPT-6.1 Sol ist in der laufenden Sitzung nicht umschaltbar, daher dokumentierter Workflow-Fallback. Keine gemessenen Token-/Einsparungszahlen verfügbar. Andere Workspace-Änderungen bleiben erhalten.

## Ausstehender Prüfpass

- [ ] Abschließender Review der Abschaltregeln und Wechselwirkungen gegen Ticket/STU-Quellen.
- [ ] Gezielter ESLint für `colony-tick-processor.service.ts` und `colony-tick.spec.ts`.
- [ ] `npx nx run backend:typecheck`.
- [ ] Zusätzliche Kolonie-Regressionen: `building-upgrade-reactivation.spec.ts` und `colony-stats.service.spec.ts`; weitere Läufe nur bei konkretem Befund.
- [ ] Gemeinsamer Workspace-Build: `npx nx run-many --targets=build`.

Bis dieser Prüfpass erfolgreich abgeschlossen ist, bleibt das Ticket `claimed`; col-AUD-08b bleibt davon blockiert. Die erfolgreichen Tick-Tests müssen ohne zwischenzeitliche relevante Änderungen nicht erneut ausgeführt werden.
- 2026-11-18 – Prüfpass (Opus 5.5): Diff-Review ohne Befund: Schleife endet, weil jede Abschaltung ein Feld dauerhaft aus der Auswahl nimmt; Feldindex-Reihenfolge deterministisch. Gesamtlauf auf `bd2ea161`: Backend-Unit 2599/2599, Frontend 917/917, PostgreSQL 902/1041 – die 139 Fehlschläge sind identisch mit dem Stand vor allen acht Prüfpass-Tickets (`26ff9e76~1`; überwiegend globale HTTP-403 und `lastReports`-Konstruktorverschiebung aus sc-WP-UI-4), also keine Regression. Build `backend frontend shared` und Lint 0 Fehler. resolved; col-AUD-08b unblockiert.
