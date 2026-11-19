# Schiffsbau und Umrüstung minütlich abschließen wie STU-Process-Tick

**Status:** resolved
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

- [x] Ein minütlicher Lauf (eigener `GameTickType`, z. B. `PROCESS`, oder Erweiterung von `BUILDING_COMPLETION`) schließt alle fälligen Bau- und Umrüstungsaufträge der Kolonie- und Stationswerften ab (`finishesAt <= now`, Status `QUEUED`). Ohne fällige Aufträge schreibt er keinen Laufeintrag (wie `checkBuildingCompletions`).
- [x] Die Abfrage fälliger Aufträge ist global (eine Query über alle Kolonien/Stationen), nicht ein Laden aller Kolonien.
- [x] Abschluss ist idempotent und nebenläufigkeitssicher gegenüber Haupttick, Abbruch und Admin-„Alle Bauten fertig“ (Sperre je Auftrag, kein doppeltes Schiff). Der Haupttick schließt Bau und Umrüstung nicht mehr zusätzlich ab.
- [x] Wie STU ohne Urlaubsprüfung: Aufträge von Spielern im Urlaub werden ebenfalls abgeschlossen (siehe sh-AUD-05).
- [x] Schiffsmeldung, Ereignis und WebSocket-Benachrichtigung wie bisher bei Fertigstellung.
- [x] Der Lauf erscheint in der Admin-Tick-Historie mit Status, Dauer und Fehler.
- [ ] Maindesk „Aktive Prozesse“ und Werftansicht zeigen weiter `finishesAt`; die angezeigte Zeit stimmt jetzt auf ≤ 1 min.
- [x] Backend-Tests: fälliger Kolonie-Bauauftrag und Umrüstung werden ohne Haupttick fertig; Stationswerftauftrag ebenso; nicht fälliger Auftrag bleibt; doppelter Lauf erzeugt kein zweites Schiff (PostgreSQL-Integrationstest); Urlauberauftrag wird fertig; leerer Lauf schreibt keinen Laufeintrag.

## Herkunft

- [`../audit-2026-11-17/README.md`](../audit-2026-11-17/README.md), Abschnitt B1, Abschnitt E („Bau-/Umrüstungs-Fertigstellung minütlich“) und Abschnitt H („B1 Bau/Umrüstung/Reparatur … kein Lazy-Abschluss und kein weiterer Cron“).
- [`../audit-2026-11-17/shell-admin-runtime.md`](../audit-2026-11-17/shell-admin-runtime.md), G1 und „Unsicherheiten – nachgeprüft“ (G1).
- PO-Linie 2026-11-17 „wie STU“. Bisher kein Ticket; die resolved Tickets col-A3b, col-A5 und sc-WP-STAT-5 haben den Fertigstellungszeitpunkt nicht geprüft.

## Comments


### 2026-11-18 – umgesetzt, Prüfung ausstehend

Implementierungscommit (eindeutiger Betreff): `fix(tick): complete shipyard builds and retrofits every minute (sh-AUD-07a)`.
Status bleibt `claimed`; sh-AUD-07b bleibt bis zur separaten Abschlussprüfung blockiert.

- Der vorhandene minütliche `BUILDING_COMPLETION`-Lauf verarbeitet jetzt zusätzlich alle global fälligen `QUEUED`-Aufträge der Modi `BUILD` und `RETROFIT`, sortiert nach Ende/ID. Eine Query über die gemeinsame Queue findet die Aufträge; nur betroffene Kolonien werden für den jeweiligen Abschluss nachgeladen. Ein reiner Werftlauf lädt keine Gebäude-Kolonien. Leere geplante Läufe schreiben keinen Historieneintrag, explizite Admin-Läufe bleiben sichtbar.
- Kolonie-Bau und -Umrüstung sowie Stations-Bau laufen über die bestehenden Quelladapter ohne Urlaubsprüfung. Der vorhandene Stationsvertrag bietet nur Bau, keine Stations-Umrüstung; dieses Ticket ergänzt keine neue Umrüstungs-API. Der Haupttick verarbeitet bei normalen und wirksamen Urlauberkolonien nur noch Werftreparaturen und ruft die Stations-Bauqueue nicht mehr auf. Die Reparaturpfade bleiben bis sh-AUD-07b erhalten.
- BUILD verwendet weiterhin die bestehenden Sperren des gemeinsamen Kerns. RETROFIT und Abbruch sperren nun Spieler, Kolonie, veränderlichen Koloniezustand und Auftrag in fester Reihenfolge. Status, Schiffs-/Moduländerungen und Warenrückgaben werden mit demselben Transaction-Manager gespeichert. Die Umrüstungsreservierung erhält dieselbe vorgelagerte Spieler-/Koloniesperre, um beim Queue-Fremdschlüssel keine umgekehrte Sperrreihenfolge zu erzeugen. Jeder Abschluss prüft Status und Fälligkeit erneut unter Sperre; doppelte Abbrüche geben Waren nur einmal zurück.
- Abschlussmeldungen landen mit stabiler Zustell-ID im Schiffsordner, innerhalb der Abschluss-Transaktion. Ein Nachrichtenfehler rollt Schiff, Module und Queue zurück; nach Commit folgen Nachrichtenbenachrichtigung, `SPACECRAFT_EVENT` und gegebenenfalls `COLONY_UPDATED`. Die vorhandenen Seiten abonnieren diese Ereignisse. `finishesAt`-Verträge und Zeitanzeigen bleiben erhalten.
- Die bestehende Admin-Historie zeigt den Lauf als „Bauabschluss“ mit Beginn, Ende, daraus berechneter Dauer und Fehler. Der bestehende Fehlermailpfad bleibt aktiv. Zwei gleichzeitig eingefügte Historieneinträge mit identischer Laufnummer behandeln die Unique-Verletzung als konkurrierenden Lauf, ohne dessen Aufträge noch einmal auszuführen. Admin-„Alle Bauten fertig“ verwendet denselben Minutenabschluss nach der Zeitverschiebung.

**Sofort geprüft:** kurzer tatsächlicher Diffreview, `git diff --check`, 64 Backend-Unit-Tests und 7 gezielte PostgreSQL-Fälle erfolgreich.

- 37 ausgewählte Fälle aus `colony-tick.spec.ts`: Bau-/Modulabschluss, Umrüstung, Abbruch, Werftslots und Haupttick-Idempotenz.
- `vacation-tick.spec.ts`: 7 Fälle, Urlaub friert nur die Wirtschaft ein; Reparatur bleibt im Haupttick, Bau/Umrüstung werden dort nicht mehr abgeschlossen.
- `station-shipyard.service.spec.ts`: 5 bestehende Stationswerftfälle.
- `minute-shipyard.spec.ts`: 6 Fälle für Werft-only/leer/Admin/Fehler, konkurrierenden Laufeintrag und Reparaturdelegation.
- `shipyard-completion.spec.ts`: 4 Fälle für globale Abfrage, Quell-/Modusdispatch, ausschließlich erfolgreiche Transaktionsgewinner und Fehlerweitergabe.
- `app-module-graph.spec.ts` und `tick-admin.service.spec.ts`: zusammen 5 Fälle.
- Neue PostgreSQL-Fälle in `shipbuilding-workflow.int-spec.ts`: parallele Kolonie-/Stationsabschlüsse im Urlaub, zukünftige/leere Queue, parallele Umrüstung mit genau einmaliger Rückgabe, Abbruch nach Auftragsabfrage, Nachrichtenfehler mit vollständigem Rollback und Wiederholung, doppelte Abbrüche sowie Admin-Sofortabschluss parallel zum Minutenlauf. Testdatenquelle in eigenem Schema; fehlende Statistik-Stammdaten und Admin-Schema-/Tabellenfixtures ergänzt. Keine Betriebsdatenbank verändert.
- ESLint für die unmittelbar geänderten Abschluss-/Sperrpfade und neuen Specs: keine Fehler; fünf bestehende Non-null-Assertion-Warnungen in Koloniewerft/Haupttick verbleiben.

**Separater Prüfpass ausstehend:** vollständiger Kriterien-/Sperrreview einschließlich realem Haupttick und gleichzeitigem Abbruch/Umrüstungsstart; übrige Werft-/Reparaturregressionen und vollständiger Nest-App-Aufbau; Backend/Frontend/Shared-Lint, Typechecks und Build; Browserprüfung von Werft, Maindesk-Prozessen, Fertigstellungszeit und Admin-Historie mit echter Cron-Ausführung. Sichtbare Zeit-/Refreshkriterien bleiben bis dahin offen. Keine umfassenden Prüfungen pro Ticket wiederholt.

Modellrouting: Spielregeln, Transaktionen und Kurzreview direkt im verfügbaren Sitzungsmodell (Sol-Umschaltung nicht verfügbar, dokumentierter Fallback). Ein begrenztes neues Unit-Testmodul an `ticket-coder` (GPT-6 Luna, high) delegiert und geprüft; keine parallelen Produktionsänderungen. Keine messbaren Tokenzahlen verfügbar.
- 2026-11-18 – Prüfpass (Opus 5.5): Befund behoben (`3ee68c69`): ein fehlerhafter Werftauftrag blockierte jede Minute alle späteren Abschlüsse; jetzt laufen alle weiter, der Tick meldet trotzdem jeden Fehler. Zusätzlich war `colony-shipyard-startup.spec.ts` seit dem Transaktionsumbau wirkungslos und prüft jetzt `applyShipRetrofit`. Gesamtlauf auf `bd2ea161`: Backend-Unit 2599/2599, Frontend 917/917, PostgreSQL 902/1041 – die 139 Fehlschläge sind identisch mit dem Stand vor allen acht Prüfpass-Tickets (`26ff9e76~1`; überwiegend globale HTTP-403 und `lastReports`-Konstruktorverschiebung aus sc-WP-UI-4), also keine Regression. Build `backend frontend shared` und Lint 0 Fehler. Offen: Browserprüfung – Werft, Maindesk-Prozesse, Fertigstellungszeit mit echter Cron-Ausführung. Status bleibt `claimed`.
- 2026-11-19 – Abschluss (Opus 5.5): Browserprüfung vom Product Owner als bestanden gesetzt (nicht von Opus selbst im Browser gesehen). Prüflauf auf `7924fb96`: `nx typecheck backend frontend` grün, Build und Lint 0 Fehler, Backend-Unit 2625/2625, Frontend 943/943, PostgreSQL 1048/1048. resolved.
