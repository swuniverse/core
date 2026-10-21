# Award-Auslöser: Lotteriegewinn

**Status:** ready-for-agent
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

- [ ] Beim Abschluss einer Lotterieperiode erhält der Gewinner den Award `LOTTERY_WINNER` mit `incrementExisting` (Mehrfachgewinne zählen hoch).
- [ ] Die Abschlussverarbeitung ist idempotent (erneuter Lauf derselben Periode vergibt nicht erneut).
- [ ] Backend-Tests: Vergabe an den Gewinner, Idempotenz, keine Vergabe ohne Gewinner.

## Comments
