# Zeitzone der Ticks festlegen

**Status:** resolved
**Priority:** P2
**Size:** S
**Blocked by:** —

## Ziel

STU plant alle Ticks in Europe/Berlin (Haupttick 0, 12, 15, 18, 21 Uhr, Maintenance 03:00). SWU nutzt dieselben Stunden, aber in der Zeitzone des Containers, die nicht festgelegt ist (vermutlich UTC). Nach sh-AP-07a ist die Zeitzone über `GAME_TIMEZONE` konfigurierbar; offen ist der verbindliche Default.

## STU-Quellen

- `resource/cron/TickTasks.php` (Zeitzone Europe/Berlin)

## SWU-Pfade

- `apps/backend/src/modules/tick/tick.service.ts`, Maintenance-Service aus sh-AP-07a
- `.env.example`, Deployment-Konfiguration (Container `TZ`)
- `apps/frontend/src/hooks/use-status-bar.ts` (Countdown, Anzeige der Tickzeiten)

## Akzeptanzkriterien

- [x] Ohne gesetzte Variable gilt `Europe/Berlin` als Default von `GAME_TIMEZONE` (Änderung gegenüber sh-AP-07a, wo die Prozess-Zeitzone galt); `.env.example` setzt `GAME_TIMEZONE=Europe/Berlin`; die Entscheidung steht in `map.md` unter „Entscheidungen“ (bereits eingetragen).
- [x] Die Tick-Statusanzeige im Frontend zeigt Tickzeiten in der Zeitzone des Spielers (Browser), unabhängig von der Serverzeitzone; Frontend-Test dafür.
- [x] Backend-Test: Tickplan mit Default Europe/Berlin, inklusive Sommer- und Winterzeit.

## Entscheidung

Vorgabe: Variante (a). Default `GAME_TIMEZONE=Europe/Berlin` (Ticks zu festen deutschen Ortszeiten, inkl. Sommerzeitwechsel).

## Comments

- 2026-10-21 Product Owner: Option a – Die Tickstunden gelten in Europe/Berlin wie in STU, inklusive Sommerzeitwechsel; das wird der Default von `GAME_TIMEZONE`.
- 2026-10-27 Agent: Abbruch nach zwei vollständigen Prüfläufen: Die verpflichtende Suite bleibt unabhängig von diesem Issue rot (`spacecraft-destruction.service.spec.ts` erwartet Commodity 10101, erhält 10201; einmalig zusätzlich flakiger `research.spec.tsx`, einzeln grün). Produktcode unter `apps/` und `packages/` wurde verworfen. Bitte Baseline-Test korrigieren bzw. bestätigen, dass der bekannte Fremdfehler für diesen Durchlauf ausgenommen werden darf.
- 2026-10-27 Agent: `Europe/Berlin` ist jetzt der Backend-Default für Cron, Tickstunden und Maintenance-Kalendertage; Sommer- und Winterzeit sind getestet. Der Sidebar-Tick zeigt die nächste absolute Tickzeit browserlokal im Tooltip. Pflichtprüfungen und Builds sind grün.
