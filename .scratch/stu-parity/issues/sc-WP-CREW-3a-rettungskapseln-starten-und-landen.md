# Rettungskapseln: Start bei Zerstörung und Landung auf eigener Kolonie

**Status:** claimed
**Priority:** P2
**Size:** M
**Blocked by:** sc-WP-ENG-6a

## Ziel

Kanonischer Eigentümer laut map.md. Wird ein Schiff zerstört oder selbst zerstört oder fällt die Lebenserhaltung aus, startet die Crew wie in STU in Rettungskapseln statt zu sterben. Kapseln sind ein eigenes Objekt am Feld (bzw. am Nachbarfeld, wenn das Feld Spezialschaden hat). Befinden sich Kapseln auf dem Feld einer Kolonie, gelangt die Crew des Kolonieeigners im Tick dorthin.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Spacecraft/Lib/Crew/LaunchEscapePods.php` (Rumpf je Fraktion, Hülle 1, Besitzer „niemand“, Name „Rettungskapseln von (ID)“, Flucht ins Nachbarfeld bei Spezialschaden)
- `Module/Spacecraft/Lib/Crew/SpacecraftLeaver.php` (`evacuate`, `leaveSpacecraft`)
- `Module/Spacecraft/Lib/Destruction/Handler/CrewEvacuation.php`
- `Module/Tick/Spacecraft/ManagerComponent/EscapePodHandling.php` (leere Kapseln entfernen; Crew landet auf Kolonie des Eigners am Feld, sofern Platz; PM)

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/spacecraft-destruction.service.ts` (`finalizeInManager`, `selfDestruct`, `destroyFromCombat`)
- `apps/backend/src/modules/colony/entities/crew-assignment.entity.ts` (`spacecraftId`, `colonyId`)
- `apps/backend/src/modules/colony/colony-crew.service.ts` (freie Plätze)
- Evakuierungs-Hook aus sc-WP-ENG-6a
- `apps/backend/src/modules/tick/tick.service.ts`, `apps/backend/src/modules/messaging/messaging.service.ts`
- `game-data/data/ship-building/ship-classes.yaml` (Kapselklasse je Fraktion, Submodul)
- `apps/frontend/src/components/spacecraft/NearbySensorPanel.tsx` (Kapseln in NBS)

## Akzeptanzkriterien

- [ ] Rettungskapseln existieren als Objekt (eigene Entity oder Spacecraft-Variante; Wahl begründet im Comment) mit Position, Herkunftsschiff und Crew-Zuweisungen; Klasse je Fraktion in `game-data`.
- [ ] Zerstörung, Selbstzerstörung und Lebenserhaltungsausfall verschieben die Crew in Kapseln statt sie zu löschen; das Ergebnis erscheint im Kampf- bzw. Tickbericht („Die Crew hat das Schiff in den Rettungskapseln verlassen“).
- [ ] Hat das Feld Spezialschaden, landen Kapseln auf einem Nachbarfeld in Flugrichtung bzw. zufällig.
- [ ] Tick: Kapseln auf dem Feld einer Kolonie übergeben Crew des Kolonieeigners bis zu den freien Plätzen; leere Kapseln werden entfernt; Eigner erhält eine Meldung.
- [ ] Kapseln erscheinen in der NBS-Liste am Feld.
- [ ] Backend-Tests: Kapselstart bei jedem Auslöser, Fluchtfeld, Landung mit Platzgrenze, Entfernen leerer Kapseln; Frontend-Test NBS-Eintrag.
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Comments
