# Crewmanagement am Schiff: Positionen, Details, Umbenennen

**Status:** ready-for-agent
**Priority:** P2
**Size:** M
**Blocked by:** —

## Ziel

Statt einer reinen Crewliste erhält das Schiff wie in STU ein Crew-Fenster: Crewmitglieder werden Positionen (Kapitän, Kommando, Sicherheit, Wissenschaft, Technik, Navigation, Crewman) zugewiesen, Details sind einsehbar und Crewmitglieder bzw. die Crew umbenennbar. `CrewAssignment.slot` existiert bereits.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Spacecraft/Action/{AssignCrewSlot,RenameCrew,RenameCrewman}`
- `Module/Spacecraft/View/{ShowCrewAssignmentManagement,ShowCrewmanDetails,ShowRenameCrew}`
- `html/spacecraft/crewAssignment*.twig`
- `Component/Crew/CrewTypeEnum.php`, `Component/Spacecraft/Crew/SpacecraftCrewCalculator.php` (Slots je Rumpf)

## SWU-Pfade

- `apps/backend/src/modules/colony/entities/crew.entity.ts` (`CrewType`), `crew-assignment.entity.ts` (`slot`)
- `apps/backend/src/modules/spacecraft/spacecraft-crew.service.ts` (`getAssignedCrew`), `spacecraft.controller.ts`
- `game-data/data/ship-building/stu-rump-crew.yaml` (Crew je Rumpf/Position)
- `apps/frontend/src/components/spacecraft/ShipOperationsPanel.tsx`

## Akzeptanzkriterien

- [ ] `GET :id/crew` liefert Positionen mit Soll (aus Rumpfdaten) und zugewiesenen Crewmitgliedern sowie unzugewiesene Crew.
- [ ] `PATCH :id/crew/:crewId/slot` weist eine Position zu bzw. entfernt sie; Soll-Grenzen werden geprüft.
- [ ] Umbenennen eines Crewmitglieds (Länge, Zeichen wie Schiffsname) und der gesamten Crew (STU `RenameCrew`).
- [ ] Crewman-Details zeigen Name, Typ, Geschlecht, Herkunftskolonie, Position.
- [ ] Nur der Eigner; nicht im Hyperraumflug.
- [ ] Backend-Tests (Grenzen, Fremdzugriff), Frontend-Test für Zuweisen und Umbenennen.
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Comments
