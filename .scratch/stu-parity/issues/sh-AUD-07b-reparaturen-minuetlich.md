# Werft-, Stations- und Eigenreparatur minütlich abschließen wie STU-Process-Tick

**Status:** claimed
**Priority:** P1
**Size:** M
**Blocked by:** sh-AUD-07a

## Ziel

Wie Bau und Umrüstung (sh-AUD-07a) laufen in SWU auch die Reparaturen nur im Haupttick:
- Werftreparatur in der Kolonie (`ColonyShipBuildQueueMode.REPAIR` in `processShipBuildQueue`, inkl. Pausieren/Reaktivieren je Reparaturslot),
- passive Reparatur an Stationen (Queue und Eigenreparatur, `StationRepairService#processTick`),
- Eigenreparatur eines Systems an Bord (`SpacecraftRepairService#processTick`, Dauer bis 3 h).

STU erledigt das im **minütlichen Process-Tick**: `FinishPassiveShipRepairJobs` (Kolonie- und Stationsreparatur je Schritt, Pausieren/Starten nach Slots, Meldungen) und `RepairTaskJobs` (Eigenreparatur, Abbruch bei zu wenig Crew).

Dieses Ticket verlegt diese drei Reparaturpfade in den minütlichen Lauf aus sh-AUD-07a.

## STU-Quellen

- `src/Module/Tick/Process/FinishPassiveShipRepairJobs.php` (Z. 47–51 `work`, 127 ff. `processQueue`, 207 ff. Pausieren, 300 ff. nächster Auftrag)
- `src/Module/Tick/Process/RepairTaskJobs.php` (Z. 26 ff., Abbruch bei ungenügender Crew)
- `src/Component/Spacecraft/Repair/RepairUtil.php` (Z. ~411, `getPassiveRepairStepDuration`)
- `src/Module/Tick/services.php` (Z. ~121–130)

## SWU-Pfade

- `apps/backend/src/modules/colony/colony-shipyard.service.ts` (`processShipBuildQueue` Reparaturzweig Z. ~1246–1325, `finishShipRepairQueue` ~1340)
- `apps/backend/src/modules/spacecraft/station-repair.service.ts` (`processTick` Z. ~234–253, `queueStep`, `stepEnd` Z. ~414)
- `apps/backend/src/modules/spacecraft/spacecraft-repair.service.ts` (`processTick` Z. ~187 ff.)
- `apps/backend/src/modules/spacecraft/spacecraft.service.ts#processTick` (Aufrufe Z. ~4923 und ~4931–4933)
- `apps/backend/src/modules/tick/tick.service.ts` (minütlicher Lauf aus sh-AUD-07a, `skipRepair` Z. ~240)
- Tests: `apps/backend/src/modules/spacecraft/station-beam-blocker.int-spec.ts`, Suiten zu `station-repair` und `spacecraft-repair`, `colony-tick.spec.ts`

## Akzeptanzkriterien

- [x] Der minütliche Lauf aus sh-AUD-07a verarbeitet zusätzlich fällige Kolonie-Werftreparaturen (inkl. Pausieren bei fehlender Werft/Blockade/Slots und Reaktivieren mit Zeitverschiebung), Stationsreparatur-Queues und -Eigenreparatur sowie fällige Eigenreparatur-Aufträge an Bord.
- [x] Der Haupttick führt diese Schritte nicht mehr zusätzlich aus.
- [x] Urlaub: wie in sh-AUD-05 festgelegt (wirksamer Urlaub über `isVacationEffective`; Process-Pfade wie STU).
- [x] Meldungen und Crew-Erfahrung (`REPAIR_COMPLETED`) wie bisher, genau einmal je Schritt.
- [x] Nebenläufigkeit: Sperre je Station/Auftrag, kein doppelter Reparaturschritt bei überlappenden Läufen.
- [ ] Angezeigte Fertigstellungszeiten (Werft, Station, Schiffsdetail, Maindesk) stimmen auf ≤ 1 min.
- [x] Backend-Tests: Kolonie-Werftreparatur, Stationsreparatur und Eigenreparatur werden ohne Haupttick fertig; Pausieren/Reaktivieren; Abbruch der Eigenreparatur bei zu wenig Crew; kein Doppelschritt bei zwei parallelen Läufen (PostgreSQL-Integrationstest).

## Herkunft

- [`../audit-2026-11-17/README.md`](../audit-2026-11-17/README.md), Abschnitt B1, Abschnitt E und Abschnitt H („B1 Bau/Umrüstung/Reparatur“).
- [`../audit-2026-11-17/shell-admin-runtime.md`](../audit-2026-11-17/shell-admin-runtime.md), G1 und „Unsicherheiten – nachgeprüft“ (G1).
- PO-Linie 2026-11-17 „wie STU“. Bisher kein Ticket; sc-WP-STAT-5 (resolved) hat den Fertigstellungszeitpunkt nicht geprüft. Schildregeneration alle 15 min ist eigenes Ticket sc-AUD-10.

## Comments

### 2026-11-19 – umgesetzt, Prüfung ausstehend

Commit: `fix(tick): finish repairs in the minute runner like STU (sh-AUD-07b)`. Übernommen aus einem abgebrochenen, nicht committeten Vorlauf und fertiggestellt.

- Neuer `RepairCompletionService` im minütlichen Lauf (`TickService.checkBuildingCompletions`): Kolonie-Werftreparaturen (`processShipBuildQueue(colony, true)` inkl. Pausieren/Reaktivieren), Stationsreparatur-Queues (`StationRepairService.processQueue`) und fällige Bord-Reparaturen (`SpacecraftRepairService.processTick`, Abbruch bei zu wenig Crew). `hasWork` verhindert leere Historienzeilen; ein fehlschlagender Eintrag hält die übrigen nicht auf, der Lauf schlägt trotzdem fehl.
- Haupttick: Kolonie-Reparatur (auch im Urlaubspfad) und Bord-Reparatur entfernt; `StationRepairService.processTick` macht nur noch die Eigenreparatur.
- **Abweichung vom Tickettext, wie STU:** Die Stations-Eigenreparatur bleibt im Haupttick, weil STU sie in `StationPassiveRepairHandler` (Spacecraft-Tick) und nicht in `FinishPassiveShipRepairJobs` erledigt.
- Urlaub: Der Minutenlauf filtert keinen Urlaub, wie der STU-Process-Tick.
- Nebenläufigkeit: Der Kolonie-Reparaturschritt läuft jetzt unter `withLockedShipyardJob` (gleiche Sperrreihenfolge wie BUILD/RETROFIT) mit erneuter Prüfung von Modus/Status/Fälligkeit; die Meldung geht nach dem Commit raus. Station (Zeilensperre auf der Station) und Bord-Reparatur (Sperre auf dem Auftrag, Fälligkeit neu geprüft) waren schon gesperrt.
- Aufräumen: ungenutzter `ColonyShipyardService`-Parameter aus `ColonyTickProcessorService` und `ColonyService.processShipRepairQueue` entfernt.

**Geprüft:** Unit `tick`, `spacecraft-repair`, `station-repair`, `colony-tick`, `building-upgrade-reactivation` 342/342 (neu: `repair-completion.spec.ts`, Crew-Abbruch). PostgreSQL: neuer Test „minute repair: overlapping runs take exactly one colony shipyard repair step“ grün, Gegenprobe ohne Fälligkeits-Neuprüfung rot. Weitere Int-Suiten grün: shipbuilding-workflow, alert-reaction, last-combat-report, station-beam-blocker, anomaly-tick (47) sowie movement/fleet-concurrency, wormhole-passage, navicomputer-jump, rpg-transponder, starmap-contacts-requests, station-uplink (182). `nx typecheck backend` grün, ESLint 0 Fehler.

**Ausstehend:** Kriterium „angezeigte Fertigstellungszeiten ≤ 1 min“ im Browser (Werft, Station, Schiffsdetail, Maindesk); voller Regressionslauf im Sammelpass; PostgreSQL-Doppelschritt-Test für Station/Bord-Reparatur (nur durch bestehende Sperren abgedeckt).

Modell: Opus 5.5 direkt, keine Delegation.

