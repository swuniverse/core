# Traktorstrahl: lösen, Ziel beim Ziehenden, gehaltenes Schiff andocken

**Status:** resolved
**Priority:** P2
**Size:** M
**Blocked by:** —

## Ziel

Ein aktivierter Traktorstrahl lässt sich in SWU nicht wieder lösen: `DELETE :id/tractor` hat keinen Frontend-Aufrufer. Der Ziehende sieht sein Ziel nirgends, weil das Detail-DTO nur `tractor.heldBy` für das Opfer trägt. Stationen können gehaltene Schiffe nicht andocken. STU zeigt eine Traktor-Box mit gehaltenem Schiff, „deaktivieren“, „Fluchtversuch“ und an Stationen „Gehaltenes Schiff andocken“.

## STU-Quellen

- `src/html/spacecraft/control/control_right.twig` (Traktor-Box, `B_DEACTIVATE_TRACTOR`, `B_ESCAPE_TRAKTOR`, `B_DOCK_TRACTORED`)
- `src/Module/Spacecraft/Action/DeactivateTractorBeam/`
- `src/Module/Station/Action/DockTractoredShip/DockTractoredShip.php` (Crew der Station, 1 EPS, freier Dockplatz, Ziel nicht in Flotte mit mehr als einem Schiff, Ziel auf Alarm Grün; danach Traktor aus, PM an Eigner)

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/spacecraft.controller.ts` (`DELETE :id/tractor`, Z. ~1376)
- `apps/backend/src/modules/spacecraft/spacecraft-tractor.service.ts`
- `apps/backend/src/modules/spacecraft/spacecraft-docking.service.ts` (neue Aktion „gehaltenes Schiff andocken“)
- `packages/shared/src/lib/spacecraft/index.ts` (`tractor` im Detail-DTO, Z. ~556)
- `apps/frontend/src/pages/spacecraft-detail.tsx` (Traktor-Box, bisher nur Opferseite Z. ~162–188)

## Akzeptanzkriterien

- [x] Detail-DTO liefert beim Ziehenden das gehaltene Ziel (`tractor.holding: { id, name }`).
- [x] Die Traktor-Box zeigt beim Ziehenden das gehaltene Schiff und „deaktivieren“ (ruft `DELETE :id/tractor`); beim Opfer bleibt „Entkommen“.
- [x] Neuer Endpunkt „gehaltenes Schiff andocken“ für Stationen mit STU-Prüfungen (Stationscrew, 1 EPS, freier Dockplatz, Ziel nicht in Mehrschiff-Flotte, Ziel auf Grün); danach ist das Ziel angedockt, der Traktor aus und der Eigner erhält eine PM.
- [x] Knopf „Gehaltenes Schiff andocken“ in der Traktor-Box einer Station, Fehlermeldungen je Grund.
- [x] Backend-Tests für Lösen und Andocken inkl. Ablehnungsgründe; Frontend-Tests für Box beim Ziehenden, Lösen und Andocken.

## Herkunft

- Audit 2026-11-17: [README.md](../audit-2026-11-17/README.md) Abschnitt A („Traktorstrahl lösen, gehaltenes Schiff andocken“) und D; [spacecraft.md](../audit-2026-11-17/spacecraft.md) große Abweichung 3, Seitenabgleich „Traktorstrahl-Box“.
- Resolved-Ticket mit nicht erfüllter Akzeptanz: [sc-WP-TRACT-1a](sc-WP-TRACT-1a-traktorstrahl-kern-eigene-schiffe.md) (Kriterium „Deaktivieren jederzeit“ im UI nicht erreichbar).

## Comments

- 2026-11-20 – umgesetzt, Prüfung ausstehend. Commit: `feat(spacecraft): release tractor beam and dock the held ship (stu-parity sc-AUD-03)`.
  - Backend: Detail-DTO `tractor.holding: { id, name } | null` beim Ziehenden. Neu `POST /spacecraft/:id/tractor/dock` → `SpacecraftDockingService.dockTractored` nach STU `DockTractoredShip`: nur eigene Station, Station hält ein Schiff, Stationscrew, 1 EPS der Station, freier Dockplatz, Ziel nicht in Flotte mit mehr als einem Schiff, Ziel auf Alarm Grün; danach Ziel angedockt, Traktor aus (`tractoredShipId` null, `TRACTOR_BEAM.active` false), Reparaturaufträge des Ziels wie beim normalen Andocken abgebrochen, Systemnachricht „Die X wurde an der Station Y angedockt“ an den Zieleigner nach dem Commit. Sperren: Station und Ziel in aufsteigender ID-Reihenfolge (wie übrige Docking-Aktionen), Traktorbindung nach dem Sperren erneut geprüft.
  - Abweichung: Schilde/Warp des Ziels werden wie beim regulären SWU-Andocken abgeschaltet (STU tut das hier nicht; SWU-Invariante für angedockte Schiffe).
  - Frontend (`spacecraft-detail.tsx`): Traktor-Box beim Ziehenden mit „Traktorstrahl: hält X“, „deaktivieren“ (`DELETE :id/tractor`) und an Stationen „Gehaltenes Schiff andocken“; Server-Fehlertext bzw. Erfolgsmeldung als Status, danach Schiff/Lager neu geladen. Opferbox mit „Entkommen“ unverändert.
  - Geprüft: `nx typecheck` backend/frontend/shared grün; Backend-Unit `spacecraft` 762/763 (rot nur das unabhängige `resource-collection.controller.spec`), neu: Andocken Erfolg, Ablehnungen (kein gehaltenes Schiff, EPS, Dockplatz, Mehrschiff-Flotte, nicht Grün, Crew, fremde Station), Einschiff-Flotte erlaubt, Lösen durch Fremden abgelehnt; Frontend `pages/spacecraft*` + `components/spacecraft` 254/254, neu: Box beim Ziehenden + Lösen, Station andocken mit Fehlermeldung; ESLint 0 Fehler.
  - Ausstehend: PostgreSQL-Integration (Sperren/Speichern von Station+Ziel, Nest-DI von `MessagingService` im `SpacecraftDockingService`), Browserprüfung (Traktor aktivieren, Box beim Ziehenden, Lösen, Station dockt gehaltenes Schiff).
  - Modell: Opus 5.5 direkt (gleichzeitige Schreibvorgänge/Spielregel), keine Delegation.
- 2026-11-20 – **resolved nach Verifikation.** Review ok; Nest-DI und Sperren über die Integrationssuite abgedeckt. Gesammelter Verifikationslauf 2026-11-20 (Claude Opus 5.5, Sol nicht verfügbar): Diff-Review gegen die Akzeptanzkriterien; `npm run lint` 0 Fehler, `npm run typecheck` grün, `npm run test` grün (Backend 2700/2700, Frontend 972/972), PostgreSQL-Integrationssuite inkl. aller Migrationen 1058/1062 – die 4 Fehler lagen in zwei veralteten Test-Fixtures (`profile-friends.int-spec.ts`: `shipRepo`-Mock ohne `manager` seit sc-AUD-13; `layer-access-http.int-spec.ts`: `MAP_EDITOR` nur im JWT, seit col-AUD-16a liest `JwtStrategy` Rechte aus der DB), korrigiert und erneut 54/54 grün. Browserprüfungen entfallen laut Nutzerentscheid vom 2026-11-20.
