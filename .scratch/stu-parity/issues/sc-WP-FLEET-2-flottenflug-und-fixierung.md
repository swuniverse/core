# Flottenflug und Flottenfixierung

**Status:** resolved
**Priority:** P1
**Size:** M
**Blocked by:** sc-WP-FLEET-1a

## Ziel

Bewegt sich der Flotten-Leader, fliegen alle Flottenschiffe auf demselben Feld mit (STU `FlightCompany`). Jedes Schiff wird einzeln auf Crew, EPS und Antrieb geprüft; wer nicht mitkann, wird abgehängt und verlässt die Flotte. Ist die Flotte fixiert, fliegt niemand, solange ein Mitglied blockiert ist.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Spacecraft/Lib/Movement/FlightCompany.php` (`isFleetMode`, `isFixedFleetMode`, `isFlightPossible`), `FlightCompanyFactory.php`, `ShipMover.php`
- `Module/Spacecraft/Lib/Movement/Component/PreFlight/ConditionCheckResult.php`, `PreFlight/Condition/*`
- `Module/Ship/Action/ChangeFleetFixation`, `Module/Spacecraft/Action/InterceptShip` (Abfangen trifft die ganze Flotte)

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/spacecraft.service.ts` (`navigate`, `flyGalaxy`, `enterSystem`, `leaveSystem`, `warp`, `processMovement`, `assertSystemsForFlight`, `activateDriveForFlight`, `assertEnoughCrew`)
- `apps/backend/src/modules/spacecraft/hyperdrive-disruption.service.ts`
- `apps/backend/src/modules/spacecraft/entities/fleet.entity.ts` (neue Spalte `isFixed`)
- `apps/frontend/src/components/spacecraft/NavigationPanel.tsx`, `pages/spacecraft.tsx`

## Akzeptanzkriterien

- [x] Fliegt der Leader (System, Galaxie, Systemeintritt/-austritt, Langstreckensprung aus sc-WP-NAV-5b; der zeitbasierte Hyperraumsprung entfällt laut sc-WP-NAV-3), fliegen alle Mitglieder auf seinem Feld mit; EPS bzw. Hyperantrieb werden je Schiff abgezogen.
- [x] Nicht flugfähige Mitglieder (Crew, EPS, Antrieb, zerstört) bleiben zurück, verlassen die Flotte und erzeugen eine Meldung je Schiff; in fixierten Flotten wird stattdessen der gesamte Flug mit Grund abgelehnt.
- [x] Mitglieder können nicht einzeln fliegen, solange sie in einer Flotte sind (STU-Regel), außer der Leader.
- [x] Endpunkt zum Umschalten der Fixierung; Anzeige im Flottenkopf.
- [x] Abfangen eines Flottenschiffs zieht die ganze Flotte aus dem Hyperraum.
- [x] Backend-Tests: Flottenflug mit drei Schiffen, Abhängen bei EPS-Mangel, fixierte Flotte blockiert, Abfangen der Flotte.
- [x] Frontend-Test für den Fixierungsschalter.
- [x] `lint`, `typecheck`, `test` und `build` sind grün.

## Comments

Implemented fleet-wide system and galaxy movement, system entry/exit, and the existing long-range warp compatibility path with per-ship readiness/resource checks, detachment notices, and fixed-fleet blocking. Added persisted fixation with API and fleet-header control, plus fleet-wide interception for both involved fleets. Covered backend fleet movement/interception and the frontend fixation switch; affected checks and all builds pass. The future sc-WP-NAV-5b mechanism remains owned by that issue.
