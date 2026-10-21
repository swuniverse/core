# Maintenance-Gerüst und feste Zeitzone der Ticks

**Status:** ready-for-agent
**Priority:** P1
**Size:** S
**Blocked by:** —

## Ziel

SWU erhält einen täglichen Maintenance-Lauf mit registrierbaren Handlern (STU `MaintenanceTickRunner`), dokumentiert in `game_tick_states` mit eigenem Typ. Er ist der Einhängepunkt für Inaktivitätslöschung (sh-AP-06) und spätere Aufräumjobs anderer Bereiche. Alle Crons laufen mit einer explizit konfigurierten Zeitzone statt der unbestimmten Container-Zeitzone.

Vorgabe: Neue Konfiguration `GAME_TIMEZONE`. Ist sie nicht gesetzt, wird die heutige Prozess-Zeitzone verwendet (keine Verhaltensänderung). Welcher Default künftig gilt, klärt sh-AP-07c (entschieden 2026-10-21: Europe/Berlin; die Umstellung des Defaults erfolgt in sh-AP-07c).

## STU-Quellen

- `src/Module/Tick/Maintenance/MaintenanceTickRunner.php`
- `src/Module/Maintenance/services.php` (Handlerliste)
- `resource/cron/TickTasks.php` (Maintenance 03:00, Zeitzone Europe/Berlin)

## SWU-Pfade

- `apps/backend/src/modules/tick/tick.service.ts` (`@Cron`, `getMainTickNumber`, `getHours()`), `tick.module.ts`
- `apps/backend/src/modules/tick/entities/game-tick-state.entity.ts` (`GameTickType`)
- neue Datei z. B. `apps/backend/src/modules/tick/maintenance.service.ts` mit Injection-Token `MAINTENANCE_HANDLERS`
- `.env.example`

## Akzeptanzkriterien

- [ ] `GameTickType.MAINTENANCE` ergänzt; ein Lauf je Kalendertag (Tick-Nummer = Datum `YYYYMMDD` in `GAME_TIMEZONE`), idempotent über die bestehende Unique-Kombination.
- [ ] `MaintenanceService` mit Cron 03:00 (`timeZone: GAME_TIMEZONE`) ruft registrierte Handler (`{ name; run(now): Promise<string | void> }`) nacheinander auf; ein fehlschlagender Handler wird geloggt, die übrigen laufen weiter; der Lauf endet als FAILED mit gesammelter Fehlermeldung, wenn mindestens einer scheiterte.
- [ ] Alle bestehenden `@Cron` in `tick.service.ts` nutzen `GAME_TIMEZONE`; die Stundenprüfung (`getHours()`) rechnet ebenfalls in dieser Zeitzone (z. B. über `Intl.DateTimeFormat`).
- [ ] `GAME_TIMEZONE` ist in `.env.example` dokumentiert (auskommentiert); ohne Wert gilt die Prozess-Zeitzone; eine ungültige Zeitzone verhindert den Start mit klarer Meldung.
- [ ] Backend-Tests: Handler-Reihenfolge, Fehlertoleranz, Idempotenz am selben Tag, Stundenberechnung mit `GAME_TIMEZONE=Europe/Berlin` für UTC-Zeitpunkte rund um 0 und 12 Uhr Berliner Zeit (Sommer- und Winterzeit), Verhalten ohne gesetzte Variable unverändert.

## Comments
