# Werft-Queues reagieren auf Deaktivierung und Abriss der Werft

**Status:** ready-for-agent
**Priority:** P1
**Size:** M
**Blocked by:** —

## Ziel

Heute berühren Deaktivierung und Abriss eines Werftgebäudes die Werft-Queues nicht: Schiffsbau und Umrüstung laufen weiter, als wäre die Werft aktiv. Wie in STU (`BuildingFunctionActionMapper` → `Shipyard`) sollen BUILD- und RETROFIT-Aufträge pausieren, wenn die passende Werftfunktion deaktiviert wird, und mit verlängerter Restzeit fortsetzen, sobald sie wieder aktiv ist. Wird die Werft abgerissen, werden ihre Aufträge storniert. Dieses Issue legt außerdem den zentralen Gebäudefunktions-Hook an, den col-A1b für Modulfabrik, Akademie und Schilde nutzt.

## STU-Quellen

- `src/Module/Building/Action/BuildingFunctionActionMapper.php` (Zuordnung Funktion → Handler)
- `src/Module/Building/Action/Shipyard.php` (`deactivate` → `stopQueueByColonyAndBuildingFunction`, `activate` → `restartQueueByColonyAndBuildingFunction`, `destruct` → `truncateByColonyAndBuildingFunction`)
- `src/Orm/Repository/ColonyShipQueueRepository.php` (`stop_date`/`finish_date`-Verschiebung)
- `src/Component/Building/BuildingPostAction.php`, `src/Component/Building/BuildingRemovalHandler.php` (Aufrufstellen)

## SWU-Pfade

- `apps/backend/src/modules/colony/building-lifecycle.service.ts` (`activateBuilding`, `deactivateBuilding`, `clearBuilding`) – Hook-Einstieg
- `apps/backend/src/modules/colony/colony-construction.service.ts` (`toggleBuilding`, `demolish`/`removeBuilding`, `deactivateDependentBuildings`)
- `apps/backend/src/modules/colony/colony-building-management.service.ts` (Massenschaltung, ruft `deactivateBuilding`)
- `apps/backend/src/modules/colony/colony-tick-processor.service.ts` (`deactivateFirstMatchingField` – Abschaltkaskade im Tick)
- `apps/backend/src/modules/colony/colony-shipyard.service.ts` (`processShipBuildQueue`, `assertShipyardCompatibility`, `getActiveShipyardFunctionIds`; REPAIR pausiert dort heute schon im Tick)
- `apps/backend/src/modules/colony/entities/colony-ship-build-queue.entity.ts` (`status` inkl. `PAUSED`, `stoppedAt`, `finishesAt`; es gibt noch keine Bindung an eine Werftfunktion – ggf. `buildingFunctionId` ergänzen oder aus der Rumpfkompatibilität ableiten, Migration nach `docs/typeorm-migrations.md`)

## Akzeptanzkriterien

- [ ] Es gibt einen zentralen Hook (z. B. `BuildingFunctionHooks`), der bei Aktivierung, Deaktivierung und Abriss eines Gebäudes je Gebäudefunktion aufgerufen wird – aus Einzelschaltung, Massenschaltung, Tick-Abschaltkaskade, Schadensabschaltung und Abriss gleichermaßen.
- [ ] Deaktivieren einer Werftfunktion setzt alle laufenden BUILD- und RETROFIT-Aufträge dieser Kolonie, die nur diese Werftfunktion nutzen können, auf `PAUSED` und merkt `stoppedAt`.
- [ ] Reaktivieren setzt diese Aufträge auf `QUEUED` zurück; `finishesAt` wird um die Pausendauer verlängert, `stoppedAt` geleert.
- [ ] Gibt es eine zweite aktive, kompatible Werft, pausiert der Auftrag nicht.
- [ ] Abriss einer Werft storniert ihre offenen BUILD- und RETROFIT-Aufträge (`CANCELLED`); zugewiesene Crew und ein umzurüstendes Schiff werden freigegeben, das Schiff bleibt im Orbit erhalten. Materialerstattung beim Abriss nur so, wie die bestehende Abbruchlogik es heute tut (keine neue Erstattungsregel, siehe col-A3b).
- [ ] Bereits vorhandenes REPAIR-Pausenverhalten bleibt unverändert; REPAIR-Aufträge werden beim Deaktivieren über denselben Hook pausiert.
- [ ] Die Projektion zeigt pausierte BUILD-/RETROFIT-Aufträge im Werftpanel als pausiert an (bestehende `PAUSED`-Darstellung in `colony-projection.service.ts` wiederverwenden).
- [ ] Je Pause/Storno entsteht eine Kolonie-Nachricht (Ordner „Kolonien“) mit Schiffs-/Rumpfname.
- [ ] Backend-Tests (`*.spec.ts`): Pause bei Einzel- und Massendeaktivierung, Pause durch Tick-Abschaltkaskade, Fortsetzung mit verlängerter Restzeit, kein Pausieren bei Ersatzwerft, Storno bei Abriss mit Crew-Freigabe.
- [ ] Frontend-Test (`PanelShipyard` bzw. Projektion): pausierter Bauauftrag wird als pausiert angezeigt.

## Comments
