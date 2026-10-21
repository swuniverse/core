# Lotterie des Hutten-Kartells

**Status:** ready-for-agent
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

- [ ] Die Entitäten `LotteryTicket` (Spieler, Periode `YYYY.MM`, Gewinner-Flag) und `LotteryWinnerBuildplan` (Fraktion, Bauplan, Chance) sind angelegt. Admins pflegen die Gewinnbaupläne.
- [ ] `POST trade/lottery/tickets { amount }` setzt die STU-Prüfungen um, bucht das Aurodium vom Konto am Hutten-Posten ab und legt die Lose an.
- [ ] `GET trade/lottery` liefert die Lose der aktuellen Periode (gesamt und eigene), den möglichen Jackpot und Gewinner und Lose der Vorperiode.
- [ ] Ein täglicher Job zieht nur am Monatsersten und nur einmal je Periode. Er setzt alle STU-Regeln um: Jackpot, Prestige, Schiff am Postenort, Nachrichten, Freilose. Danach löst er ein internes Ereignis „Lotterie gezogen“ (Periode, Gewinner) aus, an das soc-G2c den Award hängt.
- [ ] Der Tab „Lotterie“ zeigt Statistik, Kaufformular und letzte Ziehung.
- [ ] Backend-Tests mit festgesetzter Uhr und deterministischem Zufall: Kaufprüfungen, Ziehung nur am Ersten, Idempotenz, Jackpotberechnung, Schiffsvergabe nach Fraktion, Nachrichten. Frontend-Test: Kauf und Anzeige.

## Comments
