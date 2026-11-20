# Flottenkontrolle Backend: Systeme flottenweit schalten, 100 Crew je Flotte

**Status:** resolved
**Priority:** P2
**Size:** M
**Blocked by:** —

## Ziel

SWU kann Systeme nur je Schiff schalten (`PATCH :id/systems/:systemKey`); in großen Flotten muss vor einem Kampf jedes Schiff einzeln geschaltet werden. STU schaltet vom Führungsschiff aus NBS, Schilde, Strahlenwaffen, Torpedos, Tarnung und Warp flottenweit (`isfleet`) mit Meldung je Schiff. Außerdem fehlt die STU-Regel „höchstens 100 Crew je Flotte“ (`GameEnum::CREW_PER_FLEET`).

## STU-Quellen

- `src/Module/Spacecraft/Action/ActivateSystem/ActivateSystem.php` (Z. ~27, `isfleet`), `DeactivateSystem/`
- `src/Component/Spacecraft/System/Control/ActivatorDeactivatorHelper.php` (`activateFleet`, `deactivateFleet`, Z. ~48–130)
- `src/Module/Ship/Action/JoinFleet/AbstractJoinFleet.php` (Z. ~73, Crewsumme gegen `GameEnum::CREW_PER_FLEET`)
- `src/Component/Game/GameEnum.php` (`CREW_PER_FLEET = 100`), `src/Module/Maintenance/CorruptFleetDeletion.php`

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/spacecraft.controller.ts` (Flottenendpunkte `fleets/:fleetId/*`)
- `apps/backend/src/modules/spacecraft/spacecraft.service.ts` (`toggleSystem`, `joinFleet` Z. ~3374, `createFleet`; parallel in Arbeit, Zeilen auf HEAD)
- `apps/backend/src/modules/spacecraft/fleet-lock.ts`, `fleet-leadership.ts`
- `packages/shared/src/lib/spacecraft/index.ts` (Ergebnis-DTO je Schiff)

## Akzeptanzkriterien

- [x] Neuer Endpunkt `PATCH fleets/:fleetId/systems/:systemKey` (nur Führungsschiff-Eigner) schaltet NBS, Schilde, Strahlenwaffen, Torpedobank, Tarnung und Hyperantrieb für alle Mitglieder schiffsweise wie STU: jedes Schiff einzeln mit eigenen Kosten/Prüfungen, Teilergebnis mit Meldung je Schiff, keine Gesamtablehnung.
- [x] `joinFleet` (und Flottenerstellung) lehnt ab, wenn die Bauplan-Crewsumme der Flotte 100 übersteigen würde, mit STU-Meldung „maximal 100 Crew pro Flotte“.
- [x] Bestandsflotten über dem Limit: Umgang festlegen (STU löscht korrupte Flotten in Maintenance) und umsetzen.
- [x] Flotten-DTO liefert Crewsumme und Limit für die Anzeige (sc-AUD-05b, sc-AUD-16).
- [x] Backend-Tests: Teilergebnis bei EPS-Mangel einzelner Schiffe, Rechteprüfung, Crewlimit beim Beitritt.

## Herkunft

- Audit 2026-11-17: [README.md](../audit-2026-11-17/README.md) Abschnitt B5 und E („Flottenkontrolle“); [spacecraft.md](../audit-2026-11-17/spacecraft.md) große Abweichung 5 und kleine Abweichungen (Crewzähler, `CREW_PER_FLEET`).
- PO-Linie 2026-11-17 „wie STU“ (README G–N). Kein bisheriges Ticket deckt das ab.

## Comments

- 2026-11-20 – umgesetzt, Prüfung ausstehend (Commit `feat(spacecraft): fleet-wide system toggle and fleet crew limit (stu-parity sc-AUD-05a)`).
  - Endpunkt `PATCH fleets/:fleetId/systems/:systemKey` (`SpacecraftService.toggleFleetSystem`): nur eigene Flotte (`requireFleet`), Systeme aus `FLEET_SWITCHABLE_SYSTEM_KEYS`; ruft je Mitglied `toggleSystem` auf, damit Kosten/Prüfungen/Meldungen identisch zum Einzelschalten sind. Antwort `FleetSystemToggleResultDto` mit `applied`/`failed` je Schiff.
  - Crewlimit `CREW_PER_FLEET = 100` (shared) über Summe `crewRequired` in `joinFleet` und `createFleet`, Meldung „<Schiff>: Es sind maximal 100 Crew pro Flotte möglich“.
  - Bestandsflotten: Migration `20261120120000-dissolve-fleets-over-crew-limit` löst Nicht-NPC-Flotten über 100 Crew auf (Orbitaufträge kaskadieren, Mitglieder `fleetId = NULL`). Keine laufende Maintenance nötig, da `crewRequired` nach Bau fix ist und Beitritt jetzt geprüft wird.
  - `getUserFleets` liefert `crewSum`/`crewLimit`.
  - Checks: `spacecraft-fleet.service.spec.ts` grün (neue Tests: Teilergebnis bei EPS-Mangel, Rechte/Systemfilter, Crewlimit Beitritt 40/41, Erstellung 101, Crewsumme), Typecheck backend+shared grün, ESLint ohne Fehler. Backend-Suite: 2680/2681, einziger Fehlschlag `resource-collection.controller.spec.ts` (PermissionGuard) vorbestehend, nicht berührt.
  - Ausstehend (gesammelter Prüfpass): Abschlussreview, Migration gegen lokale PostgreSQL, Integrationstest Flottenschalten mit echtem `toggleSystem`, Build.
  - Modell: Claude Opus 5.5 direkt (Sol/Luna in dieser Session nicht verfügbar).
- 2026-11-20 – **resolved nach Verifikation.** Review: Bereinigungsmigration löscht nur Spielerflotten über 100 Bauplan-Crew; Schiffe fallen per `ON DELETE SET NULL` aus der Flotte, Orbitaufträge per FK. Migration läuft in der Integrationssuite. Gesammelter Verifikationslauf 2026-11-20 (Claude Opus 5.5, Sol nicht verfügbar): Diff-Review gegen die Akzeptanzkriterien; `npm run lint` 0 Fehler, `npm run typecheck` grün, `npm run test` grün (Backend 2700/2700, Frontend 972/972), PostgreSQL-Integrationssuite inkl. aller Migrationen 1058/1062 – die 4 Fehler lagen in zwei veralteten Test-Fixtures (`profile-friends.int-spec.ts`: `shipRepo`-Mock ohne `manager` seit sc-AUD-13; `layer-access-http.int-spec.ts`: `MAP_EDITOR` nur im JWT, seit col-AUD-16a liest `JwtStrategy` Rechte aus der DB), korrigiert und erneut 54/54 grün. Browserprüfungen entfallen laut Nutzerentscheid vom 2026-11-20.
