# Wurmloch-Flottenpassage als normaler Flug mit Ausscheiden einzelner Schiffe

**Status:** ready-for-agent
**Priority:** P2
**Size:** M
**Blocked by:** tmw-AUD-12a

## Ziel

In STU ist die Wurmlochpassage eine normale gerichtete Bewegung (`AbstractDirectedMovement` → `ShipMover`) zu einem zufälligen nutzbaren Eintrag; nicht im Warp, keine Station. Flotten fliegen über den normalen Mover: Schiffe, die eine Vorbedingung nicht erfüllen (Crew, Antrieb aktivierbar, EPS, Berechtigung), scheiden aus und verlassen die Flotte (`ShipMover::leaveFleet`, Meldung „Die X hat die Flotte verlassen“). Der Rest fliegt. Die Passage ist **nicht atomar**.

SWU validiert die Flotte vollständig vorab und atomar (`wormhole-passage-planner.ts`: ein Schiff ohne Berechtigung, Antrieb oder EPS lässt die gesamte Passage scheitern; PO-Entscheid in tmw-K7a/K7a2).

Umsetzung:

- Die Passage prüft je Schiff Berechtigung (aus tmw-AUD-12a), Impulsantrieb (vorhanden, intakt, nicht im Cooldown) und Aktivierungs-EPS. Schiffe, die scheitern, verlassen die Flotte mit Meldung und Grund; die übrigen passieren.
- Scheitert der Flottenführer, scheitert die Passage für alle (wie STU, Abbruch des Fluges).
- Getraktorte Schiffe folgen den bestehenden Traktorregeln des normalen Flugs.
- Rückmeldung listet je ausgeschiedenem Schiff den Grund.
- Kostenregel aus tmw-K7a bleibt (Aktivierungs-EPS nur bei inaktivem Impulsantrieb, keine Flug-EPS, kein Warpdrive).
- Nebenläufigkeitsschutz aus tmw-K7a2a/b (Sperren, veraltete Schreibvorgänge) bleibt erhalten; nur die Alles-oder-nichts-Validierung entfällt.

## STU-Quellen

- `src/Module/Spacecraft/Action/EnterWormhole/EnterWormhole.php`, `LeaveWormhole/LeaveWormhole.php`
- `src/Module/Spacecraft/Action/MoveShip/AbstractDirectedMovement.php`
- `src/Module/Spacecraft/Lib/Movement/ShipMover.php` (Z. 60–110 Schleife, `leaveFleet` Z. 169–174)
- `src/Module/Spacecraft/Lib/Movement/Component/PreFlight/Condition/` (`CrewCondition`, `DriveActivatableCondition`, `EnoughEpsCondition`, …)
- `src/Module/Spacecraft/Lib/Movement/FlightCompany.php`

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/wormhole-passage-planner.ts` (Schleife Z. 132–160)
- `apps/backend/src/modules/spacecraft/wormhole-passage.service.ts` (`enter` Z. 86ff., Flottensperre/-mitglieder)
- `apps/backend/src/modules/spacecraft/spacecraft.service.ts` (`leaveFleet` Z. 3409), `fleet-lock.ts`, `fleet-leadership.ts`
- `apps/backend/src/modules/spacecraft/flight-consequence-pipeline.ts` (Ankunftsfolgen)
- `apps/frontend/src/components/spacecraft/FieldContextPanel.tsx` bzw. Schnellaktion (Anzeige der Rückmeldung)
- Tests: `wormhole-passage-planner.spec.ts`, `wormhole-passage.int-spec.ts`, `wormhole-passage-http.int-spec.ts`, `fleet-concurrency.int-spec.ts`

## Akzeptanzkriterien

- [ ] Ein Flottenmitglied ohne Berechtigung, Antrieb oder EPS verlässt die Flotte mit Meldung; die übrigen Schiffe passieren und kommen gemeinsam als Flotte an.
- [ ] Scheitert der Führer, passiert kein Schiff.
- [ ] Die Rückmeldung nennt je ausgeschiedenem Schiff den Grund.
- [ ] Bestehende Sperr-/Nebenläufigkeitstests bleiben grün.
- [ ] Backend-Tests: gemischte Flotte (ein Schiff ohne EPS, eines ohne Berechtigung), Führer ohne Berechtigung, Einzelschiff unverändert. Frontend-Test: Anzeige der Teilrückmeldung.

## Herkunft

- Audit: [README.md](../audit-2026-11-17/README.md) Abschnitt K4 und „Entscheidungen PO zu K: K4 – Flottenpassage als normaler Flug mit Ausscheiden einzelner Schiffe“, N2.
- PO-Entscheidung K4 vom 2026-11-17: wie STU.
- Ersetzt die `map.md`-/Ticketentscheidung zu tmw-K7a (PO-Kommentar 2026-10-30: „Flotten werden in SWU vollständig vorab und atomar validiert … Teilresultate wie in STU werden nicht übernommen“) und die atomare Flottenvalidierung aus tmw-K7a2.

## Comments
