# Fremde Crew aus Kapseln an Handelsposten überstellen und fremde Crew ablegen

**Status:** ready-for-agent
**Priority:** P3
**Size:** S
**Blocked by:** sc-WP-CREW-3b, tmw-T1c

## Ziel

Wie in STU wird beim Bergen fremde Crew an den nächstgelegenen Handelsposten überstellt; ihr Eigner erhält eine Nachricht und sieht sie in „Verschollene Crew“ unter Handelsposten. Fremde Crew an Bord kann abgelegt werden (STU `DumpForeignCrewman`).

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Spacecraft/Action/SalvageEmergencyPods/SalvageEmergencyPods.php` (`sendPMsToCrewOwners`, `getClosestTradePost`)
- `Module/Spacecraft/Action/DumpForeignCrewman/DumpForeignCrewman.php`, `Module/Spacecraft/Lib/Crew/SpacecraftLeaver.php` (`dumpCrewman`)
- `Module/Colony/View/ShowPodsLocations` (`getOrphanedSummaryByUserAtTradeposts`)

## SWU-Pfade

- Handelsposten-Modell aus tmw-T1c
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

- 2026-11-02: Umsetzung nach zwei ernsthaften Prüfversuchen abgebrochen. Die fokussierten Backend-/Frontend-Tests, Typechecks und Builds sind grün, aber das verbindliche Gate `npx nx affected -t lint typecheck test --base=HEAD` bleibt wegen zweier fachfremder Backend-Baselinefehler rot: `spacecraft-fleet.service.spec.ts` scheitert mit `Not enough EPS for navigation`, `spacecraft-core-controls.spec.ts` mit fehlendem `shipRepo.findOneBy` im Test-Double. Benötigt Entscheidung bzw. separates Baseline-Issue, bevor dieses Issue erneut umgesetzt wird.
- 2026-11-09: Die integrierte Baseline 14b86081/c8e14f1c beseitigt den zuletzt dokumentierten fachfremden Blocker (Flotten-EPS- und shipRepo.findOneBy-Fixtures); reguläre Nx-Lint-/Typecheck-/Build-Gates und vollständige Tests sind laut Baseline-Review grün, lokale Test-Spieldaten waren dafür vorhanden. Status ready-for-agent; vorhandene Issue-Abhängigkeiten bleiben verbindlich. Dies belegt keine Feature-Fertigstellung: verworfene Änderungen müssen neu umgesetzt und die aktuellen Issue-Tests und Pflicht-Gates erneut ausgeführt werden; keine Ausnahme.
