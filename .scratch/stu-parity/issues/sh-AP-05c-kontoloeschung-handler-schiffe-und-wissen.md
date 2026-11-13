# Kontolöschung: Handler für Schiffe, Flotten, Forschung und Kartenwissen

**Status:** resolved
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

- [x] Schiffe des Spielers werden entfernt, ohne Wracks zu erzeugen; offene Notrufe enden; Fracht, Module, Torpedos und Crew auf den Schiffen werden mitgelöscht; Flotten werden aufgelöst.
- [x] Baupläne werden gelöscht, sofern kein fremdes Schiff oder keine fremde Bauqueue sie referenziert; sonst bleiben sie ohne Besitzerbezug (analog STU `USER_FOREIGN_BUILDPLANS`).
- [x] Forschungsstände, Kartographiepläne, Systementdeckungen, Erkundungszustände, Klassenentdeckungen, eigene Kolonie-Scans und Scanergebnisse sowie das Schiffslogbuch werden gelöscht.
- [x] Reihenfolge so, dass keine FK-Verletzung entsteht; der Handler läuft vor dem Kolonie-Handler aus sh-AP-05d.
- [x] Integrationstest (Postgres): Spieler mit Schiff in Flotte, Bauplan, Forschung, Kartographieplan und Kolonie-Scan wird gelöscht; Schiffe und Wissen sind weg; Daten anderer Spieler unverändert.

## Comments

- 2026-10-30: Die Implementierung und der fokussierte Postgres-Integrationstest sind grün, aber die verpflichtenden Workspace-Gates scheitern nach zwei ernsthaften Läufen an unabhängigen Baseline-Fehlern: Backend-Build/Typecheck kann `dotenv` aus `typeorm-migration.config.ts` nicht auflösen (zusätzlich TS6305-Artefaktfehler), Frontend-Build kann `pixi.js` aus `SystemViewDialog.tsx` nicht auflösen. Produktcode wurde gemäß Ralph-Abbruchregel verworfen. Bitte zuerst die Build-/Dependency-Baseline reparieren (vgl. `sh-AP-23`) und dieses Issue danach erneut auf `ready-for-agent` setzen.
- 2026-11-09: Die integrierte Baseline 14b86081/c8e14f1c beseitigt den zuletzt dokumentierten fachfremden Blocker (Dependency-/Build-Gates (dotenv, pixi.js, TS6305)); reguläre Nx-Lint-/Typecheck-/Build-Gates und vollständige Tests sind laut Baseline-Review grün, lokale Test-Spieldaten waren dafür vorhanden. Status ready-for-agent; vorhandene Issue-Abhängigkeiten bleiben verbindlich. Dies belegt keine Feature-Fertigstellung: verworfene Änderungen müssen neu umgesetzt und die aktuellen Issue-Tests und Pflicht-Gates erneut ausgeführt werden; keine Ausnahme.
- 2026-11-13: Umgesetzt (04779aa5, gemeinsam mit sh-AP-05b).
  - `SpacecraftDeletionHandler` (Reihenfolge 200, nach Handel 100, der eigene Handelsposten verlässt, bevor ihre Station verschwindet; vor dem Kolonie-Handler aus sh-AP-05d).
  - Schiffe werden ohne Wrack entfernt; Fracht, Module, Torpedos, Notrufe, Übernahmen, Reparaturen und Logbuch folgen per Cascade. Crew an Bord, in Rettungskapseln und ohne Posten wird gelöscht (Kolonie-Crew bleibt für sh-AP-05d), dadurch leere Kapseln ebenfalls. Fremde Traktorstrahlen auf eigene Schiffe werden gelöst und abgeschaltet. Flotten werden aufgelöst, Blockaden der gelöschten Flotten aufgehoben (`isBlockaded` neu berechnet).
  - Baupläne: Pläne, die fremde Schiffe, fremde Bauaufträge, Hutten-Deals oder Lotteriegewinne referenzieren, bleiben ohne Besitzer (`colony_ship_buildplans.userId` nullable, STU `USER_FOREIGN_BUILDPLANS`), alle anderen werden gelöscht. Eigene Bauaufträge an fremden Stationswerften entfallen.
  - Schiffs-, Stations-, Himmelskörper- und Systemtyp-Entdeckungen sowie Forschungsbelohnungen werden gelöscht; Forschung, Kartographiepläne, Erkundung, Kolonie-Scans, Scanergebnisse, Bojen und Flugsignaturen folgen per Cascade.
  - Admin-Sofortlöschung lehnt nur noch Konten mit Kolonien ab (bis sh-AP-05d).
  - Tests: `account-deletion.int-spec.ts` (Schiff in Flotte mit Fracht und Crew, Rettungskapsel, fremdes Schiff mit Traktor und Crew, geteilter und eigener Bauplan, Entdeckungen, Forschung, Blockade, Station mit Handelsposten; Daten anderer Spieler unverändert, kein Wrack). Mutationsprobe (Crew-Löschung entfernt) lässt den Test scheitern.
  - Gates: Lint 0 Fehler (Warnungen unverändert 1442/110), Typecheck und Build grün, Backend-Unit 2089/2089, Frontend 752/752 (nach Typfix im neuen Frontend-Test erneut grün). Integration 670/696: die 26 Fehler in `starmap-contacts-requests` und `statistics` (`LayerAccessGuard`) bestehen unverändert vor dieser Änderung.
