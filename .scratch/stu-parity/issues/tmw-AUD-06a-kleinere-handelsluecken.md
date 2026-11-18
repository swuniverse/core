# Kleinere Handelslücken: Lotterie, Lizenzinfo, Basishandel, Transferknopf

**Status:** ready-for-agent
**Priority:** P3
**Size:** S
**Blocked by:** —

## Ziel

Vier kleine Abweichungen im Handel werden an STU angeglichen:

1. **Lotterie:** „Aktuelle Gewinnchance“ in Prozent wie STU (`ceil(eigene Lose / alle Lose × 100)`, „-“ ohne Lose) und Tabelle „Vergangene Ziehungen“ (Zeitraum, Anzahl Lose; letzte 24 Ziehungen). Jackpot und letzte Ziehung mit Gewinner bleiben.
2. **Lizenzinfo:** „Lizenzgebühr zuletzt geändert“ (Datum der aktuellen Bedingung) und bei gültiger Lizenz die verbleibenden vollen Tage „(n übrig)“ zusätzlich zu „gültig bis“.
3. **Basishandel:** Je Konto Lagerraum (Bestand, rot/grün bei Überfüllung) und Standort des Postens, wie `basictrades.twig`.
4. **Transferknopf an Spielerposten:** In der Kontobox (`AccountsTab`) erscheinen „Transferieren“ und die Zeile Transferkapazität nur an NPC-Posten, wie STU. Heute läuft der Spieler an Spielerposten erst nach dem Absenden in „keine freie Transferkapazität“.

## STU-Quellen

- `src/html/trade/lottery.twig` (Z. 35–36 Gewinnchance, Z. 51–59 Vergangene Ziehungen), `src/Module/Trade/View/ShowLottery/ShowLottery.php` (Z. 37–39), `src/Orm/Repository/LotteryTicketRepository.php` (`getLotteryHistory`)
- `src/html/trade/license/info.twig` (Z. 28 „Lizenzgebühr zuletzt geändert“), `src/Module/Trade/View/ShowLicenseInfo/ShowLicenseInfo.php` (`REMAINING_FULL_DAYS`), `src/Orm/Entity/TradeLicenseInfo.php` (`date`)
- `src/html/trade/basictrades.twig` (Z. 49–55 Lagerraum, Standort)
- `src/html/trade/tradeOfferMenu.twig` (Z. 15–21), `src/html/trade/tradeAccounts.twig` (Z. 72–79)

## SWU-Pfade

- `apps/backend/src/modules/trade/trade-lottery.service.ts` (`overview` Z. 86), `packages/shared/src/lib/trade/index.ts` (`TradeLotteryDto` Z. 427), `apps/frontend/src/components/trade/TradeLotteryTab.tsx`
- `apps/backend/src/modules/trade/entities/trade-license-condition.entity.ts` (Änderungszeitpunkt fehlt → Spalte + Migration), `trade-license-menu.service.ts`, `TradeLicenseMenuDto`, `apps/frontend/src/components/trade/TradeLicensePanel.tsx`
- `apps/backend/src/modules/trade/basic-trade.service.ts` (`getOverview` Z. 112, `BasicTradeAccountDto`), `apps/frontend/src/components/trade/BasicTradeTab.tsx`
- `apps/frontend/src/pages/trade.tsx` (`AccountsTab` Z. 266–269 und 293–301)
- Tests: `TradeLotteryTab.spec.tsx`, `BasicTradeTab.spec.tsx`, `trade.spec.tsx`, Backend-Specs zu Lotterie, Lizenzmenü und Basishandel

## Akzeptanzkriterien

- [ ] `TradeLotteryDto` enthält `winChancePercent` (oder `null`) und `history[]` (Zeitraum, Lose; max. 24, nur gezogene Perioden); die Lotterieseite zeigt beides.
- [ ] Die Lizenzbedingung speichert den Zeitpunkt der letzten Änderung (Migration; Bestand erhält einen sinnvollen Startwert, im Kommentar festhalten); die Lizenzinfo zeigt ihn und die verbleibenden vollen Tage.
- [ ] `BasicTradeAccountDto` enthält Lagerbelegung, Limit, Überfüllung und Standort; die Basishandelsseite zeigt sie.
- [ ] An Spielerposten zeigt die Kontobox weder „Transferieren“ noch die Transferkapazität.
- [ ] Tests je Punkt (Backend für neue Felder, Frontend für Anzeige; Transferknopf fehlt an Spielerposten und ist an NPC-Posten vorhanden).

## Herkunft

- Audit: [README.md](../audit-2026-11-17/README.md) Abschnitt H „Handel und Datenbank: Der Knopf ‚Transferieren‘ erscheint auch an Spielerposten“; [trade-map-world.md](../audit-2026-11-17/trade-map-world.md) Kleine Abweichungen „Lotterie“, „Lizenzinfo“, „Basishandel“, „Transferknopf an Spielerposten“ und „Netztransfer (nachgeprüft)“.
- Teil des Auftrags tmw-AUD-06 (kleinere Handels-/Datenbanklücken), aufgeteilt in a (Handel), b (Ranglisten), c (RPG-Schiffe). tmw-AUD-01b übernimmt die Transferknopf-Regel in die neue Kontobox.

## Comments
