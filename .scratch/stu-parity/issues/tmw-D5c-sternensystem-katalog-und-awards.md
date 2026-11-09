# Datenbank-Awards: Sternensystemkatalog und Entdeckung je Ebene

**Status:** ready-for-agent
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

- [ ] `StarSystem` erhält ein persistentes Katalogberechtigungsmerkmal; bestehende produktive Systeme werden per Migration als katalogberechtigt zurückgefüllt.
- [ ] Versteckte, Test- und Admin-Experimentsysteme können ausdrücklich von der Katalogberechtigung ausgeschlossen werden.
- [ ] Der Nenner je Ebene umfasst ausschließlich katalogberechtigte Sternensysteme dieser Ebene; Persistenz oder dynamische Erreichbarkeit allein sind keine Katalogregel.
- [ ] Neue Systementdeckungen prüfen den Fortschritt der zugehörigen Ebene über `tmw-D5a`, verwenden die gepflegte produktive Award-Zuordnung und erzeugen die Entdeckungs- und ggf. separate Awardmeldung idempotent.
- [ ] Backend-Integrationstests decken Migration/Backfill, Ein- und Ausschluss vom Katalog, Vollständigkeit je Ebene und Award-Ereignis ab.
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Entscheidung

Der Nenner ist der explizit gepflegte produktive Datenbankkatalog je Ebene. Regionen werden nicht in diesem Ticket ergänzt; sie folgen mit dem autoritativen Regionskatalog aus `tmw-K8b2` und `tmw-D4`.

## Comments

- 2026-11-06: Drittes geordnetes Child aus `tmw-D5`; setzt die gemeinsame Award-/Completion-Grundlage `tmw-D5a` voraus.
