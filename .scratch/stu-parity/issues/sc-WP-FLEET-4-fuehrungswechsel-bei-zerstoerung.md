# Führungswechsel bei Zerstörung des Flottenleaders

**Status:** ready-for-agent
**Priority:** P2
**Size:** M
**Blocked by:** sc-WP-COMBAT-1c

## Ziel

Wird der Leader einer Flotte zerstört, übernimmt wie in STU das nächste Flottenmitglied die Führung; ohne verbleibende Mitglieder wird die Flotte gelöscht. Ein laufender System- oder Galaxieflug fliegt mit dem neuen Leader weiter, statt auf dem erreichten Feld zu enden.

Heute setzt die Zerstörung (`SpacecraftDestructionService.finalizeInManager`) beim zerstörten Schiff nur `fleetId = null` und löscht die Zeile; `fleets.leaderId` zeigt danach auf ein nicht mehr existierendes Schiff. Der Flug aus sc-WP-COMBAT-1c beendet die Route deshalb mit `DESTROYED`, sobald der Leader fällt, weil `saveMovementParticipants` die Flotte über den Leader sperrt und prüft.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Spacecraft/Lib/Destruction/Handler/TransformToTrumfield.php` (ruft `SpacecraftShutdown::shutdown($wrapper, true)`)
- `Module/Spacecraft/Lib/Auxiliary/SpacecraftShutdown.php` (`leaveFleet` bei Zerstörung)
- `Module/Ship/Lib/Fleet/LeaveFleet.php` (Leader → `ChangeFleetLeader`, Mitglied → nur austreten)
- `Module/Ship/Lib/Fleet/ChangeFleetLeader.php` (nächstes Mitglied wird Leader, sonst Flotte löschen und Kolonieblockade/-verteidigung beenden)
- `Module/Spacecraft/Lib/Movement/ShipMover.php`, `Module/Spacecraft/Lib/Movement/FlightCompany.php` (Flug läuft mit den aktiven Mitgliedern weiter; Abbruch erst bei leerer Flugkompanie)

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/spacecraft-destruction.service.ts` (`finalizeInManager`, alle Ursachen: Kampf, Anomalie, Selbstzerstörung)
- `apps/backend/src/modules/spacecraft/spacecraft.service.ts` (`navigate`, `flyGalaxy`, `refreshMovementParticipants`, `saveMovementParticipants`)
- `apps/backend/src/modules/spacecraft/fleet-lock.ts` (`lockFleetParticipants`)
- `apps/backend/src/modules/spacecraft/field-transition-executor.ts` (`required`-Teilnehmer)
- `apps/backend/src/modules/spacecraft/movement-state.ts` (`FleetMovementState.leaderId`)
- `apps/backend/src/modules/alert-reaction/alert-reaction.service.ts` (Kontext-Leader nach Wechsel)

## Akzeptanzkriterien

- [ ] Wird ein Flottenleader zerstört (Kampf, Anomalie, Selbstzerstörung), wird in derselben Transaktion wie in STU `ChangeFleetLeader` das nächste verbleibende Flottenmitglied Leader. Die Auswahl ist stabil (z. B. niedrigste Schiffs-ID unter den verbleibenden Mitgliedern) und dokumentiert.
- [ ] Bleibt kein Mitglied übrig, wird die Flotte gelöscht; laufende Kolonieblockade bzw. -verteidigung der Flotte wird dabei wie in STU beendet, sofern SWU diese Zustände kennt.
- [ ] Wird ein einfaches Mitglied zerstört, verlässt es nur die Flotte (heutiges Verhalten bleibt).
- [ ] Nach der Zerstörung existiert keine Flotte mehr, deren `leaderId` auf ein fehlendes oder fremdes Schiff zeigt; eine Migration bereinigt bestehende verwaiste Flotten nach derselben Regel.
- [ ] Fällt der Leader während eines System- oder Galaxieflugs (Feldfolge oder Alarmkampf), fliegen die überlebenden Mitglieder mit dem neuen Leader weiter. Standort, Kosten, Signatur, Erkundung und Statistik je Feld bleiben wie bisher; Sperren und Veraltet-Prüfung laufen über den neuen Leader, ohne einen fälschlichen Konflikt „Bewegungszustand ist veraltet“.
- [ ] Der Flug endet mit `DESTROYED` erst, wenn kein Teilnehmer mehr übrig ist. `MovementResult` nennt den alten Leader in `destroyedShipIds` und die Überlebenden in `movedShipIds`; die Antwort von `navigate`/`flyGalaxy` liefert das Schiff des neuen Leaders.
- [ ] Alarmreaktionen auf späteren Feldern verwenden den neuen Leader als Kontext (Verteidigungsziel, Eigner bleibt derselbe Spieler).
- [ ] Backend-Tests: Leaderzerstörung mit und ohne verbleibende Mitglieder für jede Ursache; Flug, in dem der Leader auf einem Zwischenfeld fällt und die Flotte das Ziel erreicht; Migration verwaister Flotten. `lint`, `typecheck`, `test` und `build` sind grün.

## Abgrenzung

- Das freiwillige Verlassen der Flotte durch den Leader ist nicht Teil dieses Issues. SWU löst die Flotte dabei auf (sc-WP-FLEET-1a); die STU-Spieleraktion `Module/Ship/Action/LeaveFleet` lässt den Leader gar nicht austreten. Ob SWU dort angeglichen wird, ist eine eigene Entscheidung.
- Systemeintritt, Systemaustritt und Abfangen bleiben in ihren eigenen Folgeissues aus sc-WP-COMBAT-1c.

## Comments

- 2026-11-14: Angelegt als Folgeissue aus sc-WP-COMBAT-1c. Nach der Maintainer-Entscheidung „wir halten uns an STU“ fliegt die Flotte nach Alarmkämpfen mit den Überlebenden weiter; einzig der Verlust des Leaders beendet den Flug noch, weil SWU keinen Führungswechsel kennt.
