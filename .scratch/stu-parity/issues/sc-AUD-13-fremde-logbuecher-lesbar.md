# Fremde Logbücher lesbar: Zielscan und Spielerprofil

**Status:** ready-for-agent
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

- [ ] Logbucheinträge haben ein Flag „privat“ (Migration, Default false), das im `CommunicationDrawer` gesetzt werden kann.
- [ ] Der Zielscan liefert die nicht privaten, nicht gelöschten Logbucheinträge des Ziels bis zum Scanzeitpunkt und speichert den Scan (Scanner, Ziel, Zeitpunkt), wenn Einträge vorhanden sind.
- [ ] `TargetScanDialog` hat die Reiter Details, Logbuch und Crew (Crew schreibgeschützt nach Posten wie STU, soweit Matrixsensoren/Scanbedingungen es erlauben) sowie den Hinweis „Logbuch verfügbar“ (Anschluss NBS-Icon sc-AUD-06).
- [ ] Das Spielerprofil zeigt einen Block „Schiffslogbücher“, gruppiert je Spacecraft (Name, Rumpf), aufklappbar: eigenes Profil alle eigenen Einträge, fremdes Profil nur gescannte, nicht private Einträge bis zum jeweiligen Scanzeitpunkt.
- [ ] Backend-Tests für Sichtbarkeit (privat, gelöscht, nach Scanzeitpunkt bearbeitet, fremder Besucher ohne Scan); Frontend-Tests für Scan-Reiter und Profilblock.

## Herkunft

- Audit 2026-11-17: [README.md](../audit-2026-11-17/README.md) Abschnitte C („Spielerprofil“), E („Profil-Logbücher“), H („Fremde Logbücher“); [spacecraft.md](../audit-2026-11-17/spacecraft.md) kleine Abweichungen (Zielscan, Logbücher) und Unsicherheiten „Fremde Logbücher“; [social.md](../audit-2026-11-17/social.md) Nr. 3.
- PO-Linie „wie STU“ vom 2026-11-17; bisher kein Ticket.

## Comments
- 2026-11-20 – Anschluss aus sc-AUD-06: `SpacecraftService.getNearby` setzt `hasLogBook` heute aus allen `ShipLogEntry`-Zeilen. Beim Einführen von „privat“/gelöscht dort filtern.
