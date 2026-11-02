# Forschungsabschluss: Datenbankeinträge

**Status:** ready-for-agent
**Priority:** P3
**Size:** S
**Blocked by:** col-D1

## Ziel

STU legt beim Abschluss bestimmter Forschungen Datenbankeinträge für den Spieler an (`database_entries`, z. B. Schiffsrümpfe, die durch die Forschung bekannt werden). SWU führt Datenbank-Entdeckungen bereits je Kategorie (Schiffsklassen, Systemtypen, Himmelskörperklassen). Forschungen sollen diese Entdeckungen ebenfalls auslösen können.

## STU-Quellen

- `src/Module/Research/ResearchState.php::createDatabaseEntries`
- `src/Module/Database/Lib/CreateDatabaseEntry.php`
- `src/Orm/Entity/Research.php` (`database_entries`)

## SWU-Pfade

- `game-data/data/research/{rebels,imperials}.yaml`, `game-data/scripts/import-stu-research.ts` (neues Feld, z. B. `databaseEntries: [{ category, key }]`)
- `apps/backend/src/modules/spacecraft/ship-class-discovery.service.ts`, `apps/backend/src/modules/starmap/system-type-discovery.service.ts`, `celestial-class-discovery.service.ts`
- `apps/backend/src/modules/research/research.service.ts` (Abschluss-Hook aus col-D1)

## Akzeptanzkriterien

- [ ] Techs können Datenbankeinträge als stabile SWU-Kategorie plus SWU-Schlüssel definieren; rohe STU-Datenbankeintrags-IDs werden nicht als Runtime-Identifikatoren persistiert.
- [ ] Die produktiven Zuordnungen aus `stu_research.database_entries` und den referenzierten STU-Datenbankeinträgen werden aus dem vorhandenen Dump extrahiert. Importiert werden ausschließlich eindeutig auf bereits vorhandene SWU-Kategorien und Schlüssel abbildbare Einträge, zunächst insbesondere Schiffs-/Stationsklassen.
- [ ] Nicht eindeutig abbildbare Einträge werden ausgelassen und mit Research-ID, STU-Entry-ID und Grund im Import-Report aufgeführt. Neue Datenbankkategorien sind nicht Teil dieses Issues und benötigen eine Folgeentscheidung.
- [ ] Beim Abschluss werden die Einträge über die bestehenden Discovery-Services idempotent angelegt; Prestige bzw. Meldungen folgen deren bestehender Logik.
- [ ] Eine Discovery durch Forschung benötigt keine Quell-/Zielschiffe (Service-Signatur entsprechend erweitern, ohne bestehende Aufrufer zu ändern).
- [ ] Backend-Tests: Eintrag wird angelegt, zweiter Abschluss erzeugt keinen Doppeleintrag.

## Entscheidung

Der vorhandene STU-Produktionsdump ist die autoritative Quelle für Research-zu-Datenbankeintrag-Zuordnungen. SWU importiert daraus nur Einträge, die eindeutig auf bereits vorhandene SWU-Datenbankkategorien und stabile Schlüssel abbildbar sind. Die produktiven Game-Data enthalten keine rohen STU-Entry-IDs. Nicht abbildbare Zeilen werden vollständig berichtet und ausgelassen; neue Kategorien sind ein separates Folgeissue. Forschungsvergaben verwenden die vorhandene idempotente Discovery-/Prestige-Logik mit Quelle `RESEARCH` ohne Quell- oder Zielschiff.

## Comments

- 2026-10-29: Blockiert durch fehlende autoritative STU-Datenzuordnung. Die drei genannten STU-Codequellen enthalten nur numerische `database_entries`-IDs; im verfügbaren Referenz-Repo/Assets liegen weder die produktiven `stu_research.database_entries`-Werte noch die zugehörigen `stu_database_entry`-Datensätze vor. Ohne diese Tabelle lassen sich die geforderten STU-Einträge nicht belastbar auf SWU-Kategorien und Schlüssel (insbesondere Schiffsklassen) abbilden. Bitte einen STU-Dump bzw. eine bestätigte Mapping-Tabelle Research-ID → Database-Entry-ID → SWU-Kategorie/Schlüssel bereitstellen oder bestätigen, dass zunächst nur Schema/Hook ohne produktive Mappings umgesetzt werden soll.
- 2026-10-30 Product Owner: Option 1. Die produktiven `stu_research.database_entries` und referenzierten Datenbankeinträge werden aus dem vorhandenen STU-Dump extrahiert. Importiert werden nur eindeutig auf bereits bestehende SWU-Kategorien/Schlüssel abbildbare Einträge, zunächst insbesondere Schiffs-/Stationsklassen. Game-Data verwenden stabile SWU-Schlüssel statt roher STU-IDs. Nicht abbildbare Einträge werden mit Research-ID, Entry-ID und Grund im Import-Report aufgeführt; neue Kategorien bleiben außerhalb dieses Issues. Die eigentliche Werkzeuginstallation oder Dump-Auslese ist ein separater bestätigungspflichtiger Umsetzungsschritt.
