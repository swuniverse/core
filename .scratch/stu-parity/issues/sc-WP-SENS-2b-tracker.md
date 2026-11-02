# Tracker: Ziel markieren, verfolgen, angreifen

**Status:** claimed
**Priority:** P3
**Size:** M
**Blocked by:** sc-WP-ENG-2d

## Ziel

Wie in STU bringt ein Schiff mit Tracker-System einen Peilsender an einem Ziel am Feld an. Der Tick meldet dessen Position, bis der Tracker abläuft oder deaktiviert wird; „getracktes Ziel angreifen“ ist möglich, wenn beide auf demselben Feld stehen.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Ship/Action/{TrackShip,DeactivateTrackingDevice,AttackTrackedShip}`
- `Component/Spacecraft/System/Type/TrackerShipSystem.php`, `html/spacecraft/system/TRACKER.twig`
- `Module/Tick/Spacecraft/Handler/TrackerDeviceHandler.php`, `Lib/Interaction/TrackerDeviceManager.php`
- `Module/Spacecraft/Lib/Movement/Component/Consequence/PostFlight/PostFlightTrackerConsequence.php`, `Destruction/Handler/ResetTrackerDevices.php`

## SWU-Pfade

- `packages/shared/src/lib/spacecraft/index.ts`, `spacecraft-runtime-state.service.ts`
- `apps/backend/src/modules/spacecraft/spacecraft.service.ts` (`processTick`), `spacecraft-destruction.service.ts`
- `apps/backend/src/modules/combat/combat.service.ts`
- `game-data/data/modules/` (Submodul)
- `apps/frontend/src/components/spacecraft/ShipControlCenter.tsx`, `NearbySensorPanel.tsx`

## Akzeptanzkriterien

- [ ] Modul, Laufzeitsystem und SW-Name (Leitplanke 2, dokumentiert in `map.md`).
- [ ] Tracken eines fremden Ziels am Feld (Interaktions-Checks), Laufzeit und Energieverbrauch wie STU; Deaktivieren.
- [ ] Der Tracker zeigt Position und Feld des Ziels in der Systemansicht; Ablauf bzw. Zerstörung beendet ihn.
- [ ] „Getracktes Ziel angreifen“ verfügbar, wenn beide am selben Feld.
- [ ] Backend-Tests (Laufzeitablauf, Bereinigung bei Zerstörung, Angriff), Frontend-Test.
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Comments
