# Traktorstrahl als Standardsystem wie STU

**Status:** claimed
**Priority:** P2
**Size:** S
**Blocked by:** —

## Ziel

Der Traktorstrahl ist seit sc-WP-TRACT-1a/1b und sc-AUD-03 vollständig umgesetzt (Aktivieren über NBS, Mitschleppen, Entkommen, Lösen, Andocken). Im Spiel bekommt ihn aber kein Schiff: Das System entsteht nur aus einem Modul der Kategorie `TRACTOR_BEAM`, und das einzige solche Modul („Standard-Traktorstrahl“, `game-data/data/modules/tractor-beam.yaml`) hat keinen Fabrikationseintrag und steht in keiner Schiffsklasse. STU setzt den Traktorstrahl als Standardsystem auf jedem Rumpf außer Shuttles.

## STU-Quellen

- `src/Module/Spacecraft/Lib/Creation/SpacecraftSystemCreation.php` (`getDefaultSystems`: DEFLECTOR und TRACTOR_BEAM für alle Nicht-Shuttles, LIFE_SUPPORT immer)
- STU-Datenbank (`core-stu-db-1`): kein Modul mit Traktorbezug in `stu_modules`; der Traktorstrahl ist dort nur Standardsystem.

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/spacecraft-runtime-state.service.ts` (`getAvailableSystems`, Z. ~232–240; der Kommentar zitiert `getDefaultSystems`, setzt aber nur DEFLECTOR)
- `apps/backend/src/modules/spacecraft/spacecraft-runtime-state.service.spec.ts`

## Entscheidung

Traktorstrahl wird Standardsystem für alle Nicht-Kleinschiffe (gleiche Bedingung wie DEFLECTOR: nicht Shuttle, nicht Workbee). Ersetzt das Kriterium „ohne Modul keine Traktoraktion“ aus sc-WP-TRACT-1a. Die Modulkategorie bleibt als zusätzlicher Weg erhalten.

## Akzeptanzkriterien

- [x] `getAvailableSystems` setzt `TRACTOR_BEAM` für Nicht-Kleinschiffe, nicht für Shuttles und Workbees.
- [x] Bestehende Schiffe erhalten das System beim nächsten Initialisieren der Laufzeitsysteme, inaktiv (kein Startup-System); keine Migration nötig.
- [x] Stationen erhalten das System (STU: alle Nicht-Shuttles), damit „Gehaltenes Schiff andocken“ eine Quelle hat.
- [x] Unit-Test: Schiff ohne Traktormodul hat `TRACTOR_BEAM`; Shuttle und Workbee haben es nicht.

## Herkunft

- Aus dem Schiffsseiten-Abgleich (`.scratch/stu-parity/inventory/schiffsseite-db-abgleich.md`, 2026-11-23).

## Comments

### 2026-11-23 — umgesetzt, Prüfung ausstehend

Commit: `feat(spacecraft): tractor beam as STU default system (stu-parity sc-WP-TRACT-1c)`

- `getAvailableSystems` setzt `TRACTOR_BEAM` zusammen mit `DEFLECTOR` für Nicht-Kleinschiffe (nicht Shuttle, nicht Workbee, nicht `shuttleCommodityId`). Startzustand inaktiv; bestehende Schiffe erhalten das System beim nächsten Initialisieren.
- Ersetzt das Kriterium „ohne Modul keine Traktoraktion“ aus sc-WP-TRACT-1a; die Modulkategorie `TRACTOR_BEAM` bleibt als zusätzlicher Weg.
- Checks: Unit-Test neu in `spacecraft-runtime-state.service.spec.ts` (16/16); Jest `spacecraft`, `combat`, `alert-reaction`, `colony` (114 Suites, 1365 Tests) ✓; PostgreSQL-Integrationstests mit Traktorbezug (10 Suites, 256 Tests) ✓; `nx typecheck backend` ✓.
- Modell: Claude Opus 5.5 direkt (Sol/Luna in dieser Sitzung nicht verfügbar).
- Ausstehend: gesammelter Verifikationslauf (volle Suiten, Diff-Review).
