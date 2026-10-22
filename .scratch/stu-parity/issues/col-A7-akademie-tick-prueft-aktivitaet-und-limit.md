# Akademie-Tick prüft Aktivität und Crew-Limits

**Status:** resolved
**Priority:** P1
**Size:** S
**Blocked by:** —

## Ziel

`processCrewTrainingQueue` schließt heute jeden Ausbildungsauftrag im Tick ab, auch wenn die Akademie inzwischen deaktiviert ist oder die Crew-Limits überschritten wären. STU überspringt die Ausbildung ohne aktive Akademie und löscht Aufträge, wenn die Kolonie keine Crew mehr aufnehmen kann oder das globale Crew-Limit erreicht ist.

## STU-Quellen

- `src/Module/Tick/Colony/ColonyTickManager.php::proceedCrewTraining` (Z. 71–110: `getTrainableCount`, `getFreeAssignmentCount`, `getGlobalCrewLimit`, `hasActiveFunction(ACADEMY)`)
- `src/Module/Colony/Action/TrainCrew/`

## SWU-Pfade

- `apps/backend/src/modules/colony/colony-tick-processor.service.ts` (`processCrewTrainingQueue`, Z. ~63; `enforceLocalCrewLimit`)
- `apps/backend/src/modules/colony/colony-crew.service.ts` (`createCrewOnColony`, Limitberechnung)
- `apps/backend/src/modules/colony/colony.service.ts` (`queueCrewTraining` – vorhandene Limitprüfung wiederverwenden)
- `apps/backend/src/modules/colony/entities/colony-crew-training-queue.entity.ts`

## Akzeptanzkriterien

- [x] Ohne aktive Akademie bleiben Aufträge im Tick unverändert in der Queue (nicht abgeschlossen, nicht gelöscht).
- [x] Kann die Kolonie keine weitere Crew aufnehmen (lokales Limit) oder ist das globale Crew-Limit erreicht, wird der Auftrag storniert (`CANCELLED`) und eine Kolonie-Nachricht erzeugt.
- [x] Teilaufträge werden auf die noch zulässige Menge gekürzt statt komplett abgeschlossen; die je Tick ausbildbare Menge (STU `getTrainableCount`) wird beachtet, falls SWU einen entsprechenden Wert hat – sonst bleibt die heutige Menge.
- [x] Backend-Tests: inaktive Akademie, lokales Limit, globales Limit, Kürzung, Normalfall.

## Comments

- Der Akademie-Tick prüft nun den aktiven Ausbildungsbetrieb, lokale und globale Crewkapazität sowie das tickweise Ausbildungslimit. Aufträge werden pausiert, gekürzt oder mit Kolonie-Nachricht storniert; Backend-Tests decken alle Akzeptanzfälle ab. Keine offenen Folgepunkte.
