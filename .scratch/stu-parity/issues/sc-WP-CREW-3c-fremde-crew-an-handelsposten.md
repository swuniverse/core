# Fremde Crew aus Kapseln an Handelsposten überstellen und fremde Crew ablegen

**Status:** ready-for-agent
**Priority:** P3
**Size:** S
**Blocked by:** sc-WP-CREW-3b, tmw-T1

## Ziel

Wie in STU wird beim Bergen fremde Crew an den nächstgelegenen Handelsposten überstellt; ihr Eigner erhält eine Nachricht und sieht sie in „Verschollene Crew“ unter Handelsposten. Fremde Crew an Bord kann abgelegt werden (STU `DumpForeignCrewman`).

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Spacecraft/Action/SalvageEmergencyPods/SalvageEmergencyPods.php` (`sendPMsToCrewOwners`, `getClosestTradePost`)
- `Module/Spacecraft/Action/DumpForeignCrewman/DumpForeignCrewman.php`, `Module/Spacecraft/Lib/Crew/SpacecraftLeaver.php` (`dumpCrewman`)
- `Module/Colony/View/ShowPodsLocations` (`getOrphanedSummaryByUserAtTradeposts`)

## SWU-Pfade

- Handelsposten-Modell aus tmw-T1
- `apps/backend/src/modules/colony/entities/crew-assignment.entity.ts` (neuer Bezug Handelsposten), Migration
- Kapsel-Bergung aus sc-WP-CREW-3b, Ansicht „Verschollene Crew“

## Akzeptanzkriterien

- [ ] Beim Bergen wird fremde Crew dem nächstgelegenen Handelsposten zugeordnet; ohne erreichbaren Posten bricht die Bergung mit Meldung ab (STU).
- [ ] Eigner der fremden Crew erhält eine Systemnachricht mit Postenname und Sektor.
- [ ] „Verschollene Crew“ listet Crew an Handelsposten.
- [ ] Fremde Crew an Bord kann der Schiffseigner ablegen (in Kapsel), der Crew-Eigner kann sie abziehen (mit Nachricht an den Schiffseigner).
- [ ] Backend- und Frontend-Tests.
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Comments
