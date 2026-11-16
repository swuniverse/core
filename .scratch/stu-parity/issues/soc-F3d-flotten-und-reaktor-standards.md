# Einstellungen: Flotte fixieren und Reaktor-Übertrag als Standard

**Status:** resolved
**Priority:** P3
**Size:** S
**Blocked by:** sc-WP-FLEET-2

## Ziel

STU kennt die Einstellungen `FLEET_FIXED_DEFAULT` (neue Flotten sind fixiert) und `WARPSPLIT_AUTO_CARRYOVER_DEFAULT` (Auto-Übertrag der Reaktorverteilung für neue Schiffe). SWU hat `spacecraft.reactorAutoCarryOver`; die Flottenfixierung kommt mit sc-WP-FLEET-2. Die Einstellungen setzen die Standardwerte für neu erzeugte Flotten bzw. Schiffe.

## STU-Quellen

- `src/Module/PlayerSetting/Lib/UserSettingEnum.php` (`FLEET_FIXED_DEFAULT`, `WARPSPLIT_AUTO_CARRYOVER_DEFAULT`)
- `src/Component/Player/Settings/UserSettingsProvider.php`
- `src/Module/Ship/Action/CreateFleet`, Schiffserzeugung (`ShipCreator`)

## SWU-Pfade

- `apps/backend/src/modules/settings/settings.service.ts`
- `apps/backend/src/modules/spacecraft/entities/spacecraft.entity.ts` (`reactorAutoCarryOver`), Flottenerzeugung aus sc-WP-FLEET-1/2
- `apps/backend/src/modules/colony/colony-shipyard.service.ts` (Schiffsbau)
- `apps/frontend/src/pages/settings.tsx`

## Akzeptanzkriterien

- [x] Einstellungen `fleet_fixed_default` und `reactor_auto_carryover_default` (`'0'`/`'1'`), serverseitig validiert, im Einstellungs-UI schaltbar.
- [x] Neu erstellte Flotten übernehmen die Fixierung aus der Einstellung.
- [x] Neu gebaute bzw. erzeugte Schiffe übernehmen `reactorAutoCarryOver` aus der Einstellung.
- [x] Bestehende Flotten und Schiffe bleiben unverändert.
- [x] Backend-Tests für beide Defaults; Frontend-Test für die Schalter.

## Comments

## Answer

`fleet_fixed_default` und `reactor_auto_carryover_default` sind boolesche Einstellungen mit STU-Standard aus. Ein BEFORE-INSERT-Trigger übernimmt sie zentral für Flotten und sämtliche Schiff-/Stations-Erzeugungswege. Die Einstellung wirkt nicht auf Updates oder bestehende Objekte. UI-Schalter sind ergänzt.

## Validation

Alle lint/typecheck/test- und Build-Gates grün: Backend 240 Suites / 2321 Tests, Frontend 124 Dateien / 850 Tests. PostgreSQL: 2 Tests grün für zurückgelieferte Defaults, Stations-/Bulk-Inserts, Besitzerisolierung und unveränderte Altobjekte. Migration in der Dev-DB angewendet.

- 2026-11-16: Vollständig umgesetzt und geprüft.
