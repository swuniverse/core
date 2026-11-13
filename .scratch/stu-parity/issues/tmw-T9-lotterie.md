# Lotterie des Hutten-Kartells

**Status:** resolved
**Priority:** P2
**Size:** S
**Blocked by:** tmw-T3

## Ziel

Spieler mit Lizenz am Hutten-Posten kaufen Lose für je 1 Aurodium aus ihrem Konto dort. Am Monatsersten wird gezogen: Ein zufälliges Los gewinnt 80 % der Lose als Aurodium, Prestige in Höhe seiner Losanzahl und ggf. ein Schiff aus einem fraktionsabhängigen Gewinnbauplan. Alle anderen Teilnehmer werden benachrichtigt. Zusätzlich verteilt die Ziehung wie in STU zufällig Freilose für die neue Periode. Die Lotterie gehört zum Handel und ist damit im Scope (Leitplanke 3). Den Award für den Gewinner hängt soc-G2c an das hier bereitgestellte Ereignis „Lotterie gezogen“.

## STU-Quellen

- `src/Module/Trade/Action/BuyLotteryTickets/BuyLotteryTickets.php` (Lizenz am Händlerposten, NPCs ausgeschlossen, 1 Latinum je Los)
- `src/Module/Trade/View/ShowLottery/*`, `src/html/trade/lottery.twig`
- `src/Module/Trade/Lib/LotteryFacade.php` (Periode = Monat, Lose je Periode und Spieler)
- `src/Module/Maintenance/EndLotteryPeriod.php` (nur am Tag 1; Jackpot `ceil(n/100×80)`; Award `LOTTERY_WINNER`; Prestige = eigene Lose; Schiff aus `LotteryWinnerBuildplan` nach Fraktion und Chance; Nachrichten an Gewinner und Verlierer; Freilose)
- `src/Orm/Entity/LotteryTicket.php`, `LotteryWinnerBuildplan.php`

## SWU-Pfade

- Modul `apps/backend/src/modules/trade/`, Hutten-Posten und NPC aus tmw-T1 bzw. tmw-W1, Lizenzprüfung aus tmw-T2
- `apps/backend/src/modules/prestige/prestige.service.ts`; Award-Anbindung folgt in soc-G2c
- Schiffserzeugung wie tmw-T8a (`adminSpawnShip`, `admin-ship-buildplan.entity.ts`)
- Wartung: sh-AP-07 (falls vorhanden), sonst täglicher Cron (Europe/Berlin)
- Frontend: `apps/frontend/src/pages/trade.tsx` (Tab „Lotterie“)

## Akzeptanzkriterien

- [x] Die Entitäten `LotteryTicket` (Spieler, Periode `YYYY.MM`, Gewinner-Flag) und `LotteryWinnerBuildplan` (Fraktion, Bauplan, Chance) sind angelegt. Admins pflegen die Gewinnbaupläne.
- [x] `POST trade/lottery/tickets { amount }` setzt die STU-Prüfungen um, bucht das Aurodium vom Konto am Hutten-Posten ab und legt die Lose an.
- [x] `GET trade/lottery` liefert die Lose der aktuellen Periode (gesamt und eigene), den möglichen Jackpot und Gewinner und Lose der Vorperiode.
- [x] Ein täglicher Job zieht nur am Monatsersten und nur einmal je Periode. Er setzt alle STU-Regeln um: Jackpot, Prestige, Schiff am Postenort, Nachrichten, Freilose. Danach löst er ein internes Ereignis „Lotterie gezogen“ (Periode, Gewinner) aus, an das soc-G2c den Award hängt.
- [x] Der Tab „Lotterie“ zeigt Statistik, Kaufformular und letzte Ziehung.
- [x] Backend-Tests mit festgesetzter Uhr und deterministischem Zufall: Kaufprüfungen, Ziehung nur am Ersten, Idempotenz, Jackpotberechnung, Schiffsvergabe nach Fraktion, Nachrichten. Frontend-Test: Kauf und Anzeige.

## Comments

- 2026-11-13: Umgesetzt.
  - Entitäten `LotteryTicket` (Spieler, Periode `YYYY.MM`, `isWinner` – leer bis zur Ziehung) und `LotteryWinnerBuildplan` (Fraktion, Admin-Bauplan, Chance > 0), Migration `20261113140000-add-trade-lottery`. Admins pflegen die Gewinnbaupläne über `admin/trade/lottery-buildplans` und auf der Seite `/admin/trade-deals` („Hutten-Deals und Lotterie“).
  - `POST trade/lottery/tickets { amount }` nach STU `BuyLotteryTickets`: Lizenz am Hutten-Posten, NPCs ausgeschlossen, 1 Aurodium je Los vom Konto dort, Lose der aktuellen Periode. Anzahl < 1 wird abgewiesen (STU kehrt still zurück).
  - `GET trade/lottery`: Periode, Lose gesamt und eigene, möglicher Jackpot, eigenes Aurodium, letzte Ziehung (Periode, Lose, Jackpot, Gewinner, eigene Lose).
  - Ziehung (`TradeLotteryService.draw`) als täglicher Wartungs-Handler `trade-lottery` (03:00 Europe/Berlin): nur am Monatsersten in der Spielzeitzone, zieht die Periode des Vortags und nur einmal (Advisory-Sperre je Periode, eine bereits markierte Periode wird übersprungen). STU-Regeln: Jackpot `ceil(n×80/100)` aufs Konto am Hutten-Posten ohne Platzprüfung, Prestige = eigene Lose mit Prestigelog, Schiff aus den Gewinnbauplänen der Gewinnerfraktion nach Chance am Postenort („Lotteriegewinn (TT.MM.JJJJ)“, über den Schiffs-Port aus tmw-T8a), Nachrichten an Gewinner und jeden anderen Teilnehmer, Freilose für die neue Periode mit Nachricht.
  - Freilose: STU rechnet `10 × (ID − erste Spieler-ID) / Spielerzahl` Prozent; SWU-IDs sind nicht lückenlos, daher steht der Rang nach ID für die ID (neuere Spieler höhere Chance, höchstens knapp 10 %).
  - Ereignis „Lotterie gezogen“: `TradeLotteryService.onDrawn(listener)` meldet nach dem Commit `{ period, winnerUserId }`; Fehler eines Listeners brechen die Ziehung nicht ab. soc-G2c hängt dort den Award an.
  - Kontolöschung: `TradeDeletionHandler` entfernt auch die Lose des Spielers; offen bleibt dort nur tmw-T8b.
  - Frontend: Tab „Lotterie“ mit Statistik, Kaufformular (nur mit Lizenz) und letzter Ziehung.
  - Tests mit fester Uhr und festgelegtem Zufall: `trade-lottery.int-spec.ts` (Kauf und STU-Prüfungen, Ziehung nur am Ersten, Jackpot/Prestige/Schiff/Nachrichten/Ereignis, Idempotenz, Schiff nach Fraktion bzw. keines ohne Gewinnbauplan, Freilose, keine Lose, Admin-Pflege), `trade-deletion.int-spec.ts` erweitert, `TradeLotteryTab.spec.tsx`, `admin-trade-deals.spec.tsx`. Mutationsproben (Idempotenzprüfung, Tagesprüfung entfernt) lassen Tests scheitern.
