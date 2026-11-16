# Rangliste „Die besten Arbeitgeber“ (zufriedene Arbeiter)

**Status:** resolved
**Priority:** P3
**Size:** S
**Blocked by:** —

## Ziel

STU führt in der Datenbank eine Top-10-Rangliste der besten Arbeitgeber: je Spieler die Summe der zufriedenen Arbeiter über alle Kolonien. Zufrieden ist ein Arbeiter, soweit aktive Gebäude genügend Lebensstandard (Effektware 1300) produzieren. SWU hat Ranglisten für Koloniewert, Produktion und Forschung, aber nicht diese.

## STU-Quellen

- `src/Module/Database/View/SatisfiedWorkerRanking/SatisfiedWorkerRanking.php`
- `src/Orm/Repository/ColonyRepository.php::getSatisfiedWorkerTop10` (`LEAST(bev_work, Summe Lebensstandard-Produktion aktiver Gebäude)` je Kolonie, summiert je Spieler)
- `src/html/database/highscores/topEmployers.twig`

## SWU-Pfade

- `apps/backend/src/modules/database/database.service.ts` (`getRankings`, `rankingFor`, `RankingKey`) + `database-ranking.spec.ts`
- `apps/backend/src/modules/colony/colony-social.service.ts` (Lebensstandard-Berechnung wiederverwenden)
- `apps/frontend/src/pages/database.tsx` + `database.spec.tsx`

## Akzeptanzkriterien

- [x] Neue Rangliste „Die Top 10 der besten Arbeitgeber“ mit Wert = Summe über Kolonien von `min(Arbeiter, Lebensstandard-Produktion aktiver Gebäude)`.
- [x] Die eigene Position und der eigene Wert werden unter der Liste angezeigt (wie bei den übrigen Ranglisten).
- [x] Die Rangliste ist im Datenbank-Hub unter den Kolonie-Ranglisten verlinkt.
- [x] Backend-Test mit zwei Spielern und gemischten Kolonien; Frontend-Test für die Anzeige.

## Comments

- 2026-10-28: Abgebrochen, weil der verpflichtende Lauf `npx nx affected -t lint typecheck test --base=HEAD` nach zwei ernsthaften Reparaturversuchen weiterhin an einem bereits vorhandenen, themenfremden TypeScript-Fehler in `apps/frontend/src/pages/colonies.spec.tsx:239` scheitert: Der Fixture-Wert benötigt das Pflichtfeld `hasFighterShipyard`. Die Änderungen für diese Aufgabe unter `apps/` wurden gemäß Abbruchregel zurückgesetzt. `npx nx run-many --targets=build` war zuvor erfolgreich.
- 2026-11-09: Die integrierte Baseline 14b86081/c8e14f1c beseitigt den zuletzt dokumentierten fachfremden Blocker (Frontend-Fixture hasFighterShipyard); reguläre Nx-Lint-/Typecheck-/Build-Gates und vollständige Tests sind laut Baseline-Review grün, lokale Test-Spieldaten waren dafür vorhanden. Status ready-for-agent; vorhandene Issue-Abhängigkeiten bleiben verbindlich. Dies belegt keine Feature-Fertigstellung: verworfene Änderungen müssen neu umgesetzt und die aktuellen Issue-Tests und Pflicht-Gates erneut ausgeführt werden; keine Ausnahme.

- 2026-11-16: Rangliste `satisfied-workers` ergänzt (Top 10 „Die Top 10 der besten Arbeitgeber“, Kennzahl „Zufriedene Arbeiter“). Die bestehende Kolonie-/Lebensstandardberechnung liefert `min(Arbeiter, Lebensstandard)` je Kolonie; Ergebnisse werden je Spieler summiert und bei Gleichstand nach Namen, dann User-ID geordnet. Nur belegte Kolonien von Nicht-NPC-Spielern werden berücksichtigt. Eigene Position wird vor der Top-10-Kürzung bestimmt; Link unter Kolonie-Ranglisten im Datenbank-Hub, zusätzlich im Sammel-Ranglistenendpunkt.
  - Tests zuerst rot, danach grün: gemischte Kolonien zweier Spieler, inaktive/unfertige Gebäude, Deckelung je Kolonie, Gleichstände, Top-10-Grenze, eigener Rang außerhalb der Liste und Nullwerte. Frontend prüft Hub-Link, Kennzahl, Punktestand und eigenen Rang.
  - Prüfung: `npx nx affected -t lint typecheck test --base=HEAD --parallel=2` grün (227 Backend-Suites / 2151 Tests; 108 Frontend-Dateien / 775 Tests), abschließende drei relevante Backend-Suites 22/22 grün; abschließendes Lint für Backend/Frontend und `npx nx run-many --targets=build` grün.
  - Nach dem Produktionsbuild Backend-Deklarationen und Spec-Typecheck mit `npx tsc --build apps/backend/tsconfig.json --emitDeclarationOnly --force` erfolgreich erneuert.
