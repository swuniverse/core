# Rettungskapseln: Start bei Zerstörung und Landung auf eigener Kolonie

**Status:** claimed
**Priority:** P2
**Size:** M
**Blocked by:** sc-WP-ENG-6a

## Ziel

Kanonischer Eigentümer laut map.md. Wird ein Schiff zerstört, selbst zerstört oder fällt die Lebenserhaltung aus, bleibt die individuelle Crew in einer dedizierten neutralen Rettungskapsel erhalten. Kapseln sind passive Objekte am Feld oder einem sicheren Nachbarfeld und landen passende Crew im Tick auf der Kolonie ihres Eigners.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Spacecraft/Lib/Crew/LaunchEscapePods.php` (Rumpf je Fraktion, Hülle 1, Besitzer „niemand“, Name „Rettungskapseln von (ID)“, Flucht ins Nachbarfeld bei Spezialschaden)
- `Module/Spacecraft/Lib/Crew/SpacecraftLeaver.php` (`evacuate`, `leaveSpacecraft`)
- `Module/Spacecraft/Lib/Destruction/Handler/CrewEvacuation.php`
- `Module/Tick/Spacecraft/ManagerComponent/EscapePodHandling.php` (leere Kapseln entfernen; Crew landet auf Kolonie des Eigners am Feld, sofern Platz; PM)

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/spacecraft-destruction.service.ts` (`finalizeInManager`, `selfDestruct`, `destroyFromCombat`)
- `apps/backend/src/modules/colony/entities/crew-assignment.entity.ts` (`spacecraftId`, `colonyId`, neues `escapePodId`)
- `apps/backend/src/modules/colony/colony-crew.service.ts` (freie Plätze)
- Evakuierungs-Hook aus sc-WP-ENG-6a
- `apps/backend/src/modules/tick/tick.service.ts`, `apps/backend/src/modules/messaging/messaging.service.ts`
- `game-data` für fraktionsbezogene Kapsel-Präsentation, nicht baubare Schiffsklassen
- `apps/frontend/src/components/spacecraft/NearbySensorPanel.tsx` (Kapseln in NBS)

## Akzeptanzkriterien

- [ ] Rettungskapseln sind eine dedizierte neutrale `EscapePod`-Entity, keine `Spacecraft`-Variante und kein Objekt eines Fake-Systemspielers. Sie speichert Position, unveränderliche Herkunftsschiff-Metadaten, Ursprungsfraktion, Präsentationsschlüssel, Startgrund und individuelle Crew-Zuweisungen.
- [ ] Crew-Zuweisungen erzwingen genau einen Aufenthaltsort aus Kolonie, Schiff und Rettungskapsel. Crew-ID, Eigner, Name, Typ, Rang, Expertise und sonstiger Individualzustand bleiben bei Transfers erhalten.
- [ ] Zerstörung, Selbstzerstörung und Lebenserhaltungsausfall verschieben Crew und erzeugen die Kapsel atomar statt Crew zu löschen; Wrack-Aggregate dürfen Kapselinsassen nicht doppelt zählen. Kampf- bzw. Tickbericht meldet die Evakuierung.
- [ ] Bei Spezialschaden wird zuerst ein existierendes passierbares Nachbarfeld in letzter Flugrichtung gewählt, sonst deterministisch ein gültiges orthogonales Nachbarfeld; existiert keines, bleibt die Kapsel auf dem Ursprungsfeld.
- [ ] Tick-Landung überträgt nur Crew, deren Eigner dem Kolonieeigner entspricht, bis zur lokalen freien Crewkapazität. Fremde und überschüssige Crew bleibt in der Kapsel; nur leere Kapseln werden entfernt; der Eigner erhält eine aggregierte Meldung.
- [ ] `game-data` definiert fraktionsbezogene Präsentationen `REBEL_ESCAPE_PODS` und `IMPERIAL_ESCAPE_PODS` mit Icon/Bild, aber keine baubaren, erforschbaren oder steuerbaren `ShipClassDef`-Datensätze; neutrale Platzhalter-Assets sind zulässig.
- [ ] NBS-DTO und UI verwenden einen expliziten Zieltyp `ESCAPE_POD`, zeigen Herkunftsschiff und Insassenzahl und bieten keine normalen Schiffsaktionen an.
- [ ] Backend-Tests: Integritätsconstraint, Kapselstart bei jedem Auslöser, Identitäts-/Expertiseerhalt, Fluchtfeld-Fallback, Landung mit Eigner- und Platzgrenze, Verbleib fremder Crew und Entfernen leerer Kapseln; Frontend-Test NBS-Eintrag.
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Entscheidung

Rettungskapseln werden als eigener neutraler Aggregate Root modelliert und bewahren einzelne Crewmitglieder vollständig. Die fraktionsbezogenen Definitionen dienen ausschließlich Sensorik und Darstellung, nicht als normale Schiffsklassen. Landung überträgt nur passende eigene Crew im Rahmen der lokalen Kapazität; Restinsassen bleiben erhalten.

## Comments

- 2026-10-22: Abbruch vor Produktcodeänderungen: Die geforderte „Kapselklasse je Fraktion in `game-data`“ braucht konkrete, kanonnahe Star-Wars-Klassen (Namen, IDs/Keys und Assets) sowie eine Entscheidung, ob Rettungskapseln trotz neutralem Besitz als `Spacecraft` mit der ursprünglichen Fraktionsklasse oder als eigene Entity modelliert werden. Das bestehende `Spacecraft`-Modell verlangt einen Spieler-Eigner und eine `ShipClassDef`; STU nutzt dagegen den Fallback-Spieler „niemand“. Bitte diese Eigentums- und Klassenzuordnung festlegen.
- 2026-10-27 Product Owner: Eigene neutrale `EscapePod`-Entität mit individuellen Crew-Zuweisungen. Fraktionsdefinitionen sind reine Präsentationsdaten; Crew-Identität, Rang und Expertise bleiben erhalten, und Landung überträgt nur Crew des Kolonieeigners bis zur freien Kapazität.
