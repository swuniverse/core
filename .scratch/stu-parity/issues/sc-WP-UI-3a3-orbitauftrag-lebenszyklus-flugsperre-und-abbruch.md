# Orbitauftrag-Lebenszyklus: Flugsperre und Abbruch

**Status:** ready-for-agent
**Priority:** P2
**Size:** M
**Blocked by:** sc-WP-UI-3a1

## Ziel

Ein laufender Verteidigungs- oder Blockadeauftrag bleibt wie in STU an die Anwesenheit der Flotte im Kolonieorbit gebunden. Solange er läuft, kann der Flottenführer nicht abfliegen. Endet die Flotte (Auflösen, Zerstörung) oder wird ihr Flottenführer per Traktorstrahl weggezogen, wird der Auftrag sofort, konsistent und mit Benachrichtigung aufgehoben. Verwaiste Aufträge, die neue Starts sperren oder `isBlockaded` stehen lassen, gibt es nicht mehr.

## Hintergrund (Review sc-WP-UI-3a1, 2026-11-13)

- SWU hat keine Flugsperre und hebt Aufträge nicht auf, wenn sich die Flotte verändert. Verwaiste Aufträge entfernt bisher nur `ColonyOrbitService.cleanupInvalidOrbitAssignments`, und das nur, wenn jemand genau diese Kolonie projiziert oder dort einen Auftrag startet.
- Folge 1: Eine Flotte verteidigt Kolonie A und fliegt zu Kolonie B. Ein Start bei B scheitert mit „Die Flotte hat bereits einen Orbitauftrag.“, weil die Bereinigung in `applyOrbitOrderStart` nur Kolonie B betrifft.
- Folge 2: Die Kolonieansicht von B meldet in diesem Fall trotzdem `canDefend: true`/`canBlock: true`. `colony-projection.service.ts` übergibt der Policy als `fleetOrder` nur Aufträge an B. Damit bekommen Ansicht und Mutation unterschiedliche Eingaben für dieselbe Policy.
- Folge 3: Wird eine Flotte aufgelöst oder ihr Flottenführer zerstört, löscht der FK-Cascade (`FK_colony_orbit_assignments_fleet`/`_spacecraft`, `ON DELETE CASCADE`) den Auftrag ohne `syncColonyBlockadeState`. `colony_changeables.isBlockaded` bleibt dann `true`, bis die Kolonie wieder projiziert wird. Der Kolonieeigner bekommt keine Nachricht.
- Folge 4: `colony_orbit_assignments.spacecraftId` ist eindeutig und zeigt auf den Flottenführer zum Startzeitpunkt. Nach `changeFleetLeader` zeigt der Auftrag weiter auf den alten Führer. Verlässt dieser die Flotte und führt eine neue, findet `applyOrbitOrderStart` (`where: [{ fleetId }, { spacecraftId }]`) den alten Auftrag und lehnt einen Start ab.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Spacecraft/Action/MoveShip/AbstractDirectedMovement.php` (Flugsperre: „Flug während Kolonie-Verteidigung nicht möglich“, „Flug während Kolonie-Blockierung nicht möglich“)
- `Module/Ship/Lib/CancelColonyBlockOrDefend.php` (Abbruch mit Nachrichten an Kolonieeigner und, beim Traktorstrahl, an den Eigner der gezogenen Flotte)
- `Module/Ship/Action/DeleteFleet/DeleteFleet.php`
- `Module/Ship/Lib/Fleet/ChangeFleetLeader.php`, `Module/Ship/Lib/Fleet/LeaveFleet.php`
- `Module/Spacecraft/Lib/Movement/Component/Consequence/Flight/TractorConsequence.php`

## SWU-Pfade

- `apps/backend/src/modules/colony/colony-orbit.service.ts` (zentraler Abbruch, `syncColonyBlockadeState`, Startprüfung)
- `apps/backend/src/modules/colony/colony-orbit-order.policy.ts` (Gründe)
- `apps/backend/src/modules/colony/colony-projection.service.ts` (`fleetOrder` kolonieübergreifend)
- `apps/backend/src/modules/spacecraft/spacecraft.service.ts` (`navigate`, `flyGalaxy`, `enterSystem`, `leaveSystem`, `warp`, `leaveFleet`, `dissolveFleet`, `changeFleetLeader`, Traktor beim Flug)
- `apps/backend/src/modules/spacecraft/wormhole-passage.service.ts` (`enter`)
- `apps/backend/src/modules/spacecraft/spacecraft-tractor.service.ts`
- `apps/backend/src/modules/spacecraft/spacecraft-destruction.service.ts`
- `apps/backend/src/modules/colony/entities/colony-orbit-assignment.entity.ts` (ggf. Migration)

## Akzeptanzkriterien

- [ ] **Flugsperre:** Hat die Flotte des initiierenden Flottenführers einen Orbitauftrag, lehnen alle Flug-Einstiege ab (Systemflug, Galaxieflug, System betreten/verlassen, Hyperraum/Warp, Wurmlochpassage). Die Gründe lauten „Flug während Kolonie-Verteidigung nicht möglich“ bzw. „Flug während Kolonie-Blockierung nicht möglich“. Die Prüfung läuft unter derselben Flottensperre wie der Flug, und der Flug ändert keinen Zustand.
- [ ] **Zentraler Abbruch:** Eine einzige Operation im Colony-Modul (STU `CancelColonyBlockOrDefend`) hebt den Auftrag einer Flotte innerhalb der Transaktion des Aufrufers auf und ruft `syncColonyBlockadeState` auf. Nach dem Commit bekommt der Kolonieeigner ein `ORBIT_DEFENSE_STOPPED`- bzw. `ORBIT_BLOCKADE_STOPPED`-Ereignis. Beim Traktorstrahl bekommt zusätzlich der Eigner der gezogenen Flotte eine Nachricht. Texte nach STU, ohne den STU-Tippfehler („Die Flotte X von Spieler Y hat die Verteidigung der Kolonie Z aufgehoben“).
- [ ] **Auflösen und Verlassen:** `dissolveFleet` und `leaveFleet` durch den Flottenführer, also alle Wege, die die Flotte löschen, rufen den Abbruch auf, bevor die Flotte gelöscht wird. Danach steht `isBlockaded` korrekt.
- [ ] **Führerwechsel:** Nach `changeFleetLeader` bleibt der Auftrag bei der Flotte, wie in STU. Der Auftrag blockiert den früheren Führer nicht mehr. Dafür folgt `spacecraftId` dem neuen Führer, oder die Startprüfung verlässt sich nur noch auf `fleetId`; die Wahl steht unter „Entscheidung“.
- [ ] **Zerstörung:** Wird der Flottenführer einer Flotte mit Auftrag zerstört, wird der Auftrag über denselben Abbruch beendet, inklusive `isBlockaded` und Benachrichtigung. Der FK-Cascade ist nicht mehr der einzige Weg, auf dem der Auftrag verschwindet.
- [ ] **Traktorstrahl:** Wird der Flottenführer einer Flotte mit Auftrag erfolgreich weggezogen (Flug mit aktivem Traktorstrahl, STU `TractorConsequence`), wird der Auftrag mit Traktor-Nachricht abgebrochen.
- [ ] **Ansicht gleich Mutation:** Die Kolonieansicht übergibt der Policy als `fleetOrder` den Auftrag der Flotte an jeder beliebigen Kolonie. Ein Auftrag an Kolonie A ergibt in der Ansicht von B dieselbe Ablehnung („Die Flotte hat bereits einen Orbitauftrag.“) wie `POST /api/spacecraft/:id/orbit-order`.
- [ ] **Altbestand:** Eine idempotente Migration oder Bereinigung entfernt bestehende verwaiste Aufträge (Flotte nicht mehr im Orbit, Führer zerstört oder nicht mehr in der Flotte) und korrigiert `isBlockaded` für alle betroffenen Kolonien.
- [ ] **Tests:** Unit- und Postgres/HTTP-Integrationstests decken ab: Flugsperre je Flug-Einstieg und Auftragsart, Auflösen/Verlassen mit `isBlockaded` und Eigner-Ereignis, Führerwechsel mit anschließendem Start des alten Führers in neuer Flotte, Zerstörung des Führers, Traktor-Abbruch, gleiche Ansicht und Mutation bei einem Auftrag an einer anderen Kolonie, Nebenläufigkeit von Flug und Auftragsstart (genau einer gewinnt).
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Entscheidung

SWU übernimmt die STU-Regel: Ein Orbitauftrag hält die Flotte im Orbit fest. Er endet nur durch ausdrückliches Beenden oder durch Auflösen, Zerstörung oder Traktorstrahl, jeweils mit Benachrichtigung. Mitglieder, die nicht Führer sind, sind von der Flugsperre nicht betroffen; verlassen sie die Flotte, bleibt der Auftrag bestehen, wie in STU. Eine Erweiterung der Policy um Flugregeln ist nicht vorgesehen. Die Flugsperre bekommt eine eigene, kleine Prüfung im Colony-Modul, die der Spacecraft-Code aufruft, ohne einen DI-Zyklus zu erzeugen (vgl. `SpacecraftOrbitOrderController` in sc-WP-UI-3a1). Für den Führerwechsel ist „`spacecraftId` folgt dem Führer“ die Vorgabe; wer davon abweicht, begründet das in den Comments.

Abgrenzung: Feldkontext und Schiff-UI für Start/Ende bleiben in `sc-WP-UI-3a2`. Sie müssen die Flugsperre-Gründe nicht anzeigen; eine Anzeige im Flugdialog ist kein Teil dieses Issues.

## Comments

- 2026-11-13: Aus dem unabhängigen Review von sc-WP-UI-3a1 (Merge 22970a8a) abgeleitet. Mit angelegt: Startprüfung liest Schiff und Kolonie-Felder vor der Flotten-/Koloniesperre (`applyOrbitOrderStart`); mit der Flugsperre unter Flottensperre sollte die Startprüfung Position und Status des Schiffs nach der Sperre neu laden.
