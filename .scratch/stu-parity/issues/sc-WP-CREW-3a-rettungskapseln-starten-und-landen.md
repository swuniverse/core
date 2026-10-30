# Rettungskapseln: Start bei Zerstörung und Landung auf eigener Kolonie

**Status:** resolved
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

- [x] Rettungskapseln sind eine dedizierte neutrale `EscapePod`-Entity, keine `Spacecraft`-Variante und kein Objekt eines Fake-Systemspielers. Sie speichert Position, unveränderliche Herkunftsschiff-Metadaten, Ursprungsfraktion, Präsentationsschlüssel, Startgrund und individuelle Crew-Zuweisungen.
- [x] Crew-Zuweisungen erzwingen genau einen Aufenthaltsort aus Kolonie, Schiff und Rettungskapsel. Crew-ID, Eigner, Name, Typ, Rang, Expertise und sonstiger Individualzustand bleiben bei Transfers erhalten. Schiffbauaufträge sind kein Crew-Aufenthaltsort und reservieren keine individuellen Crew-Zuweisungen.
- [x] Zerstörung, Selbstzerstörung und Lebenserhaltungsausfall verschieben Crew und erzeugen die Kapsel atomar statt Crew zu löschen; Wrack-Aggregate dürfen Kapselinsassen nicht doppelt zählen. Kampf- bzw. Tickbericht meldet die Evakuierung.
- [x] Bei Spezialschaden wird zuerst ein existierendes passierbares Nachbarfeld in letzter Flugrichtung gewählt, sonst deterministisch ein gültiges orthogonales Nachbarfeld; existiert keines, bleibt die Kapsel auf dem Ursprungsfeld.
- [x] Tick-Landung überträgt nur Crew, deren Eigner dem Kolonieeigner entspricht, bis zur lokalen freien Crewkapazität. Fremde und überschüssige Crew bleibt in der Kapsel; nur leere Kapseln werden entfernt; der Eigner erhält eine aggregierte Meldung.
- [x] `game-data` definiert fraktionsbezogene Präsentationen `REBEL_ESCAPE_PODS` und `IMPERIAL_ESCAPE_PODS` mit Icon/Bild, aber keine baubaren, erforschbaren oder steuerbaren `ShipClassDef`-Datensätze; neutrale Platzhalter-Assets sind zulässig.
- [x] NBS-DTO und UI verwenden einen expliziten Zieltyp `ESCAPE_POD`, zeigen Herkunftsschiff und Insassenzahl und bieten keine normalen Schiffsaktionen an.
- [x] Backend-Tests: Integritätsconstraint, Kapselstart bei jedem Auslöser, Identitäts-/Expertiseerhalt, Fluchtfeld-Fallback, Landung mit Eigner- und Platzgrenze, Verbleib fremder Crew und Entfernen leerer Kapseln; Frontend-Test NBS-Eintrag.
- [x] `lint`, `typecheck`, `test` und `build` sind grün.

## Entscheidung

Rettungskapseln werden als eigener neutraler Aggregate Root modelliert und bewahren einzelne Crewmitglieder vollständig. Die fraktionsbezogenen Definitionen dienen ausschließlich Sensorik und Darstellung, nicht als normale Schiffsklassen. Landung überträgt nur passende eigene Crew im Rahmen der lokalen Kapazität; Restinsassen bleiben erhalten.

Schiffbau reserviert keine individuelle Crew. Ein Bauauftrag beschreibt lediglich den Crewbedarf der Schiffsklasse; das fertiggestellte Schiff entsteht unbemannt. Crew wird anschließend über den normalen Crewtransfer von einer Kolonie oder einem dafür geeigneten Transporter zugewiesen. Bauaufträge sind daher kein vierter Aufenthaltsort von `CrewAssignment`; bestehende `crewIds`-Reservierungen und ortlose Baucrew sind aus dem produktiven Modell zu entfernen beziehungsweise sicher zu migrieren.

## Comments

- 2026-10-22: Abbruch vor Produktcodeänderungen: Die geforderte „Kapselklasse je Fraktion in `game-data`“ braucht konkrete, kanonnahe Star-Wars-Klassen (Namen, IDs/Keys und Assets) sowie eine Entscheidung, ob Rettungskapseln trotz neutralem Besitz als `Spacecraft` mit der ursprünglichen Fraktionsklasse oder als eigene Entity modelliert werden. Das bestehende `Spacecraft`-Modell verlangt einen Spieler-Eigner und eine `ShipClassDef`; STU nutzt dagegen den Fallback-Spieler „niemand“. Bitte diese Eigentums- und Klassenzuordnung festlegen.
- 2026-10-27 Product Owner: Eigene neutrale `EscapePod`-Entität mit individuellen Crew-Zuweisungen. Fraktionsdefinitionen sind reine Präsentationsdaten; Crew-Identität, Rang und Expertise bleiben erhalten, und Landung überträgt nur Crew des Kolonieeigners bis zur freien Kapazität.
- 2026-10-27: Abbruch ohne Produktcodeänderungen: Das Issue kollidiert mit dem bestehenden Schiffbau-Reservierungsmodell, in dem `CrewAssignment` während eines Bauauftrags weder Kolonie noch Schiff zugeordnet ist. Für den geforderten Integritätsconstraint braucht es eine Produkt-/Domänenentscheidung: Soll `shipBuildQueueId` als vierter kanonischer Aufenthaltsort modelliert und das Kriterium entsprechend erweitert werden, oder sollen Bauaufträge Crew künftig an der Kolonie belassen und lediglich reservieren? Diese Vorarbeit betrifft Schiffbau, Abbruch, Hangarstart und Destruktions-Hooks und ist nicht als Voraussetzung im Issue erfasst.
- 2026-10-30 Product Owner: Option 4, präzisiert nach STU-Spielsemantik. Beim Bau wird keine individuelle Crew reserviert. Der Auftrag enthält nur den Crewbedarf der Schiffsklasse; das Schiff wird unbemannt fertiggestellt. Crew gelangt erst danach über den normalen Transfer von einer Kolonie oder einem geeigneten Transporter auf das Schiff. `shipBuildQueueId` wird deshalb kein Crew-Aufenthaltsort. Die bestehende SWU-Reservierung über `queue.crewIds` und Crew ohne kanonischen Ort ist zu entfernen beziehungsweise bei Bestandsdaten sicher zurückzuführen. Damit bleibt der Integritätsconstraint auf genau Kolonie, Schiff oder Rettungskapsel beschränkt und das Issue ist vollständig spezifiziert.
- 2026-10-30: Umgesetzt. `EscapePod`-Entity (`escape_pods`) und `crew_assignments.escapePodId` mit DB-Check `CHK_crew_assignments_single_location` (genau Kolonie, Schiff oder Kapsel); Migration `20261030160000` entfernt zugleich `colony_ship_build_queue.crewIds/crewAssigned`, gibt reservierte Baucrew an die Kolonie zurück und löscht ortlose Crew. Schiffbau und Hangarstart bemannen nicht mehr über Reservierung (Hangarstart überträgt per `transferCrewFromColonyToShip`, Werftschiffe entstehen unbemannt). `EscapePodService` (`spacecraft/escape-pod.service.ts`): `launchForShip` in der Zerstörungstransaktion (Kampf, Selbstzerstörung) und bei Lebenserhaltungsausfall (`processTick`), Fluchtfeld-Logik, Tick-Landung (`processTick` im Haupttick vor dem Wrackverfall) mit aggregierter Meldung; Wrack zählt `crewCount` nun 0. `game-data/data/ship-building/escape-pod-presentations.yaml` (Submodul-Commit) mit `REBEL_ESCAPE_PODS`/`IMPERIAL_ESCAPE_PODS` (Platzhalter-Icons `ships/buoy`). NBS-DTO `escapePods` (`targetType: 'ESCAPE_POD'`) und Zeile in `NearbySensorPanel` ohne Aktionen.
- Hinweis: Die Postgres-Integrationssuite (`backend:test-integration`) lädt schon auf dem Ausgangsstand nicht (Migrationsspec liegt im Migrationsordner); `escape-pod.int-spec.ts` ist geschrieben, aber hier nicht lauffähig. Die Migration wurde manuell gegen ein Wegwerf-Postgres geprüft (Backfill, Constraint). Der Spacecraft-Integrationstest bleibt ein Folgepunkt von `sh-AP-23`.
- Offen: Die Kapsel-NBS-Einträge zeigen keine Bergung (CREW-3b). Das Wrack-Aggregat `crewCount` bleibt im Schema, wird aber nicht mehr befüllt.
