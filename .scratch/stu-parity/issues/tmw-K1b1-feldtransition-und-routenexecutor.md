# Feldtransition und geordneter Routenexecutor

**Status:** resolved
**Priority:** P2
**Size:** M
**Blocked by:** tmw-K1a

## Ziel

System- und Galaxiebewegungen verwenden einen gemeinsamen autoritativen Feldtransition-Kern. Mehrfeldziele werden als geordnete Folge beobachtbarer Einzelschritte verarbeitet, sodass kein Zwischenfeld und keine Konsequenz übersprungen werden kann.

## STU-Quellen

- `src/Module/Spacecraft/Lib/Movement/ShipMover.php`
- `src/Module/Spacecraft/Lib/Movement/Component/PreFlight/Condition/EnoughEpsCondition.php`
- `src/Module/Spacecraft/Lib/Movement/Component/Consequence/Flight/EpsConsequence.php`

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/spacecraft.service.ts` (`navigate`, `flyGalaxy`)
- `apps/backend/src/modules/spacecraft/flight-consequence-pipeline.ts`
- Signatur-, Erkundungs-, Statistik-, Alarm- und Reaktionspfade der Bewegung
- ADR-0006

## Akzeptanzkriterien

- [x] Ein gemeinsamer Transition-Executor verarbeitet eine orthogonale Route vom aktuellen Feld zum gewählten Ziel in deterministischer Feldreihenfolge.
- [x] Jedes Zwischenfeld wird vor dem Betreten auf Existenz und Passierbarkeit geprüft; diagonale oder mehrdeutige Routen werden abgelehnt.
- [x] Pro erfolgreich betretenem Feld werden genau einmal die Grundkosten `shipClass.flightEnergyCost` vom EPS abgezogen und die `onEnterField`-Pipeline ausgeführt.
- [x] Normale Galaxiebewegung verbraucht nicht länger `warpdrive` pro Distanz; Langstrecken- und Sonderantriebe bleiben ihren eigenen Issues vorbehalten.
- [x] Standort, Signatur, Erkundung, Statistik sowie Alarm- und Reaktionshaken werden für jeden tatsächlich erfolgten Schritt konsistent aktualisiert.
- [x] Reicht EPS nicht für den nächsten Schritt oder wird das Schiff zerstört, endet die Route sofort; spätere Felder und Konsequenzen werden nicht verarbeitet.
- [x] Der Executor bietet einen expliziten Erweiterungspunkt für Bewegungsbeteiligte und Kostenträger. Tatsächliche Traktorregeln, das gezogene Ziel und dessen Zusatzkosten bleiben `sc-WP-TRACT-1a`.
- [x] Mehrfeld-Zielwahl der bestehenden API bleibt erhalten; das Backend teleportiert nicht zum Endfeld.
- [x] Backend-Tests decken Einfeld- und Mehrfeldrouten, Zwischenfeldsperre, EPS-Abbruch, Zerstörungsabbruch und genau-einmal-Haken je Feld ab.

## Entscheidung

Dieses Issue besitzt die von ADR-0006 verlangte feldweise Bewegung. `sc-WP-NAV-3b` entfernt ausschließlich den verworfenen zeitbasierten Warp-Pfad und ist keine Voraussetzung für den Transition-Executor.

## Comments

Gemeinsamer `FieldTransitionExecutor` verarbeitet System- und Galaxierouten feldweise mit Kostenträger-Ports, Sperr-/EPS-/Zerstörungsabbruch und pro Schritt ausgeführten Standort-, Signatur-, Erkundungs-, Statistik- und Konsequenzhaken. Normale Galaxiebewegung verbraucht jetzt EPS statt `warpdrive`; fokussierte Tests und alle Builds sind grün. Der vollständige Affected-Lauf bleibt ausschließlich an bereits vorhandenen fachfremden Typecheck-Fehlern in `wreck-decay.service.spec.ts` und `tutorial.service.spec.ts` rot.
