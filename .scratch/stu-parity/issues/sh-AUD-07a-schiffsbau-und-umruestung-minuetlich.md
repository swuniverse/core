# Schiffsbau und Umrüstung minütlich abschließen wie STU-Process-Tick

**Status:** ready-for-agent
**Priority:** P1
**Size:** M
**Blocked by:** —

## Ziel

SWU schließt Schiffsbau und Umrüstung der Kolonie- und Stationswerft nur im Haupttick ab. Die Werftqueue wird nur in `ColonyTickProcessorService#processTick` → `processShipBuildQueue` verarbeitet, Stationswerften nur in `SpacecraftService#processTick` → `StationShipyardService#processTick`; beide laufen nur aus `TickService#handleTick` (Default 0, 12, 15, 18, 21 Uhr). Es gibt keinen Lazy-Abschluss und keinen weiteren Cron. Ein Schiff mit 2 h Bauzeit, um 0:30 gestartet, zeigt 2:30 als Fertigstellung, erscheint aber erst um 12:00 – bis zu ~12 h Verzug. Minütlich läuft heute nur der Gebäude-/Terraforming-Abschluss (`checkBuildingCompletions`).

STU erledigt diese Aufträge im **Process-Tick jede Minute** (`ProcessTickRunner`, `everyMinute`): `FinishShipBuildJobs` (Kolonie- und Stationswerft, Auftrag fertig bei `finish_date <= time()`) und `FinishShipRetrofitJobs`. Der Process-Tick prüft keinen Urlaub.

Dieses Ticket verlegt den **Abschluss** von Bau- und Umrüstungsaufträgen (Kolonie und Station) in einen minütlichen Lauf. Reparaturen folgen in sh-AUD-07b.

## STU-Quellen

- `resource/cron/TickTasks.php` (Z. ~66–74, `ProcessTickRunner` `everyMinute`)
- `src/Module/Tick/Process/ProcessTickRunner.php`
- `src/Module/Tick/services.php` (Z. ~121–130, `ProcessTickHandlerInterface`-Liste)
- `src/Module/Tick/Process/FinishShipBuildJobs.php` (Z. 21–60, Kolonie- und Stationswerft)
- `src/Module/Tick/Process/FinishShipRetrofitJobs.php` (Z. 21 ff.)
- `src/Module/Colony/Action/BuildShip/BuildShip.php` (Z. ~271–272, `finish_date = time() + buildtime`)

## SWU-Pfade

- `apps/backend/src/modules/tick/tick.service.ts` (`@Cron` Haupttick Z. ~83, minütlicher `checkBuildingCompletions` Z. ~311–376, Haupttick-Aufrufe Z. ~176 und ~239)
- `apps/backend/src/modules/tick/entities/game-tick-state.entity.ts` (`GameTickType`), `packages/shared/src/lib/common/index.ts` (`TICK_RUN_TYPES`)
- `apps/backend/src/modules/tick/tick-admin.service.ts`, `apps/frontend/src/pages/admin-ticks.tsx` (Laufhistorie)
- `apps/backend/src/modules/colony/colony-tick-processor.service.ts` (Z. ~229–245, `processShipBuildQueue`-Aufruf Z. ~238)
- `apps/backend/src/modules/colony/colony-shipyard.service.ts` (`processShipBuildQueue` Z. ~1228–1325, `finishShipBuildQueue` ~1330, `finishShipRetrofitQueue` ~1425)
- `apps/backend/src/modules/spacecraft/spacecraft.service.ts#processTick` (Z. ~4922–4925), `station-shipyard.service.ts#processTick` (Z. ~148–164)
- `apps/backend/src/modules/shipbuilding/` (`ShipbuildingCoreService#completeBuild`)
- Tests: `apps/backend/src/modules/shipbuilding/shipbuilding-workflow.int-spec.ts`, `apps/backend/src/modules/spacecraft/station-shipyard.service.spec.ts`, `apps/backend/src/modules/colony/colony-tick.spec.ts`

## Akzeptanzkriterien

- [ ] Ein minütlicher Lauf (eigener `GameTickType`, z. B. `PROCESS`, oder Erweiterung von `BUILDING_COMPLETION`) schließt alle fälligen Bau- und Umrüstungsaufträge der Kolonie- und Stationswerften ab (`finishesAt <= now`, Status `QUEUED`). Ohne fällige Aufträge schreibt er keinen Laufeintrag (wie `checkBuildingCompletions`).
- [ ] Die Abfrage fälliger Aufträge ist global (eine Query über alle Kolonien/Stationen), nicht ein Laden aller Kolonien.
- [ ] Abschluss ist idempotent und nebenläufigkeitssicher gegenüber Haupttick, Abbruch und Admin-„Alle Bauten fertig“ (Sperre je Auftrag, kein doppeltes Schiff). Der Haupttick schließt Bau und Umrüstung nicht mehr zusätzlich ab.
- [ ] Wie STU ohne Urlaubsprüfung: Aufträge von Spielern im Urlaub werden ebenfalls abgeschlossen (siehe sh-AUD-05).
- [ ] Schiffsmeldung, Ereignis und WebSocket-Benachrichtigung wie bisher bei Fertigstellung.
- [ ] Der Lauf erscheint in der Admin-Tick-Historie mit Status, Dauer und Fehler.
- [ ] Maindesk „Aktive Prozesse“ und Werftansicht zeigen weiter `finishesAt`; die angezeigte Zeit stimmt jetzt auf ≤ 1 min.
- [ ] Backend-Tests: fälliger Kolonie-Bauauftrag und Umrüstung werden ohne Haupttick fertig; Stationswerftauftrag ebenso; nicht fälliger Auftrag bleibt; doppelter Lauf erzeugt kein zweites Schiff (PostgreSQL-Integrationstest); Urlauberauftrag wird fertig; leerer Lauf schreibt keinen Laufeintrag.

## Herkunft

- [`../audit-2026-11-17/README.md`](../audit-2026-11-17/README.md), Abschnitt B1, Abschnitt E („Bau-/Umrüstungs-Fertigstellung minütlich“) und Abschnitt H („B1 Bau/Umrüstung/Reparatur … kein Lazy-Abschluss und kein weiterer Cron“).
- [`../audit-2026-11-17/shell-admin-runtime.md`](../audit-2026-11-17/shell-admin-runtime.md), G1 und „Unsicherheiten – nachgeprüft“ (G1).
- PO-Linie 2026-11-17 „wie STU“. Bisher kein Ticket; die resolved Tickets col-A3b, col-A5 und sc-WP-STAT-5 haben den Fertigstellungszeitpunkt nicht geprüft.

## Comments
