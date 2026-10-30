# Kontolöschung: Handler für Schiffe, Flotten, Forschung und Kartenwissen

**Status:** claimed
**Priority:** P2
**Size:** M
**Blocked by:** sh-AP-05a

## Ziel

Schiffe, Flotten, Baupläne, Forschung und das persönliche Kartenwissen eines gelöschten Spielers werden über registrierte Handler entfernt, wie STU es mit den Spacecraft-, Fleet-, Buildplan-, Crew- und UserMap-Handlern tut. Fremde Daten (z. B. Kolonie-Scans anderer Spieler über Kolonien des Gelöschten) bleiben unberührt. Kanonisch für den Schiffsteil von soc-H4 (Teil c).

## STU-Quellen

- `src/Component/Player/Deletion/Handler/SpacecraftDeletionHandler.php` (Traktor lösen, Andockungen lösen, Entfernen)
- `FleetDeletionHandler.php`, `SpacecraftBuildplanDeletionHandler.php`, `CrewDeletionHandler.php`, `UserMapDeletionHandler.php`, `AstronomicalEntryDeletionHandler.php`, `ShipTakeoverHandler.php`

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/entities/*` (`spacecraft`, `fleet`, `cartography-plan`, `colony-scan`, `spacecraft-scan-result`, `ship-log-entry`, `ship-distress-signal`, `ship-class-discovery`)
- `apps/backend/src/modules/colony/entities/colony-ship-buildplan.entity.ts`, `crew.entity.ts`, `crew-assignment.entity.ts`
- `apps/backend/src/modules/research/entities/research.entity.ts`
- `apps/backend/src/modules/starmap/entities/*` (`exploration-state`, `system-exploration`, `celestial-class-discovery`, `system-type-discovery`)
- Handler-Registrierung aus sh-AP-05a

## Akzeptanzkriterien

- [ ] Schiffe des Spielers werden entfernt, ohne Wracks zu erzeugen; offene Notrufe enden; Fracht, Module, Torpedos und Crew auf den Schiffen werden mitgelöscht; Flotten werden aufgelöst.
- [ ] Baupläne werden gelöscht, sofern kein fremdes Schiff oder keine fremde Bauqueue sie referenziert; sonst bleiben sie ohne Besitzerbezug (analog STU `USER_FOREIGN_BUILDPLANS`).
- [ ] Forschungsstände, Kartographiepläne, Systementdeckungen, Erkundungszustände, Klassenentdeckungen, eigene Kolonie-Scans und Scanergebnisse sowie das Schiffslogbuch werden gelöscht.
- [ ] Reihenfolge so, dass keine FK-Verletzung entsteht; der Handler läuft vor dem Kolonie-Handler aus sh-AP-05d.
- [ ] Integrationstest (Postgres): Spieler mit Schiff in Flotte, Bauplan, Forschung, Kartographieplan und Kolonie-Scan wird gelöscht; Schiffe und Wissen sind weg; Daten anderer Spieler unverändert.

## Comments
