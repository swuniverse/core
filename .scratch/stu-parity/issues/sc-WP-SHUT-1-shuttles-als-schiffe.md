# Shuttles als eigenständige Schiffe starten und aufnehmen

**Status:** resolved
**Priority:** P3
**Size:** M
**Blocked by:** —

## Ziel

In STU sind Shuttles startbare Schiffe: Ein Schiff mit Shuttlerampe startet ein Shuttle aus dem Lager (`StartShuttle`), nimmt es am Feld wieder auf (`StoreShuttle`) oder landet es auf einer Kolonie (`LandShuttle`). In SWU sind Shuttles reine Lagerware (`colony-orbit.service.ts transferShuttles`, `shuttleSlots`). Die Abweichung muss entschieden werden.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Spacecraft/Action/{StartShuttle,StoreShuttle}`, `Module/Ship/Action/LandShuttle`
- `Component/Spacecraft/System/Type/ShuttleRampShipSystem.php`, `html/spacecraft/shuttleManagement.twig`
- `Module/Station/Action/ManageShuttles`, `Module/Station/View/ShowShuttleManagement`

## SWU-Pfade

- `apps/backend/src/modules/colony/colony-orbit.service.ts` (`transferShuttles`)
- `game-data/data/modules/special.yaml` („Shuttlerampe“, `shuttleLaunchCapacity`), `game-data/data/fabrication/stu-fabrication.yaml`
- `game-data/data/ship-building/stu-special-module-audit.md`

## Akzeptanzkriterien

- [x] Shuttlerampe als Laufzeitsystem; Start eines Shuttles aus dem Lager als eigenes Schiff, Aufnahme am Feld, Landung auf einer Kolonie (STU `StartShuttle`, `StoreShuttle`, `LandShuttle`).
- [x] Shuttle-Management an Stationen (sobald sc-WP-STAT-2 erledigt), gemeinsame Start-/Andockmechanik mit den Workbees aus sc-WP-STAT-1a (keine Doppelimplementierung).
- [x] Backend- und Frontend-Tests für Start, Aufnahme, Landung und Kapazitätsgrenzen.
- [x] `lint`, `typecheck`, `test` und `build` sind grün.

## Entscheidung

Vorgabe: Variante (a), STU-Parität. Shuttlerampe als Laufzeitsystem, Start/Aufnahme/Landung, Shuttle-Management an Stationen; Mechanik gemeinsam mit dem Workbee-Start aus sc-WP-STAT-1a.

## Comments

- 2026-10-21 Product Owner: Option a – Shuttles werden wie in STU startbare Schiffe (Start, Aufnahme, Landung, Shuttle-Management an Stationen), mit derselben Mechanik wie das Starten der Workbees.

- 2026-10-29 Agent: Umsetzung nach zwei ernsthaften Prüfversuchen abgebrochen. Der verpflichtende Lauf `npx nx affected -t lint typecheck test --base=HEAD` scheitert reproduzierbar im bereits bestehenden Frontend-Typecheck außerhalb dieses Issues (`apps/frontend/src/pages/database.tsx:1015` inkompatibler Faction-Typ sowie zahlreiche TS6305-Ausgabedatei-Fehler). Die isolierten Shuttle-Tests waren grün (Backend 5/5, Frontend 13/13), aber gemäß Ablauf darf das Issue erst fortgesetzt werden, wenn der Basis-Typecheck wieder grün ist.
- 2026-11-09: Die integrierte Baseline 14b86081/c8e14f1c beseitigt den zuletzt dokumentierten fachfremden Blocker (Frontend-Faction-/TS6305-Gate); reguläre Nx-Lint-/Typecheck-/Build-Gates und vollständige Tests sind laut Baseline-Review grün, lokale Test-Spieldaten waren dafür vorhanden. Status ready-for-agent; vorhandene Issue-Abhängigkeiten bleiben verbindlich. Dies belegt keine Feature-Fertigstellung: verworfene Änderungen müssen neu umgesetzt und die aktuellen Issue-Tests und Pflicht-Gates erneut ausgeführt werden; keine Ausnahme.

## Answer

- Gemeinsames Shuttle-Management in der Schiffskontrolle für Schiffe und Stationen: Lagerbestand mit Startkosten, eigene Shuttles am Feld aufnehmen und als Shuttle auf einer eigenen Kolonie mit aktivem Landeplatz (Funktion 4) landen. Eigentümergeschützte API unter `/spacecraft/:id/shuttles` mit `launch`, `store` und `land`.
- Die Shuttlerampe ist ein passives, aus dem tatsächlich eingebauten Modul abgeleitetes Laufzeitsystem ohne Aktivierungs- oder laufende EPS-Kosten. Start kostet die volle konfigurierte EPS-Ladung des neuen Schiffs und überträgt ausschließlich freie eigene Crew. Standardmodule und Crewbedarf kommen aus den Hangardefinitionen; Schilde und Hyperantrieb starten deaktiviert. Shuttles und Workbees erhalten keinen Standard-Deflektor.
- Start und Workbee-Start beim Stationsbau teilen Vorbereitung, Schiffserstellung und Crewzuweisung in `small-craft-launch.ts`. Originale Warenvarianten bleiben mit `shuttleCommodityId` erhalten, auch bei Kolonie-Hangarstart und regulärem Bau kleiner Schiffe.
- Aufnahme und Landung führen Rumpf, gesamte Fracht und Crew zurück. Shuttleplätze, Lager und Crewquartiere werden vorab geprüft; auch mitgeführte Shuttle-Rümpfe zählen gegen die Platzgrenze. Kapazität ist das Maximum aus Rumpfplätzen und der Summe intakter Rampen (Modulstufe × `shuttleLaunchCapacity`), sodass Stationen ohne Rumpfplätze ihre Rampen nutzen können.
- Alle Änderungen erfolgen atomar mit PostgreSQL-Sperren und transaktionalen Nachrichten. Ungeeigneter Standort, laufender Auftrag, Flottenzugehörigkeit, Traktorbindung, andere Andockbindung, Tarnung, aktivierte Schilde/Hyperantrieb und unzureichende Kapazitäten verhindern die jeweilige Aktion. Bestehende Kolonie-Lagertransfers nutzen dieselbe Slot- und Transaktionslogik.
- Die alte numerische Shuttle-Markierung traf Frachterwaren (216xx). Erkennung erfolgt jetzt aus echten SHUTTLE-/WORKBEE-Hangardefinitionen samt Legacy-Workbee-Varianten 20061–20065.

### STU-Abgleich

STU `LandShuttle` landet tatsächlich auf einem anderen Spacecraft; das Ticket verlangt ausdrücklich die Kolonielandung. SWU bietet deshalb Aufnahme am Feld sowie Kolonielandung. Fracht wird bei der Aufnahme erhalten statt verworfen. Die passive Rampe und das Fehlen eines Standard-Deflektors entsprechen dem STU-Systemmodell.

## Validation

- 2026-11-16: `npx nx affected -t lint typecheck test --base=HEAD --parallel=2` grün: Backend 238 Suites / 2303 Tests, Frontend 118 Dateien / 827 Tests; sämtliche Lint-/Typecheck-Targets erfolgreich. Bekannte Lint-Warnungen ohne Fehler.
- `npx nx run backend:test-integration --runInBand --testPathPatterns=shuttle`: 33 PostgreSQL-Tests grün. Start/Aufnahme/Landung, Stationen, Warenvarianten, Workbee-Start über den echten Stationsbaudienst, EPS/Crew/Lager/Slots, Übernahme weiterer Shuttle-Rümpfe in der Fracht, Eigentum, paralleler Doppelstart, NOWAIT-Sperren und Nachrichten-Rollback.
- Sechs Frontend-Tests über die öffentliche Schiffskontrolle für Start/Aufnahme/Landung, blockierte Aktionen, fehlende Kolonien und API-Fehler; Backend prüft DTO-Validierung, passive Rampen und fehlenden Standard-Deflektor sowie den echten Hangar-/Warenkatalog.
- `npx nx run-many --targets=build`: alle drei Projekte grün. Deklarationsausgaben nach dem Webpack-Build separat wiederhergestellt.
- Migration `AddShuttleCommodity20261116160000` in der lokalen Dev-Datenbank auf Port 5490 erfolgreich angewendet; nullable Integer-Spalte `spacecraft.shuttleCommodityId` und Migrationseintrag separat abgefragt. Keine Daten zurückgesetzt.
- Game-data-Konsistenz für Hangarwaren, Standardmodule und passive Rampen/Fertigung geprüft. Der allgemeine Game-data-Validator meldet weiterhin die bekannten 14 fehlenden Stationsrumpf-Statistiken außerhalb dieses Tickets.
