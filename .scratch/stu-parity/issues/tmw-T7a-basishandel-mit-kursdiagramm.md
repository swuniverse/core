# Basishandel mit Kursdiagramm (Mechanik)

**Status:** ready-for-agent
**Priority:** P2
**Size:** M
**Blocked by:** tmw-T3

## Ziel

An NPC-Posten seines Fraktionsnetzes (mit Lizenz) kann ein Spieler Waren gegen Aurodium kaufen und verkaufen, zum dynamischen Kurs des Netzes. Jeder Kauf senkt den Kurs, jeder Verkauf hebt ihn, gemittelt über die letzten Kurse wie in STU. Eine Kurs-ID schützt vor zwischenzeitlich geänderten Kursen. Ein Liniendiagramm zeigt die letzten Kurse je Ware mit einstellbarem Limit. Warenliste und Startkurse kommen aus einer Konfiguration. Bis tmw-T7b entschieden ist, gilt der Seed unten.

## STU-Quellen

- `src/Module/Trade/Action/BasicTradeBuy/BasicTradeBuy.php`, `BasicTradeSell/BasicTradeSell.php`: Kauf 1 Aurodium → `value/100` Ware, Verkauf `value/100 × 1.1` Ware → 1 Aurodium. Neuer Kurs = letzter Kurs + `(Modifier + Σ buy_sell der letzten 5) × 100 / (n+1)`, Modifier Kauf −10, Verkauf +10. Prüfung der `uniqid` gegen den aktuellen Kurs. NPCs ausgeschlossen. Kontoplatz und Bestand werden geprüft.
- `src/Component/Trade/TradeEnum.php` (`BASIC_TRADE_LATEST_RATE_AMOUNT = 5`, `BUY_MODIFIER = -10`, `SELL_MODIFIER = 10`), `src/Module/Trade/Lib/BasicTradeItem.php` (`VALUE_SCALE = 100`, `SELL_BUY_ALPHA = 1.1`)
- `src/Module/Trade/View/ShowBasicTrade/ShowBasicTrade.php` (Konten nur an NPC-Posten mit Lizenz, Kurse je Fraktionsnetz, Diagramme), `Action/SetBasicTradeChartLimit/*`
- `src/Orm/Entity/BasicTrade.php` (Fraktion bzw. Netz, Ware, buy_sell, value, uniqid, Spieler, Zeit), `src/Orm/Repository/BasicTradeRepository.php`
- Testdaten `testdata/Migrations/VersionTestBasicTrade.php` (Waren 2, 4, 21; Startwerte ≈ 189643, 94010, 54151)

## SWU-Pfade

- Modul `apps/backend/src/modules/trade/`, Speicherdienst aus tmw-T1
- Konfiguration: `game-data/data/trade/basic-trade.yaml` (neu), Laden über `apps/backend/src/modules/game-data/game-data.service.ts`
- Diagramm: `apps/frontend/src/components/database/StackedAreaChart.tsx` wiederverwenden oder eine schlanke Linienvariante daneben
- Frontend: `apps/frontend/src/pages/trade.tsx` (Tab „Basishandel“)

## Akzeptanzkriterien

- [ ] Die Entität `BasicTradeRate` (Netz, Ware, buySell, value, rateId, userId, Zeit in ms) ist per Migration angelegt. Ein Seed erzeugt je Fraktionsnetz und konfigurierter Ware einen Startkurs.
- [ ] Vorläufiger Seed bis tmw-T7b: die STU-Basishandelswaren 2 (Doonium), 4 (Transparistahl) und 21 (Durastahl-Legierung) mit den STU-Startwerten aus den Testdaten. Die Konfiguration ist ohne Codeänderung austauschbar.
- [ ] `POST trade/basic/buy` bzw. `/sell { postId, rateId }` setzen die STU-Formeln exakt um, einschließlich aller Ablehnungen (veralteter Kurs, kein Aurodium bzw. zu wenig Ware, Konto voll, NPC, keine Lizenz an einem NPC-Posten des Netzes). Die Kursfortschreibung ist nebenläufigkeitssicher, zum Beispiel per Sperre je Netz und Ware.
- [ ] `GET trade/basic` liefert je lizenziertem NPC-Posten Kontostand, aktuelle Kauf- und Verkaufswerte je Ware und die Diagrammdaten (letzte n Kurse, n per Query, 5–100, Standard 25).
- [ ] Der Tab „Basishandel“ zeigt je Ware Icon, „1 Aurodium → x“ und „y → 1 Aurodium“ mit Kaufen- und Verkaufen-Knopf sowie ein Liniendiagramm. Das Diagrammlimit lässt sich einstellen, gespeichert wird es im Browser.
- [ ] Backend-Tests: Kursformel (Kauf und Verkauf, Mittelung), veralteter Kurs, Bestands- und Platzprüfung, Netzbindung. Frontend-Tests: Werteanzeige, Kauf ruft die API mit `rateId` auf, Limitwechsel.

## Comments
