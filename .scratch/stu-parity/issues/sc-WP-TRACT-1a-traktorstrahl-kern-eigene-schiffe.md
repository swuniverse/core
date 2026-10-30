# Traktorstrahl-Kern (eigene Schiffe und Wracks)

**Status:** claimed
**Priority:** P2
**Size:** M
**Blocked by:** sc-WP-ENG-2e

## Ziel

Der Traktorstrahl wird ein Laufzeitsystem aus den vorhandenen Moduldaten. Ein Schiff erfasst ein eigenes Schiff am Feld, schleppt es beim Flug mit (Zusatzkosten) und gibt es wieder frei. Fremde Ziele und „Entkommen“ hängen an der Produktentscheidung in sc-WP-TRACT-1b.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Spacecraft/Action/{ActivateTractorBeam,DeactivateTractorBeam}`
- `Component/Spacecraft/System/Type/TractorBeamShipSystem.php`
- `Module/Spacecraft/Lib/Movement/Component/Consequence/Flight/TractorConsequence.php`, `PostFlight/PostFlightTractorConsequence.php`, `PreFlight/Condition/BlockedCondition.php`
- `Module/Spacecraft/Lib/Destruction/Handler/{ClearTractoredBeam,ClearTractoringBeam}.php`
- `Lib/Interaction/InteractionCheckType.php` (`EXPECT_SOURCE_UNTRACTORED`)

## SWU-Pfade

- `game-data/data/modules/tractor-beam.yaml` (Kategorie `TRACTOR_BEAM`), `apps/backend/src/modules/game-data/game-data.service.ts`
- `packages/shared/src/lib/spacecraft/index.ts` (neuer Schlüssel `TRACTOR_BEAM`, NBS-Flag `tractor`)
- `apps/backend/src/modules/spacecraft/spacecraft-runtime-state.service.ts` (`getRuntimeSystemsForModule`)
- `apps/backend/src/modules/spacecraft/entities/spacecraft.entity.ts` (Referenz auf gezogenes Schiff), Migration
- `apps/backend/src/modules/spacecraft/spacecraft.service.ts` (Flugpfade, `getNearby`), `spacecraft-destruction.service.ts`
- Interaktions-Checks aus sc-WP-ENG-2e
- `apps/frontend/src/components/spacecraft/NearbySensorPanel.tsx`, `ShipControlCenter.tsx`

## Akzeptanzkriterien

- [ ] Modulkategorie `TRACTOR_BEAM` erzeugt das Laufzeitsystem; ohne Modul keine Traktoraktion.
- [ ] Aktivieren auf ein eigenes Schiff am Feld (nicht im Hyperraumflug, nicht selbst gezogen, kein Ziel mit eigenem aktiven Traktor, eigene Schilde aus wie STU), EPS-Kosten wie STU; Deaktivieren jederzeit.
- [ ] Beim Flug des Ziehenden fliegt das gezogene Schiff mit; zusätzliche EPS-Kosten je Feld wie STU; reicht die Energie nicht, reißt der Strahl mit Meldung ab.
- [ ] Ein gezogenes Schiff kann nicht selbst fliegen (Pre-Flight „blockiert“).
- [ ] Zerstörung eines Beteiligten löst den Strahl.
- [ ] Der Interaktions-Check `Quelle nicht gezogen` ist im Dienst aus sc-WP-ENG-2e aktiv.
- [ ] Backend-Tests: Aktivieren, Mitfliegen, Abriss bei EPS-Mangel, Blockade des Gezogenen, Bereinigung bei Zerstörung; Frontend-Test für NBS-Aktion.
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Comments
