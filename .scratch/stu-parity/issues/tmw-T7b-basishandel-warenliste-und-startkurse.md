# Basishandel: endgültige Warenliste und Startkurse

**Status:** ready-for-agent
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

- [ ] Die Konfiguration `basic-trade.yaml` enthält für beide Fraktionsnetze genau Doonium, Transparistahl und Durastahl-Legierung mit den STU-Startwerten.
- [ ] Eine Migration legt für neue Waren Startkurse an und lässt bestehende Kursverläufe unverändert. Entfallene Waren des vorläufigen Seeds werden ausgeblendet, ohne die Historie zu löschen.
- [ ] Backend-Test: Der Seed ist idempotent, und bestehende Kurse bleiben unverändert.

## Entscheidung

Vorgabe: Variante (a). Warenliste Doonium, Transparistahl und Durastahl-Legierung (STU-Waren 2, 4, 21 laut `VersionTestBasicTrade.php`) mit den STU-Startwerten, identisch in den Netzen von Imperium und Rebellenallianz. Keine fraktionsspezifischen Listen.

## Comments

- 2026-10-21 Product Owner: Option a – Der Basishandel startet wie die STU-Testdaten mit Doonium, Transparistahl und Durastahl-Legierung zu STU-Startwerten in beiden Fraktionsnetzen; Erweiterungen folgen später nach Spielerfeedback.
