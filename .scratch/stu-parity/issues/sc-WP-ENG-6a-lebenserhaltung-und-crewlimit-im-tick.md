# Lebenserhaltung und Crew-Limit im Tick

**Status:** claimed
**Priority:** P2
**Size:** M
**Blocked by:** —

## Ziel

Wie in STU verlässt die Crew ein Schiff, dessen Lebenserhaltung ausgefallen ist, und Spieler über dem globalen Crew-Limit verlieren Crew (Meuterei-Reihenfolge Kolonien, Schiffe). Bis Rettungskapseln existieren (sc-WP-CREW-3a), geht die Crew verloren; danach nutzt sc-WP-CREW-3a denselben Einstiegspunkt.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Tick/Spacecraft/Handler/LifeSupportCheckHandler.php` (`evacuate` bei Crew > 0 und Lebenserhaltung nicht intakt)
- `Module/Tick/Spacecraft/ManagerComponent/CrewLimitations.php` (Urlauber ausgenommen; Reihenfolge Kolonien, Schiffe, Handelsposten, Kapseln)
- `Module/Spacecraft/Lib/Crew/SpacecraftLeaver.php`

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/spacecraft.service.ts` (`processTick`), `spacecraft-crew.service.ts`
- `apps/backend/src/modules/colony/colony-crew.service.ts` (`getGlobalCrewLimit`)
- `apps/backend/src/modules/colony/entities/crew-assignment.entity.ts`
- `apps/backend/src/modules/tick/tick.service.ts`, `apps/backend/src/modules/messaging/messaging.service.ts` (`sendSystem`)

## Akzeptanzkriterien

- [ ] Ein Schiff mit Crew und nicht intakter Lebenserhaltung (inaktiv oder Integrität 0) verliert im Tick seine Crew über eine zentrale Funktion `evacuateSpacecraft` (Rettungskapsel-Hook vorbereitet); der Eigner erhält eine Meldung.
- [ ] Liegt die Crew eines Spielers über dem globalen Limit, verlassen überzählige Crewmitglieder zuerst Kolonien, dann Schiffe; Spieler im wirksamen Urlaubsmodus sind ausgenommen; Meldung an den Spieler.
- [ ] Backend-Tests für beide Fälle und die Urlaubsausnahme.
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Comments
