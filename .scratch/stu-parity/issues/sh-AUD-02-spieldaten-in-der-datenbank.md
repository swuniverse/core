# Spieldaten in die Datenbank statt `game-data` (ADR + Spec)

**Status:** needs-info
**Priority:** P2
**Size:** M
**Blocked by:** —

## Ziel

SWU liest Spielinhalte (Rümpfe, Module, Gebäude, Waren, Forschung, Kolonieklassen, Kampfformeln, Handel usw.) beim Start aus YAML-Dateien im Repo `game-data` (`GAME_DATA_PATH=./game-data/data`, `GameDataService`). Der Admin-Rumpf-Editor kann deshalb Inhalte nicht pflegen, sondern nur Baupläne und Spawns.

Der Product Owner hat am 2026-11-17 entschieden, wie STU auf **DB-basierte Spieldaten** umzustellen. Die Datenbank wird Quelle der Wahrheit, gepflegt über Admin-Editoren.

Klarstellung zum STU-Stand: STU hat **keinen Seed** für Spielinhalte. Rümpfe und Module liegen nur in der Datenbank und werden über das Admin-Werkzeug `CreateRump` gepflegt. Neu aufgesetzt wird per `pg_restore` eines Dumps. Testdaten kommen über `testdata/Migrations`.

Das ist ein großes Architekturthema. Dieses Ticket liefert **nur ADR und Spec**. Die Umsetzungstickets entstehen danach aus der Spec.

## STU-Quellen

- `src/Module/Admin/Action/CreateRump.php`, `src/Module/Admin/View/RumpCreator/`, `src/html/admin/rumpCreator.twig` (Rumpfpflege im Admin)
- `src/Migrations/pgsql/` (nur Schema, keine Inhaltsdaten)
- `testdata/Migrations/` (Testdaten)

## SWU-Pfade

- `apps/backend/src/modules/game-data/game-data.service.ts` (Laden aus `GAME_DATA_PATH`)
- `game-data/data/*` (u. a. `buildings`, `colony-classes`, `combat`, `commodities`, `fabrication`, `modules`, `research`, `ship-building`, `terraforming`, `torpedoes`, `trade`), `game-data/schemas`, `game-data/scripts`
- `apps/frontend/src/pages/admin-ships.tsx` (heutiger Rumpf-/Bauplan-Admin)
- `apps/backend/src/database/migrations/` (Migrationsschema)
- `.env.example` (`GAME_DATA_PATH`)
- `docs/adr/` (neues ADR)

## Akzeptanzkriterien

- [ ] Die Offenen Fragen unten sind vom Product Owner beantwortet (unter `## Comments`).
- [ ] ADR unter `docs/adr/` beschreibt Entscheidung, Alternativen und Folgen (Quelle der Wahrheit, Import, Versionierung, Zukunft von `game-data`).
- [ ] Spec unter `.scratch/` beschreibt Datenmodell je Inhaltsbereich, Admin-Editoren je Bereich, Migrationspfad von YAML in die DB, Teststrategie (Fixtures statt YAML) und Reihenfolge der Umstellung.
- [ ] Aus der Spec sind Umsetzungstickets mit Größe S/M abgeleitet und in `issues/` angelegt.
- [ ] `map.md`: Eintrag zur Umstellung mit Verweis auf ADR.

## Herkunft

- [`../audit-2026-11-17/README.md`](../audit-2026-11-17/README.md), Abschnitt G (Zeile „Rumpf-Editor: Inhalte kommen aus `game-data`“) und Abschnitt N2.
- [`../audit-2026-11-17/shell-admin-runtime.md`](../audit-2026-11-17/shell-admin-runtime.md), Seitenabgleich `admin/rumpCreator.twig` („bewusst anders“) und „Bewusste/entschiedene Abweichungen“.
- PO-Entscheidung 2026-11-17: Umstellen auf DB-basierte Spieldaten wie STU, zuerst ADR + Spec. Bisher als bewusste Abweichung geführt (`inventory/shell-admin-runtime.md:159`).

## Offene Frage

1. **Quelle der Wahrheit:** Ist künftig ausschließlich die Datenbank maßgeblich (Pflege nur über Admin-Editoren, wie STU), oder bleibt ein dateibasierter Export als Review-/Diff-Format bestehen?
2. **Initialer Import:** Wie kommt der heutige `game-data`-Bestand in die DB? Einmaliger Import per Migration, ein Importskript, oder ein wiederholbarer Seed für frische Umgebungen (STU hat keinen Seed, sondern einen Dump)?
3. **Versionierung von Datenänderungen:** Werden Inhaltsänderungen als Migrationen versioniert, über Dumps verteilt, oder über einen Admin-Export/-Import zwischen Umgebungen?
4. **Zukunft des `game-data`-Repos:** Archivieren, als Importquelle für neue Umgebungen behalten, oder als Testfixture-Quelle weiterführen?
5. **Umfang und Reihenfolge:** Alle Inhaltsbereiche auf einmal, oder schrittweise (z. B. zuerst Rümpfe/Module wie STU `CreateRump`)?

## Comments
