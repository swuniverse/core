# Maindesk-Restparität: neue HoloNet-Beiträge, Werftprozesse, rechte Spalte

**Status:** ready-for-agent
**Priority:** P2
**Size:** S
**Blocked by:** —

## Ziel

Das Maindesk erhält die fehlenden STU-Elemente: eine Box „Neue HoloNet-Beiträge“ mit Markierung seit dem letzten Lesen, Schiffsbau-, Reparatur- und Umrüstfortschritt in der Prozessliste und eine durchgehende rechte Spalte (ca. 350 px) für Limits, Online-Spieler und Fortschritt.

## STU-Quellen

- `src/html/view/maindesk.twig` (Zweispaltenlayout)
- `src/html/maindesk/newKnPostings.twig`, `src/Module/Game/Lib/View/Provider/MaindeskProvider.php` (`NEW_KN_POSTING_COUNT`, `MARKED_KN_ID`)
- `src/html/ship/buildProgress.twig`, `src/html/ship/retrofitProgress.twig`

## SWU-Pfade

- `apps/frontend/src/pages/dashboard.tsx` (`processes`, Grid `xl:grid-cols-[minmax(0,1fr)_300px]`), `apps/frontend/src/pages/dashboard/*` (`DashboardProcesses.tsx`, `DashboardLowerSections.tsx`, `types.ts` `DashboardProcess.kind`)
- `apps/backend/src/modules/holonet/holonet.controller.ts` (`new-count`, `checkpoint`), `holonet.service.ts`
- `apps/backend/src/modules/colony/colony-shipyard.service.ts` (`ColonyShipBuildQueueMode.BUILD|REPAIR|RETROFIT`)
- `apps/backend/src/modules/dashboard/dashboard.service.ts#getOperations` bzw. ein neuer Endpunkt für Werftprozesse

## Akzeptanzkriterien

- [ ] Box „Neue HoloNet-Beiträge (n)“ zeigt bis zu 5 Beiträge seit dem Lesezeichen (Checkpoint) mit Titel, Autor, Datum; Klick springt auf den ersten neuen Beitrag (`/holonet/:id`). Ohne neue Beiträge: „Keine neuen Beiträge“.
- [ ] Prozessliste kennt zusätzlich `SCHIFFSBAU`, `REPARATUR`, `UMRUESTUNG` (Anzeige „Schiffsbau“, „Reparatur“, „Umrüstung“) mit Schiffs-/Klassenname, Kolonie und Fortschritt bzw. Fertigstellungszeit; Daten aus den aktiven Werftqueues des Spielers (ein Endpunkt, keine Abfrage je Kolonie).
- [ ] Layout ab `xl`: links Inhalt, rechts eine Spalte von ca. 350 px mit Kolonielimits, Crewlimit, zufälligem Online-Spieler und Prozessen; darunter wie bisher; mobil einspaltig.
- [ ] Boxen im Maindesk-Standard (Abschnitt 3.3), Datum über `formatDateTime`.
- [ ] Backend-Test: Werftprozesse je Modus. Frontend-Tests: HoloNet-Box mit/ohne neue Beiträge, Prozessarten, Layoutklassen.

## Comments
