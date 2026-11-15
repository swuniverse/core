# Datenbank-Awards: Kategorie-Konfiguration und Completion-Service

**Status:** resolved
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

- [x] Eine validierte Konfiguration repräsentiert Kategorie, optional Ebene und zugehörigen Award, ohne rohe STU-IDs als Laufzeitidentität vorauszusetzen. Produktive Zuordnungen sind für Schiffsrümpfe, Planetentypen, Sternensystemtypen sowie Sternensysteme je Ebene gepflegt; Regionen bleiben ausgenommen.
- [x] Ein gemeinsamer Completion-Service kann für eine Kategorie beziehungsweise Kategorie×Ebene den erreichten Fortschritt gegen den autoritativen Nenner prüfen. Er stellt den Fortschritt über einen stabilen Backend-/Shared-Vertrag für den Datenbank-Hub bereit.
- [x] Vollständige Kategorien vergeben den zugeordneten Award über den idempotenten `soc-G1`-Dienst genau einmal; unvollständige Kategorien vergeben keinen. Die Vergabe emittiert ein separates Award-Ereignis für die Spieleroberfläche.
- [x] NPC-Konten erhalten weder Award noch Prestige.
- [x] Backend-Tests decken Vollständigkeit mit und ohne Ebene, unvollständige Kategorien, wiederholte Prüfung, produktive Zuordnungen, Fortschrittsvertrag und NPC-Ausschluss ab.
- [x] `lint`, `typecheck`, `test` und `build` sind grün.

## Entscheidung

Der Completion-Service bleibt kategorieneutral. Regionen sind nicht Teil des initialen Award-Katalogs und werden erst ergänzt, wenn `tmw-K8b2` und `tmw-D4` den autoritativen Regionskatalog bereitstellen.

## Comments

- 2026-11-06: Erstes geordnetes Child aus `tmw-D5`; Award-Grunddienst `soc-G1` ist Voraussetzung.
- 2026-11-15 Maintainer: Awards und Zuordnung wie in STU; Sternensysteme bekommen je Ebene einen eigenen Award („falls wir mal mehr haben“); STU-Award 16 („Raumfahrt gemeistert“) gilt für Schiffsrümpfe.
- 2026-11-15: Umgesetzt (ba2dfc6a).
  - Katalog: `DATABASE_SHIP_HULLS` (25), `DATABASE_PLANET_TYPES` (50), `DATABASE_SYSTEM_TYPES` (75) mit STU-Texten; je Ebene `DATABASE_SYSTEMS_L<id>` (25, „Der Spieler hat sämtliche Sternensysteme der Ebene X kartographiert“) über `ensureLayerSystemsAward`, aufgerufen von der Migration für bestehende Ebenen sowie von `createLayer` und dem Standard-Galaxie-Seed. STU-Werte stammen aus der lokalen STU-Datenbank (`stu_award` 15, 16, 20, 21); `stu_database_category_awards` ist dort leer, daher Zuordnung nach Text.
  - Tabelle `database_category_awards` (Migration `20261115120000`): Kategorie, Ebene (nur bei `SYSTEMS`, per CHECK erzwungen), Award; erlaubte Kategorien per CHECK, Regionen ausgenommen; je Kategorie bzw. Kategorie×Ebene eindeutig. `DATABASE_COMPLETE` bleibt unverändert im Katalog.
  - `DatabaseCompletionService` (Database-Modul, exportiert für tmw-D5b–D5d): `checkCompletion(userId, category, layerId?)` vergleicht mit den Nennern des Datenbank-Hubs (`getShipClasses`, `getPlanetTypes`, `getSystemTypes`, `getSystems` je sichtbarer Ebene; gezählt werden nur Katalogeinträge, NPC-Rümpfe also nicht), vergibt über `AwardService.grant` genau einmal und sendet `WsEventType.AWARD_GRANTED` (`AwardGrantedEventDto`); ohne Ebene prüft `SYSTEMS` alle zugeordneten Ebenen (STU). NPC-Konten erhalten weder Award noch Prestige. `progress(userId)` liefert `DatabaseCategoryProgressDto[]` über `GET /database/category-progress` (eigener `DatabaseProgressController`).
  - Tests: `database-completion.int-spec.ts` (produktive Zuordnungen und CHECKs, Ebenen-Award nur für die vollständige Ebene, einmalig mit Ereignis, Kategorie ohne Ebene, Rümpfe ohne NPC-Rümpfe, NPC-Ausschluss, Fortschrittsvertrag); `starmap-admin.service.spec.ts` (neue Ebene bekommt Award). Planetentypen-Vollständigkeit ist nicht eigens abgedeckt, weil ihr Nenner aus den im Spiel vorhandenen Himmelskörpern stammt; der Pfad ist derselbe.
  - Gates: Lint 0 Fehler (1430/110), Typecheck und Build grün, Frontend 763/763, Integration 742/742, Backend-Unit grün bis auf den bekannten Zeit-Flake `password-reset.service.spec.ts` (einzeln grün); `starmap-admin.service.spec.ts` nach dem Lauf angepasst und erneut grün.

