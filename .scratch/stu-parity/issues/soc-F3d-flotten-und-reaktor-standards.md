# Einstellungen: Flotte fixieren und Reaktor-Übertrag als Standard

**Status:** ready-for-agent
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

- [ ] Einstellungen `fleet_fixed_default` und `reactor_auto_carryover_default` (`'0'`/`'1'`), serverseitig validiert, im Einstellungs-UI schaltbar.
- [ ] Neu erstellte Flotten übernehmen die Fixierung aus der Einstellung.
- [ ] Neu gebaute bzw. erzeugte Schiffe übernehmen `reactorAutoCarryOver` aus der Einstellung.
- [ ] Bestehende Flotten und Schiffe bleiben unverändert.
- [ ] Backend-Tests für beide Defaults; Frontend-Test für die Schalter.

## Comments
