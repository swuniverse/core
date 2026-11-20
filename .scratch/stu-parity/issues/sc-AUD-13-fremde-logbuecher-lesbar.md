# Fremde Logbücher lesbar: Zielscan und Spielerprofil

**Status:** resolved
**Priority:** P2
**Size:** M
**Blocked by:** —

## Ziel

Fremde Logbücher sind in SWU nirgends lesbar. `listLogs` verlangt ein eigenes Schiff, der Zielscan hat kein Logbuchfeld, und das Spielerprofil zeigt keine Logbücher. STU zeigt im Zielscan die Reiter Details, Logbuch und Crew. Der Scan speichert, bis zu welchem Zeitpunkt das Logbuch gelesen wurde. Das Spielerprofil zeigt gruppierte Logbücher: auf dem eigenen Profil alle eigenen, auf fremden Profilen die vom Besucher gescannten, nicht privaten Einträge bis zum Scanzeitpunkt.

## STU-Quellen

- `src/Module/Spacecraft/View/ShowScan/ShowScan.php` (Z. ~136–140, 212–218 `saveSpacecraftLogScan`)
- `src/html/ship/showshipscan.twig` (Reiter, `scancrew` Z. ~136, `scanlogbook` Z. ~152–174)
- `src/Orm/Repository/SpacecraftLogRepository.php` (`getBySpacecraftIdUntil` ohne private Einträge, `getGroupedLogbooksForProfile`, `getScannedProfileRows`)
- `src/Orm/Entity/SpacecraftLog.php` (`is_private`, `deleted`, `edited`)
- `src/Module/Game/Lib/View/Provider/UserProfileProvider.php` (Z. ~56–59), `src/html/view/userprofile.twig` (Z. ~269 ff., Block Schiffslogbücher)

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/spacecraft-communication.service.ts` (`listLogs`/`requireShip`, Z. ~53–60, 259–268)
- `apps/backend/src/modules/spacecraft/entities/ship-log-entry.entity.ts` (kein `isPrivate`)
- `apps/backend/src/modules/spacecraft/spacecraft-scan.service.ts` (Zielscan), `packages/shared/src/lib/spacecraft/index.ts` (`SpacecraftTargetScanDto`, Z. ~763)
- `apps/backend/src/modules/database/database.service.ts` (`getSettler`, Z. ~332)
- `apps/frontend/src/components/spacecraft/TargetScanDialog.tsx`, `CommunicationDrawer.tsx`
- `apps/frontend/src/pages/player-profile.tsx`

## Akzeptanzkriterien

- [x] Logbucheinträge haben ein Flag „privat“ (Migration, Default false), das im `CommunicationDrawer` gesetzt werden kann.
- [x] Der Zielscan liefert die nicht privaten, nicht gelöschten Logbucheinträge des Ziels bis zum Scanzeitpunkt und speichert den Scan (Scanner, Ziel, Zeitpunkt), wenn Einträge vorhanden sind.
- [x] `TargetScanDialog` hat die Reiter Details, Logbuch und Crew (Crew schreibgeschützt nach Posten wie STU, soweit Matrixsensoren/Scanbedingungen es erlauben) sowie den Hinweis „Logbuch verfügbar“ (Anschluss NBS-Icon sc-AUD-06).
- [x] Das Spielerprofil zeigt einen Block „Schiffslogbücher“, gruppiert je Spacecraft (Name, Rumpf), aufklappbar: eigenes Profil alle eigenen Einträge, fremdes Profil nur gescannte, nicht private Einträge bis zum jeweiligen Scanzeitpunkt.
- [x] Backend-Tests für Sichtbarkeit (privat, gelöscht, nach Scanzeitpunkt bearbeitet, fremder Besucher ohne Scan); Frontend-Tests für Scan-Reiter und Profilblock.

## Herkunft

- Audit 2026-11-17: [README.md](../audit-2026-11-17/README.md) Abschnitte C („Spielerprofil“), E („Profil-Logbücher“), H („Fremde Logbücher“); [spacecraft.md](../audit-2026-11-17/spacecraft.md) kleine Abweichungen (Zielscan, Logbücher) und Unsicherheiten „Fremde Logbücher“; [social.md](../audit-2026-11-17/social.md) Nr. 3.
- PO-Linie „wie STU“ vom 2026-11-17; bisher kein Ticket.

## Comments
- 2026-11-20 – Anschluss aus sc-AUD-06: `SpacecraftService.getNearby` setzt `hasLogBook` heute aus allen `ShipLogEntry`-Zeilen. Beim Einführen von „privat“/gelöscht dort filtern.
- 2026-11-20 – umgesetzt, Prüfung ausstehend (Commit „feat(spacecraft): foreign logbooks in target scan and player profile (stu-parity sc-AUD-13)“). Modell: Claude Opus 5.5 direkt; Sol/Luna in dieser Session nicht verfügbar, keine Delegation.
  - Migration `20261120140000-add-ship-log-privacy-and-scans`: `ship_log_entries.isPrivate` (Default false), `editedAt` (STU `edited`, nur Textänderung; Backfill aus `updatedAt`), Tabelle `ship_log_scans` (Scanner, Ziel, Zeitpunkt; Upsert wie STU `saveScan`). Bestehende `[DIRECT:…]`-Einträge (Nahbereichsnachrichten an einen Spieler) werden privat, neue ebenso – sonst wären PMs an Dritte über Scans lesbar.
  - `ship-logbook.ts`: `scanLogbook` (nicht privat, `createdAt`/`editedAt` ≤ Scan, Scan nur bei Einträgen gespeichert) und `profileLogbooks` (eigenes Profil alle eigenen Einträge, fremd nur gescannte bis Scanzeitpunkt). „Gelöscht“: SWU löscht hart, gelöschte Einträge existieren nicht mehr.
  - Zielscan liefert `logbook` und `crewPositions` (`SpacecraftCrewService.getScanCrew`, nach Posten mit Rang und Eigner, ohne Skills wie STU). NBS-`hasLogBook` zählt nur nicht private Einträge (Anschluss sc-AUD-06).
  - Frontend: `CommunicationDrawer` Checkbox „Privat“, `TargetScanDialog` Reiter Details/Logbuch/Crew + „Logbuch verfügbar“, Profilblock „Schiffslogbücher“ (aufklappbar je Schiff, Name + Rumpf, Scanzeit).
  - Checks: `nx run backend:test-integration -- --testPathPatterns ship-logbook` (3/3, PostgreSQL inkl. Migration); Jest database/spacecraft-communication/scan (152/152); Vitest TargetScanDialog, CommunicationDrawer, NearbySensorPanel, player-profile* (52/52); `nx run-many -t typecheck lint -p frontend backend` grün.
  - Ausstehend: gesammelter Verifikationslauf (volle Backend-/Frontend-Suiten, volle Integrationssuite).
- 2026-11-20 – **resolved nach Verifikation.** Review: Fremde sehen nur nicht-private Einträge, die bis zum eigenen Scanzeitpunkt erstellt und zuletzt bearbeitet wurden; gelöschte Einträge sind hart gelöscht. Fixture `profile-friends.int-spec.ts` an den neuen Logbuch-Aufruf angepasst. Gesammelter Verifikationslauf 2026-11-20 (Claude Opus 5.5, Sol nicht verfügbar): Diff-Review gegen die Akzeptanzkriterien; `npm run lint` 0 Fehler, `npm run typecheck` grün, `npm run test` grün (Backend 2700/2700, Frontend 972/972), PostgreSQL-Integrationssuite inkl. aller Migrationen 1058/1062 – die 4 Fehler lagen in zwei veralteten Test-Fixtures (`profile-friends.int-spec.ts`: `shipRepo`-Mock ohne `manager` seit sc-AUD-13; `layer-access-http.int-spec.ts`: `MAP_EDITOR` nur im JWT, seit col-AUD-16a liest `JwtStrategy` Rechte aus der DB), korrigiert und erneut 54/54 grün. Browserprüfungen entfallen laut Nutzerentscheid vom 2026-11-20.
