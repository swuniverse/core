# Award-Auslöser: Lotteriegewinn

**Status:** resolved
**Priority:** P3
**Size:** S
**Blocked by:** soc-G1, tmw-T9

## Ziel

STU vergibt beim Ende einer Lotterieperiode dem Gewinner den Award `LOTTERY_WINNER`. In SWU entsteht die Lotterie mit tmw-T9. Dieses Issue hängt die Award-Vergabe an die Gewinnerermittlung. Die Prestige-Gutschrift je Los gehört zu tmw-T9.

## STU-Quellen

- `src/Module/Maintenance/EndLotteryPeriod.php#createAwardAndPrestige`
- `src/Component/Player/UserAwardEnum.php` (`LOTTERY_WINNER = 49`)

## SWU-Pfade

- Lotterie-Abschluss aus tmw-T9
- `apps/backend/src/modules/awards/*`

## Akzeptanzkriterien

- [x] Beim Abschluss einer Lotterieperiode erhält der Gewinner den Award `LOTTERY_WINNER` mit `incrementExisting` (Mehrfachgewinne zählen hoch).
- [x] Die Abschlussverarbeitung ist idempotent (erneuter Lauf derselben Periode vergibt nicht erneut).
- [x] Backend-Tests: Vergabe an den Gewinner, Idempotenz, keine Vergabe ohne Gewinner.

## Comments

- 2026-11-13: Umgesetzt.
  - `LotteryAwardListener` (Handelsmodul, importiert `AwardsModule`) meldet sich beim Ereignis „Lotterie gezogen“ von `TradeLotteryService` (tmw-T9) an und vergibt dem Gewinner `LOTTERY_WINNER` mit `incrementExisting`; Prestige und Systemnachricht des Awards kommen wie bei allen Awards aus `AwardService.grant`.
  - Idempotenz: Das Ereignis entsteht nur, wenn eine Periode tatsächlich gezogen wird; die Ziehung läuft je Periode genau einmal (Advisory-Sperre, Gewinner-Markierung). Ein zweiter Lauf derselben Periode vergibt daher nichts. Die Vergabe läuft nach dem Commit der Ziehung; schlägt sie fehl, wird das protokolliert und die Ziehung bleibt gültig (kein automatischer Nachtrag).
  - Tests in `trade-lottery.int-spec.ts` mit echtem `AwardService`: Vergabe an den Gewinner, kein zweites Mal bei erneutem Lauf derselben Periode, Hochzählen beim Gewinn einer weiteren Periode, keine Vergabe ohne Ziehung (keine Lose bzw. nicht am Monatsersten). Die Mutationsprobe (ohne `incrementExisting`) lässt den Test scheitern.
