# Movement-Result und neutraler Reaktionsport

**Status:** ready-for-agent
**Priority:** P2
**Size:** M
**Blocked by:** tmw-K1b1

## Ziel

Der gemeinsame Feldtransition-Executor erhält einen stabilen Ergebnisvertrag und einen neutralen Reaktionsport, damit Alarmkampf und spätere Ankunftsreaktionen Bewegungen auf einem erreichten Zwischenfeld stoppen können, ohne eine Abhängigkeit vom Spacecraft- zum Combat-Modul zu erzeugen.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Spacecraft/Lib/Movement/ShipMover.php`
- `Module/Spacecraft/Lib/Battle/AlertDetection/AlertReactionFacade.php`
- `Module/Spacecraft/Lib/Movement/Component/Consequence/Flight/AlertStateConsequence.php`

## SWU-Pfade

- Transition-Executor aus `tmw-K1b1`
- `apps/backend/src/modules/spacecraft/flight-consequence-pipeline.ts`
- `apps/backend/src/modules/spacecraft/spacecraft.service.ts`
- `packages/shared/src/lib/spacecraft/`
- ADR-0006

## Akzeptanzkriterien

- [ ] Der Executor aus `tmw-K1b1` bleibt der einzige gemeinsame Routen-/Transition-Kern; dieses Issue erzeugt keinen parallelen alarm-spezifischen Bewegungspfad.
- [ ] System- und Galaxieflug liefern einen gemeinsamen `MovementResult` mit Teilfortschritt, Stopgrund `ARRIVED | ALERT_COMBAT | DESTROYED`, bewegten und zerstörten Schiffs-IDs sowie optionalem Kampfbericht.
- [ ] Ein neutraler injizierbarer Ankunfts-/Reaktionsport läuft nach jeder tatsächlich vollzogenen Transition des System- oder Galaxieflugs und kann die weitere Route mit strukturiertem Ergebnis stoppen, ohne Combat-Typen in den Spacecraft-Kern zu importieren.
- [ ] Systemflug und Galaxieflug verwenden denselben Ergebnisvertrag; Befehle ohne Feldwechsel lösen den Port nicht aus. Systemeintritt, Systemaustritt und Abfangen sind nicht Teil dieses Issues und werden in Folgeissues migriert.
- [ ] Bei einem Stopp bleiben Standort, Kosten, Signatur, Erkundung, Statistik und bereits erfolgte Konsequenzen des erreichten Feldes erhalten; spätere Schritte werden nicht ausgeführt.
- [ ] Zerstörte Schiffe fliegen nicht weiter; überlebende Flottenmitglieder bleiben konsistent auf dem zuletzt erreichten Feld.
- [ ] Backend-Vertragstests decken Ankunft, Reaktionsstopp auf Zwischenfeld, Zerstörungsstopp, Teilfortschritt und Flottenverluste ab.
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Entscheidung

`tmw-K1b1` besitzt den feldweisen Executor. Dieses Issue erweitert ihn ausschließlich um den gemeinsamen Ergebnisvertrag und einen neutralen Reaktionsport. Die konkrete Alarm- und Kampfimplementierung folgt nach Extraktion des internen Battle-Resolvers.

## Comments

- 2026-11-06: Maintainer bestätigt, Systemeintritt, Systemaustritt und Abfangen aus diesem Issue auszuklammern und in Folgeissues zu migrieren. Die Kriterien beschränken sich damit auf System- und Galaxieflug über den vorhandenen `FieldTransitionExecutor`; die fachlichen Umbauten der übrigen Pfade werden separat geplant. Die zuvor verworfenen Änderungen bleiben verworfen. Der bereits dokumentierte fachfremde Affected-Gate-Blocker bleibt von dieser Scope-Entscheidung unberührt.
- 2026-11-09: Die integrierte Baseline `14b86081`/`c8e14f1c` behebt die dokumentierten fachfremden Typecheck-/Testfixture- und Tutorial-Probleme; die regulären Gates und vollständigen Tests sind laut Baseline-Review grün. Keine Feature-Fertigstellung: Die verworfene Umsetzung ist neu zu erstellen und mit Issue-Tests und aktuellen Pflicht-Gates erneut zu prüfen.
