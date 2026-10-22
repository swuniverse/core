# Modulfabrik, Akademie und Schilde reagieren auf Deaktivierung und Abriss

**Status:** claimed
**Priority:** P1
**Size:** S
**Blocked by:** col-A1a

## Ziel

Ergänzt den in col-A1a angelegten Gebäudefunktions-Hook um die übrigen STU-Handler: Wird eine Modul- oder Torpedofabrik deaktiviert oder abgerissen, werden ihre Fabrikationsaufträge storniert und die Materialkosten voll erstattet (gedeckelt durch freien Lagerplatz). Wird die Akademie abgerissen, entfällt die laufende Ausbildung. Wird ein Schildgenerator deaktiviert, fallen die Schilde auf 0; ändert sich eine Schildbatterie, werden die Schilde auf das neue Maximum gekappt.

## STU-Quellen

- `src/Module/Building/Action/ModuleFab.php` (`deactivate` → `ModuleQueueLib::cancelModuleQueues`)
- `src/Module/Colony/Lib/ModuleQueueLib.php` (`cancelModuleQueuesForBuildingFunctions`: 100 % Material, gekappt auf `getMaxStorage - getStorageSum`)
- `src/Module/Building/Action/Academy.php` (`destruct` → `crewTrainingRepository->truncateByColony`)
- `src/Module/Building/Action/ShieldGenerator.php` (`deactivate` → Schilde 0, `activate` → `updateActualShields`)
- `src/Module/Building/Action/ShieldBattery.php` (`activate`/`deactivate` → `updateActualShields`)
- `src/Component/Colony/Shields/ColonyShieldingManager.php`

## SWU-Pfade

- Hook aus col-A1a (`apps/backend/src/modules/colony/building-lifecycle.service.ts`)
- `apps/backend/src/modules/colony/colony-fabrication.service.ts` (`cancelFabricationQueue`, `processFabricationQueue`)
- `apps/backend/src/modules/colony/entities/colony-fabrication-queue.entity.ts` (`buildingFunctionId`)
- `apps/backend/src/modules/colony/entities/colony-crew-training-queue.entity.ts`, `colony-tick-processor.service.ts` (`processCrewTrainingQueue`)
- `apps/backend/src/modules/colony/colony-defense.service.ts` (`syncShieldCapacity`, `calculateMaxShieldsByFunctions`)
- `apps/backend/src/modules/colony/colony-storage.service.ts` (Lagerobergrenze)

## Akzeptanzkriterien

- [ ] Deaktivieren oder Abreißen eines Gebäudes mit Fabrikationsfunktion storniert alle offenen Aufträge dieser Funktion (`CANCELLED`) und erstattet 100 % der Materialkosten, gekappt auf den freien Lagerplatz (STU-Verhalten). Der vom Spieler ausgelöste Abbruch (`cancelFabricationQueue`) bleibt unverändert – seine Regeln klärt col-A2.
- [ ] `processFabricationQueue` schließt einen Auftrag nur ab, wenn die Fabrikationsfunktion aktiv ist (Absicherung, falls ein Auftrag trotz Hook verbleibt).
- [ ] Abriss der (letzten) Akademie storniert offene Crew-Ausbildungsaufträge der Kolonie.
- [ ] Deaktivieren des Schildgenerators setzt die Kolonieschilde auf 0; Aktivieren/Deaktivieren einer Schildbatterie kappt die Schilde auf das neue Maximum.
- [ ] Je Storno entsteht eine Kolonie-Nachricht mit Ware, Menge und erstatteten Mengen.
- [ ] Backend-Tests (`*.spec.ts`): Fabrik-Storno mit voller Erstattung, Kappung bei vollem Lager, Akademie-Abriss löscht Ausbildung, Schildgenerator aus → 0, Batterie aus → Kappung, Auslösung auch über Massenschaltung und Tick-Abschaltkaskade.

## Comments
