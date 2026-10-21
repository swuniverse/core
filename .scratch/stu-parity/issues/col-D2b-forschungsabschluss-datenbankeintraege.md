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

- [ ] Techs können Datenbankeinträge (Kategorie + Schlüssel) definieren; STU-Einträge, die auf existierende SWU-Kategorien abbildbar sind (v. a. Schiffsrümpfe → Schiffsklassen), sind importiert, nicht abbildbare werden im Import-Report gelistet.
- [ ] Beim Abschluss werden die Einträge über die bestehenden Discovery-Services idempotent angelegt; Prestige bzw. Meldungen folgen deren bestehender Logik.
- [ ] Eine Discovery durch Forschung benötigt keine Quell-/Zielschiffe (Service-Signatur entsprechend erweitern, ohne bestehende Aufrufer zu ändern).
- [ ] Backend-Tests: Eintrag wird angelegt, zweiter Abschluss erzeugt keinen Doppeleintrag.

## Comments
