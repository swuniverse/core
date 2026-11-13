# Basishandel: endgültige Warenliste und Startkurse

**Status:** resolved
**Priority:** P2
**Size:** S
**Blocked by:** tmw-T7a

## Ziel

tmw-T7a führt den Basishandel mit einem vorläufigen Seed ein (drei STU-Testdaten-Waren). Dieses Issue legt fest, welche Waren SWU im Basishandel anbietet und mit welchen Startkursen, und ersetzt die Konfiguration. Es ist eine reine Datenänderung mit Migration bzw. Seed.

## STU-Quellen

- `testdata/Migrations/VersionTestBasicTrade.php` (Waren 2, 4, 21)
- `src/Orm/Entity/BasicTrade.php`, `src/Module/Trade/Lib/BasicTradeItem.php`

## SWU-Pfade

- `game-data/data/trade/basic-trade.yaml` (aus tmw-T7a), `game-data/data/commodities/stu-commodity-map.yaml`
- Seed bzw. Migration im Modul `apps/backend/src/modules/trade/`

## Akzeptanzkriterien

- [x] Die Konfiguration `basic-trade.yaml` enthält für beide Fraktionsnetze genau Doonium, Transparistahl und Durastahl-Legierung mit den STU-Startwerten.
- [x] Eine Migration legt für neue Waren Startkurse an und lässt bestehende Kursverläufe unverändert. Entfallene Waren des vorläufigen Seeds werden ausgeblendet, ohne die Historie zu löschen.
- [x] Backend-Test: Der Seed ist idempotent, und bestehende Kurse bleiben unverändert.

## Entscheidung

Vorgabe: Variante (a). Warenliste Doonium, Transparistahl und Durastahl-Legierung (STU-Waren 2, 4, 21 laut `VersionTestBasicTrade.php`) mit den STU-Startwerten, identisch in den Netzen von Imperium und Rebellenallianz. Keine fraktionsspezifischen Listen.

## Comments

- 2026-10-21 Product Owner: Option a – Der Basishandel startet wie die STU-Testdaten mit Doonium, Transparistahl und Durastahl-Legierung zu STU-Startwerten in beiden Fraktionsnetzen; Erweiterungen folgen später nach Spielerfeedback.
- 2026-11-13: Umgesetzt.
  - Konfiguration `game-data/data/trade/basic-trade.yaml`: Netze 1 (Imperium) und 2 (Rebellenallianz) mit genau Doonium (2), Transparistahl (4) und Durastahl-Legierung (21). Startwert ist jeweils der älteste STU-Testkurs der Ware: 189643, 94492, 54151. Der vorläufige Seed aus `tmw-T7a` hatte für Transparistahl 94010 verwendet (den neuesten Testkurs); korrigiert. Auf Datenbanken, in denen der Startkurs schon angelegt ist, bleibt der vorhandene Verlauf wie gefordert unverändert.
  - Seed statt SQL-Migration: Der idempotente Start-Seed aus `tmw-T7a` legt für neu konfigurierte Waren je Netz einen Startkurs an und lässt bestehende Verläufe unverändert; eine Migration würde Spieldaten aus dem Submodul lesen müssen. Entfernte Waren erscheinen nicht mehr in Kontoübersicht und Diagrammen und können nicht mehr gehandelt werden („Diese Ware wird im Basishandel nicht angeboten“); ihre Historie bleibt erhalten.
  - Prüfungen: `basic-trade-config.spec.ts` prüft die echte Konfiguration gegen die Entscheidung und die Warennamen in `stu-commodity-map.yaml`; `basic-trade.int-spec.ts` um einen Lebenszyklustest erweitert (neue Ware wird für beide Netze angelegt, bestehende Kurse bleiben, entfernte Ware ausgeblendet und nicht handelbar, Historie erhalten, Seed idempotent); Mutationsprobe (Handelssperre für entfernte Waren entfernt) lässt ihn scheitern. `nx run-many -t lint typecheck build -p shared backend frontend` grün; Backend 2037/2037.
