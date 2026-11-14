# Movement-Result und neutraler Reaktionsport

**Status:** resolved
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

- [x] Der Executor aus `tmw-K1b1` bleibt der einzige gemeinsame Routen-/Transition-Kern; dieses Issue erzeugt keinen parallelen alarm-spezifischen Bewegungspfad.
- [x] System- und Galaxieflug liefern einen gemeinsamen `MovementResult` mit Teilfortschritt, Stopgrund `ARRIVED | ALERT_COMBAT | DESTROYED`, bewegten und zerstörten Schiffs-IDs sowie optionalem Kampfbericht.
- [x] Ein neutraler injizierbarer Ankunfts-/Reaktionsport läuft nach jeder tatsächlich vollzogenen Transition des System- oder Galaxieflugs und kann die weitere Route mit strukturiertem Ergebnis stoppen, ohne Combat-Typen in den Spacecraft-Kern zu importieren.
- [x] Systemflug und Galaxieflug verwenden denselben Ergebnisvertrag; Befehle ohne Feldwechsel lösen den Port nicht aus. Systemeintritt, Systemaustritt und Abfangen sind nicht Teil dieses Issues und werden in Folgeissues migriert.
- [x] Bei einem Stopp bleiben Standort, Kosten, Signatur, Erkundung, Statistik und bereits erfolgte Konsequenzen des erreichten Feldes erhalten; spätere Schritte werden nicht ausgeführt.
- [x] Zerstörte Schiffe fliegen nicht weiter; überlebende Flottenmitglieder bleiben konsistent auf dem zuletzt erreichten Feld.
- [x] Backend-Vertragstests decken Ankunft, Reaktionsstopp auf Zwischenfeld, Zerstörungsstopp, Teilfortschritt und Flottenverluste ab.
- [x] `lint`, `typecheck`, `test` und `build` sind grün.

## Entscheidung

`tmw-K1b1` besitzt den feldweisen Executor. Dieses Issue erweitert ihn ausschließlich um den gemeinsamen Ergebnisvertrag und einen neutralen Reaktionsport. Die konkrete Alarm- und Kampfimplementierung folgt nach Extraktion des internen Battle-Resolvers.

## Comments

- 2026-11-06: Maintainer bestätigt, Systemeintritt, Systemaustritt und Abfangen aus diesem Issue auszuklammern und in Folgeissues zu migrieren. Die Kriterien beschränken sich damit auf System- und Galaxieflug über den vorhandenen `FieldTransitionExecutor`; die fachlichen Umbauten der übrigen Pfade werden separat geplant. Die zuvor verworfenen Änderungen bleiben verworfen. Der bereits dokumentierte fachfremde Affected-Gate-Blocker bleibt von dieser Scope-Entscheidung unberührt.
- 2026-11-09: Die integrierte Baseline `14b86081`/`c8e14f1c` behebt die dokumentierten fachfremden Typecheck-/Testfixture- und Tutorial-Probleme; die regulären Gates und vollständigen Tests sind laut Baseline-Review grün. Keine Feature-Fertigstellung: Die verworfene Umsetzung ist neu zu erstellen und mit Issue-Tests und aktuellen Pflicht-Gates erneut zu prüfen.
- 2026-11-14: Umgesetzt (2355ce7b).
  - Vertrag `MovementResultDto` in `packages/shared/src/lib/spacecraft/movement-result.ts`: `plannedSteps`, `completedSteps`, `stopReason`, `movedShipIds` (überlebende bewegte Teilnehmer auf dem zuletzt erreichten Feld), `destroyedShipIds`, `combatReport` (`{ messages }` oder `null`). `FieldTransitionExecutor.execute` liefert ihn direkt; `navigate` und `flyGalaxy` geben `{ ship, movement }` zurück (HTTP-Antwort entsprechend, das Frontend wertet sie nicht aus).
  - Abweichung: zusätzlicher Stopgrund `INSUFFICIENT_ENERGY` für den bereits bestehenden EPS-Abbruch mitten in der Route (mit 0 Schritten weiterhin 400); ihn als `ARRIVED` zu melden wäre falsch.
  - Neutraler Port `MOVEMENT_REACTIONS` (`movement-reaction.port.ts`, ohne Combat-Importe): Reaktionen erhalten nach jeder vollzogenen Transition Bereich, Feld-ID, Koordinate, Leitschiff und Teilnehmer und können `stop` sowie einen Bericht liefern; der erste Stopp beendet die Runde. Danach: alle zerstört → `DESTROYED`, Stopp → `ALERT_COMBAT`, einzelne Verluste ohne Stopp → `DESTROYED` (Überlebende bleiben auf dem Feld). Befehle ohne Feldwechsel lösen den Port nicht aus. Der Executor bleibt der einzige Routenkern; Systemeintritt/-austritt und Abfangen sind wie beschlossen nicht migriert. ADR-0006 um den Vertrag ergänzt.
  - Nicht enthalten: Geschleppte Schiffe stehen nicht in `movedShipIds`. Unverändert vorbestehend: Ein unpassierbares Zwischenfeld wirft nach bereits gespeicherten Schritten einen Fehler statt eines Teilfortschritts (STU bricht mit Meldung ab) – Kandidat für ein Folgeissue.
  - Tests: `field-transition-executor.spec.ts` (Ankunft, kein Port ohne Feldwechsel, EPS-Teilfortschritt, Zerstörungsstopp mit Verlusten, Reaktionskontext je Feld, Reaktionsstopp auf Zwischenfeld mit Bericht, Flottenverlust mit Überlebenden, Totalverlust); `movement-concurrency.int-spec.ts` (Postgres: Galaxieflug mit Reaktionsstopp behält Standort, EPS, Signatur, Erkundung; Flottenmitglied durch Reaktion zerstört; Systemflug mit Reaktionsstopp). Mutationsprobe (Reaktionsaufruf entfernt) lässt 3 Integrations- und 5 Unit-Tests scheitern.
  - Gates: Lint 0 Fehler (Warnungen 1433/110 unverändert), Typecheck und Build grün, Backend-Unit 2103/2103, Frontend 758/758, Integration 712/712 (zwei bestehende Assertions auf `{ ship, movement }` umgestellt).

