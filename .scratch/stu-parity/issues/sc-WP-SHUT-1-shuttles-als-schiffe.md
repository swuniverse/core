# Shuttles als eigenständige Schiffe starten und aufnehmen

**Status:** claimed
**Priority:** P3
**Size:** M
**Blocked by:** —

## Ziel

In STU sind Shuttles startbare Schiffe: Ein Schiff mit Shuttlerampe startet ein Shuttle aus dem Lager (`StartShuttle`), nimmt es am Feld wieder auf (`StoreShuttle`) oder landet es auf einer Kolonie (`LandShuttle`). In SWU sind Shuttles reine Lagerware (`colony-orbit.service.ts transferShuttles`, `shuttleSlots`). Die Abweichung muss entschieden werden.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Spacecraft/Action/{StartShuttle,StoreShuttle}`, `Module/Ship/Action/LandShuttle`
- `Component/Spacecraft/System/Type/ShuttleRampShipSystem.php`, `html/spacecraft/shuttleManagement.twig`
- `Module/Station/Action/ManageShuttles`, `Module/Station/View/ShowShuttleManagement`

## SWU-Pfade

- `apps/backend/src/modules/colony/colony-orbit.service.ts` (`transferShuttles`)
- `game-data/data/modules/special.yaml` („Shuttlerampe“, `shuttleLaunchCapacity`), `game-data/data/fabrication/stu-fabrication.yaml`
- `game-data/data/ship-building/stu-special-module-audit.md`

## Akzeptanzkriterien

- [ ] Shuttlerampe als Laufzeitsystem; Start eines Shuttles aus dem Lager als eigenes Schiff, Aufnahme am Feld, Landung auf einer Kolonie (STU `StartShuttle`, `StoreShuttle`, `LandShuttle`).
- [ ] Shuttle-Management an Stationen (sobald sc-WP-STAT-2 erledigt), gemeinsame Start-/Andockmechanik mit den Workbees aus sc-WP-STAT-1a (keine Doppelimplementierung).
- [ ] Backend- und Frontend-Tests für Start, Aufnahme, Landung und Kapazitätsgrenzen.
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Entscheidung

Vorgabe: Variante (a), STU-Parität. Shuttlerampe als Laufzeitsystem, Start/Aufnahme/Landung, Shuttle-Management an Stationen; Mechanik gemeinsam mit dem Workbee-Start aus sc-WP-STAT-1a.

## Comments

- 2026-10-21 Product Owner: Option a – Shuttles werden wie in STU startbare Schiffe (Start, Aufnahme, Landung, Shuttle-Management an Stationen), mit derselben Mechanik wie das Starten der Workbees.
