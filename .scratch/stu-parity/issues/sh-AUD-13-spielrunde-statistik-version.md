# Spielrunde: Rundennummer, Rundenstatistik, Version und Changelog im Spiel

**Status:** needs-triage
**Priority:** P3
**Size:** M
**Blocked by:** —

## Ziel

STU führt eine **Spielrunde** (`GameTurn`). Jeder Haupttick beendet die alte Runde und startet die nächste (`TickManager`). Dabei schreibt STU eine Rundenstatistik (`GameTurnStats`): aktive Spieler, Logins der letzten 24 h, Inaktive (14 Tage), Urlauber, Schiffe (gesamt, bemannt, NPC), KN-Beiträge, Flugsignaturen 24 h (gesamt/System) und neue PMs seit Rundenbeginn. Die Spielseite zeigt in `serverTimeAndVersionComponent.twig` Serverzeit, „Runde n“ und „Version“ mit Changelog-Link; die Landing zeigt „Runde“.

SWU hat keine Runde: Die Ticknummer ist ein Zeitstempel (`getMainTickNumber`), es gibt kein Rundenmodell. Die Sidebar zeigt nur `HH:MM:SS` und den Tick-Ring. Statistik-Snapshots (`statistics.service.ts#recordSnapshots`) haben keinen Rundenbezug. Version und Changelog sind nur über News auf der Landing auffindbar (`isChangelog`).

Spieler können sich so nicht über Rundennummern verständigen (z. B. „seit Runde 1234“).

Triage: Umfang klären (Rundenmodell + Statistik; Anzeige Sidebar/Landing; Version aus Build/Deploy; Changelog-Link auf News mit `isChangelog`) und ggf. in a/b teilen. Zu klären ist auch, ob die Statistik die bestehenden Snapshots ersetzt oder ergänzt.

## STU-Quellen

- `src/Module/Tick/TickManager.php` (Z. 31–107, `endTurn`, `startTurn`, `createGameTurnStats`)
- `src/Orm/Entity/GameTurn.php`, `src/Orm/Entity/GameTurnStats.php`
- `src/Orm/Repository/GameTurnRepository.php`, `src/Orm/Repository/GameTurnStatsRepository.php`
- `src/html/game/component/serverTimeAndVersionComponent.twig` (Runde, Version mit Forum-Changelog-Link)
- `src/Module/Game/Component/ServertimeComponent.php`
- `src/html/index/index.twig` (Z. ~70), `src/html/index/indexDefaults.twig` (Z. ~270, „Runde“)

## SWU-Pfade

- `apps/backend/src/modules/tick/tick.service.ts` (`handleTick`, `getMainTickNumber` Z. ~131, ~459)
- `apps/backend/src/modules/tick/entities/` (neue Entity Runde/Rundenstatistik)
- `apps/backend/src/modules/statistics/statistics.service.ts`, `statistic-metrics.ts`
- `apps/backend/src/modules/game-status/game-status.controller.ts` bzw. `tick-status.controller.ts` (Ausgabe Runde/Version)
- `apps/backend/src/modules/news/news.service.ts` (`isChangelog`)
- `apps/frontend/src/components/layout/sidebar.tsx` (Z. ~103–125, Serverzeit/Tick-Ring)
- `apps/frontend/src/pages/login.tsx` (Landing-Statistik)
- `apps/frontend/Dockerfile`, `.github/workflows/deploy.yml` (Versionskennung)

## Akzeptanzkriterien

- [ ] Triage: Umfang und ggf. Aufteilung festgelegt.
- [ ] Persistente Runde: Jeder erfolgreiche Haupttick beendet die laufende Runde und startet die nächste (fortlaufende Nummer, Start/Ende); manuelle Admin-Ticks zählen wie STU mit.
- [ ] Rundenstatistik je neuer Runde mit den STU-Kennzahlen (soweit in SWU vorhanden; HoloNet statt KN).
- [ ] Sidebar zeigt Datum/Uhrzeit, „Runde n“ und „Version x“ mit Link auf den Changelog (News mit `isChangelog`); Landing zeigt die Runde.
- [ ] Versionskennung kommt aus dem Build (z. B. Git-Tag/Commit) und ist im Backend abrufbar.
- [ ] Backend-Tests: Rundenwechsel im Tick, Statistikwerte, kein Rundenwechsel bei fehlgeschlagenem Tick. Frontend-Tests: Anzeige Runde/Version/Link.

## Herkunft

- [`../audit-2026-11-17/README.md`](../audit-2026-11-17/README.md), Abschnitt E („Spielrunde/Rundenstatistik/Changelog“).
- [`../audit-2026-11-17/shell-admin-runtime.md`](../audit-2026-11-17/shell-admin-runtime.md), G6 und Seitenabgleich `serverTimeAndVersionComponent.twig`.
- PO-Linie 2026-11-17 „wie STU“. Kein bisheriges Ticket. Das KN-Archiv früherer Runden bleibt ausgeschlossen (README N1).

## Comments
