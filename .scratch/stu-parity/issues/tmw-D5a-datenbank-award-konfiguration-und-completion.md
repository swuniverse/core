# Datenbank-Awards: Kategorie-Konfiguration und Completion-Service

**Status:** ready-for-agent
**Priority:** P2
**Size:** M
**Blocked by:** soc-G1

## Ziel

Ergänzt den gemeinsamen, datengetriebenen Dienst für Award-Vergabe bei vollständig entdeckten Datenbankkategorien. Fachintegrationen für Kategorien und Fortschritts-UI folgen in `tmw-D5b`–`tmw-D5d`.

## STU-Quellen

- `src/Module/Database/Lib/CreateDatabaseEntry.php` (`checkForCategoryCompletion`)
- `src/Orm/Entity/DatabaseCategoryAward.php`
- `src/Component/Database/AchievementManager.php`
- `src/Module/Award/Lib/CreateUserAward.php`

## SWU-Pfade

- Award-Vergabedienst aus `soc-G1`
- Entdeckungsdienste in `apps/backend/src/modules/spacecraft/` und `apps/backend/src/modules/starmap/`
- Datenbank-/Spieldatenkonfiguration für Kategorie-Award-Mappings

## Akzeptanzkriterien

- [ ] Eine validierte Konfiguration repräsentiert Kategorie, optional Ebene und zugehörigen Award, ohne rohe STU-IDs als Laufzeitidentität vorauszusetzen. Produktive Zuordnungen sind für Schiffsrümpfe, Planetentypen, Sternensystemtypen sowie Sternensysteme je Ebene gepflegt; Regionen bleiben ausgenommen.
- [ ] Ein gemeinsamer Completion-Service kann für eine Kategorie beziehungsweise Kategorie×Ebene den erreichten Fortschritt gegen den autoritativen Nenner prüfen. Er stellt den Fortschritt über einen stabilen Backend-/Shared-Vertrag für den Datenbank-Hub bereit.
- [ ] Vollständige Kategorien vergeben den zugeordneten Award über den idempotenten `soc-G1`-Dienst genau einmal; unvollständige Kategorien vergeben keinen. Die Vergabe emittiert ein separates Award-Ereignis für die Spieleroberfläche.
- [ ] NPC-Konten erhalten weder Award noch Prestige.
- [ ] Backend-Tests decken Vollständigkeit mit und ohne Ebene, unvollständige Kategorien, wiederholte Prüfung, produktive Zuordnungen, Fortschrittsvertrag und NPC-Ausschluss ab.
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Entscheidung

Der Completion-Service bleibt kategorieneutral. Regionen sind nicht Teil des initialen Award-Katalogs und werden erst ergänzt, wenn `tmw-K8b2` und `tmw-D4` den autoritativen Regionskatalog bereitstellen.

## Comments

- 2026-11-06: Erstes geordnetes Child aus `tmw-D5`; Award-Grunddienst `soc-G1` ist Voraussetzung.
