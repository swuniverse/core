# Datenbank-Awards: Sternensystemkatalog und Entdeckung je Ebene

**Status:** resolved
**Priority:** P2
**Size:** M
**Blocked by:** tmw-D5a

## Ziel

Definiert den autoritativen Sternensystemkatalog für Datenbankvollständigkeit, migriert bestehende produktive Einträge und verbindet Systementdeckungen je Ebene mit der Award-Prüfung aus `tmw-D5a`.

## STU-Quellen

- `src/Module/Database/Lib/CreateDatabaseEntry.php` (`checkForCategoryCompletion`)
- `src/Orm/Entity/DatabaseCategoryAward.php`
- Systementdeckungs- und Ebenenpfade aus dem STU-Datenbank-/Sternenkartenmodul

## SWU-Pfade

- `apps/backend/src/modules/starmap/entities/star-system.entity.ts`
- Systementdeckung gemäß ADR-0002/0003
- Ebenenkenntnis und Entdeckung aus `apps/backend/src/modules/starmap/`
- TypeORM-Migrationen gemäß `docs/typeorm-migrations.md`

## Akzeptanzkriterien

- [x] `StarSystem` erhält ein persistentes Katalogberechtigungsmerkmal; bestehende produktive Systeme werden per Migration als katalogberechtigt zurückgefüllt.
- [x] Versteckte, Test- und Admin-Experimentsysteme können ausdrücklich von der Katalogberechtigung ausgeschlossen werden.
- [x] Der Nenner je Ebene umfasst ausschließlich katalogberechtigte Sternensysteme dieser Ebene; Persistenz oder dynamische Erreichbarkeit allein sind keine Katalogregel.
- [x] Neue Systementdeckungen prüfen den Fortschritt der zugehörigen Ebene über `tmw-D5a`, verwenden die gepflegte produktive Award-Zuordnung und erzeugen die Entdeckungs- und ggf. separate Awardmeldung idempotent.
- [x] Backend-Integrationstests decken Migration/Backfill, Ein- und Ausschluss vom Katalog, Vollständigkeit je Ebene und Award-Ereignis ab.
- [x] `lint`, `typecheck`, `test` und `build` sind grün.

## Entscheidung

Der Nenner ist der explizit gepflegte produktive Datenbankkatalog je Ebene. Regionen werden nicht in diesem Ticket ergänzt; sie folgen mit dem autoritativen Regionskatalog aus `tmw-K8b2` und `tmw-D4`.

## Comments

- 2026-11-06: Drittes geordnetes Child aus `tmw-D5`; setzt die gemeinsame Award-/Completion-Grundlage `tmw-D5a` voraus.
- 2026-11-15: Umgesetzt (4f34d57f).
  - `StarSystem.inDatabaseCatalog` (Default `true`), Migration `20261115140000` füllt bestehende Systeme als katalogberechtigt zurück und schließt das SWU-Testsystem (`landmarkKey = 'swu-test-system'`) aus. `regenerateSwuTestSystem` setzt den Ausschluss ebenfalls; Karteneditoren schalten über `PATCH /starmap/admin/systems/:id/database-catalog` (`StarmapUpdateSystemCatalogDto`) und können das Merkmal beim Anlegen setzen (`StarmapCreateSystemDto.inDatabaseCatalog`).
  - Nenner je Ebene: `DatabaseService.getSystems` liefert nur katalogberechtigte Systeme; Hub und `DatabaseCompletionService` nutzen damit denselben Katalog.
  - Systementdeckung entsteht in SWU durch abgeschlossene Kartographie (STU `FinishedAstroMappingHandler`). Nach dem Abschluss meldet `SpacecraftService` für ein katalogberechtigtes System über `DATABASE_DISCOVERY` (jetzt mit `layerId`) einen neuen Eintrag; der Listener sendet „Neuer Datenbankeintrag: <System> (+10 Prestige)“ und prüft nur den Award dieser Ebene. Kartographie schließt je Spieler und System nur einmal ab, daher idempotent. `ExplorationService.discoverSystem` hat keinen Aufrufer und blieb unverändert.
  - Tests: `star-system-catalog-migration.int-spec.ts` (Backfill, Testsystem ausgeschlossen, neue Systeme berechtigt); `database-completion.int-spec.ts` (ausgeschlossenes System zählt nicht, Ebenen-Award trotzdem; Meldung mit Ebene vergibt nur deren Award einmal); `cartography-lifecycle.integration.spec.ts` (Abschluss meldet genau einen Eintrag mit Ebene); `starmap-admin.service.spec.ts` (Admin-Schalter).
  - Gates: Lint 0 Fehler (1430/110 nach Entfernen zweier neuer Non-Null-Assertions), Typecheck und Build grün, Frontend 763/763, Integration 749/749, Backend-Unit grün bis auf den bekannten Zeit-Flake `password-reset.service.spec.ts` (einzeln grün).

