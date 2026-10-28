# Rangliste „Die besten Arbeitgeber“ (zufriedene Arbeiter)

**Status:** claimed
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
