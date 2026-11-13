# Basishandel mit Kursdiagramm (Mechanik)

**Status:** resolved
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

- [x] Die Entität `BasicTradeRate` (Netz, Ware, buySell, value, rateId, userId, Zeit in ms) ist per Migration angelegt. Ein Seed erzeugt je Fraktionsnetz und konfigurierter Ware einen Startkurs.
- [x] Vorläufiger Seed bis tmw-T7b: die STU-Basishandelswaren 2 (Doonium), 4 (Transparistahl) und 21 (Durastahl-Legierung) mit den STU-Startwerten aus den Testdaten. Die Konfiguration ist ohne Codeänderung austauschbar.
- [x] `POST trade/basic/buy` bzw. `/sell { postId, rateId }` setzen die STU-Formeln exakt um, einschließlich aller Ablehnungen (veralteter Kurs, kein Aurodium bzw. zu wenig Ware, Konto voll, NPC, keine Lizenz an einem NPC-Posten des Netzes). Die Kursfortschreibung ist nebenläufigkeitssicher, zum Beispiel per Sperre je Netz und Ware.
- [x] `GET trade/basic` liefert je lizenziertem NPC-Posten Kontostand, aktuelle Kauf- und Verkaufswerte je Ware und die Diagrammdaten (letzte n Kurse, n per Query, 5–100, Standard 25).
- [x] Der Tab „Basishandel“ zeigt je Ware Icon, „1 Aurodium → x“ und „y → 1 Aurodium“ mit Kaufen- und Verkaufen-Knopf sowie ein Liniendiagramm. Das Diagrammlimit lässt sich einstellen, gespeichert wird es im Browser.
- [x] Backend-Tests: Kursformel (Kauf und Verkauf, Mittelung), veralteter Kurs, Bestands- und Platzprüfung, Netzbindung. Frontend-Tests: Werteanzeige, Kauf ruft die API mit `rateId` auf, Limitwechsel.

## Comments

- 2026-11-13 Product Owner: Ein Kauf geht wie im Issue mit dem Kauf-Modifier −10 in die Kursformel ein. Der STU-Code verwendet dort `$summand = 1` (speichert aber −10); das kehrt die Marktrichtung um und wird als STU-Fehler nicht übernommen.
- 2026-11-13: Umgesetzt.
  - Daten: Entität `BasicTradeRate` (Netz, Ware, buySell, value, rateId als UUID, userId, dateMs) mit Migration `20261113100000-add-basic-trade-rates` und Index nach Netz, Ware und Aktualität. Konfiguration `game-data/data/trade/basic-trade.yaml` (Submodul) mit den Fraktionsnetzen 1 (Imperium) und 2 (Rebellenallianz) und den vorläufigen Waren 2 Doonium (189643), 4 Transparistahl (94010), 21 Durastahl-Legierung (54151); geladen über `GameDataService.getBasicTradeConfig()`. Der Seed beim Start legt je Netz und Ware einen Startkurs nur an, wenn noch keiner existiert.
  - Mechanik: `BasicTradeService` mit `POST trade/basic/buy` bzw. `/sell { postId, rateId }` und `GET trade/basic?limit=` (5–100, Standard 25). STU-Formeln: Kauf 1 Aurodium → `trunc(value / 100)` Ware, Verkauf `trunc(value / 100 × 1.1)` Ware → 1 Aurodium; neuer Kurs = neuester Wert + `trunc((Modifier + Σ buySell der älteren der letzten 5) × 100 / (n + 1))`, Modifier Kauf −10, Verkauf +10, Rundung Richtung null wie PHP `(int)`. Aurodium ist Ware 50 (statt STU Latinum). Ablehnungen wie STU (veralteter Kurs, kein Aurodium, zu wenig Ware, Konto überfüllt, NPC) plus Lizenz- und Netzbindung: nur an einem NPC-Posten mit gültiger Lizenz, dessen Netz zum Kurs gehört (STU prüft das nicht). Kursfortschreibung je Netz und Ware über `pg_advisory_xact_lock`, die Prüfung auf den neuesten Kurs läuft unter dieser Sperre.
  - Frontend: Tab „Basishandel“ (`BasicTradeTab`) je lizenziertem NPC-Posten mit Aurodium-Stand, je Ware Icon, „1 Aurodium → x“ mit „Kaufen“, „y → 1 Aurodium“ mit „Verkaufen“; Liniendiagramm je Netz und Ware (`BasicTradeLineChart`, eine Reihe, Fadenkreuz mit Tooltip, Tabelle für Screenreader); Limit wählbar und im Browser gespeichert.
  - Prüfungen: `basic-trade.formula.spec.ts` (Kauf-/Verkaufswerte, Mittelung ohne neuesten Modifier, Rundung Richtung null); `basic-trade.int-spec.ts` (6 Tests: idempotenter Seed, Kauf senkt und Verkauf hebt den Netzkurs, veralteter Kurs, Bestand, Platz, NPC, Lizenz- und Netzbindung, Nebenläufigkeit, Übersicht mit Limitgrenzen); Mutationsprobe (Prüfung auf neuesten Kurs entfernt) lässt zwei Tests scheitern. Frontend `BasicTradeTab.spec.tsx` (Werteanzeige, Kauf/Verkauf mit `rateId`, veralteter Kurs, Limitwechsel und -speicherung, Diagramm-Tooltip, ohne Lizenz). Alle Handels-Integrationssuiten und App-Boot 8/53 grün. `nx run-many -t lint typecheck build -p shared backend frontend` grün (Warnungen unverändert); Backend 2035/2035; Frontend 721/721. Das Diagramm ist nicht im laufenden Spiel gesichtet worden.
