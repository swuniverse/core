# Rangliste „Die besten Arbeitgeber“ (zufriedene Arbeiter)

**Status:** ready-for-agent
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

- [ ] Neue Rangliste „Die Top 10 der besten Arbeitgeber“ mit Wert = Summe über Kolonien von `min(Arbeiter, Lebensstandard-Produktion aktiver Gebäude)`.
- [ ] Die eigene Position und der eigene Wert werden unter der Liste angezeigt (wie bei den übrigen Ranglisten).
- [ ] Die Rangliste ist im Datenbank-Hub unter den Kolonie-Ranglisten verlinkt.
- [ ] Backend-Test mit zwei Spielern und gemischten Kolonien; Frontend-Test für die Anzeige.

## Comments

- 2026-10-28: Abgebrochen, weil der verpflichtende Lauf `npx nx affected -t lint typecheck test --base=HEAD` nach zwei ernsthaften Reparaturversuchen weiterhin an einem bereits vorhandenen, themenfremden TypeScript-Fehler in `apps/frontend/src/pages/colonies.spec.tsx:239` scheitert: Der Fixture-Wert benötigt das Pflichtfeld `hasFighterShipyard`. Die Änderungen für diese Aufgabe unter `apps/` wurden gemäß Abbruchregel zurückgesetzt. `npx nx run-many --targets=build` war zuvor erfolgreich.
- 2026-11-09: Die integrierte Baseline 14b86081/c8e14f1c beseitigt den zuletzt dokumentierten fachfremden Blocker (Frontend-Fixture hasFighterShipyard); reguläre Nx-Lint-/Typecheck-/Build-Gates und vollständige Tests sind laut Baseline-Review grün, lokale Test-Spieldaten waren dafür vorhanden. Status ready-for-agent; vorhandene Issue-Abhängigkeiten bleiben verbindlich. Dies belegt keine Feature-Fertigstellung: verworfene Änderungen müssen neu umgesetzt und die aktuellen Issue-Tests und Pflicht-Gates erneut ausgeführt werden; keine Ausnahme.
