# Forschungsbelohnung: Belohnungsschiff

**Status:** needs-info
**Priority:** P2
**Size:** M
**Blocked by:** col-D1

## Ziel

In STU erhalten Spieler für bestimmte Forschungen ein fertiges Schiff (`reward_buildplan_id`), das an der ersten Kolonie erzeugt wird, inklusive Crew und voll geladener Systeme, mit Nachricht im Schiffsordner. SWU kennt das Datenfeld nicht. Belohnungsschiffe sind laut Leitplanke 3 in Scope; die STU-Baupläne werden durch den Agenten auf passende SWU-Schiffsklassen und Module abgebildet (Leitplanke 2) und unter „Entscheidungen“ in `map.md` festgehalten.

## STU-Quellen

- `src/Module/Research/ResearchState.php::createRewardShip` (erste Kolonie, `maxOutSystems`, `createCrew`, PM in `SPECIAL_SHIP`: „Als Belohnung für den Abschluss der Forschung wurde dir ein Schiff vom Typ %s überstellt“)
- `src/Orm/Entity/Research.php` (`reward_buildplan_id`)
- STU-Daten: `testdata/Migrations/VersionTestResearch.php`, `src/Migrations/Sqlite/Version20260915191824.php` (Werte von `reward_buildplan_id`)

## SWU-Pfade

- `game-data/data/research/{rebels,imperials}.yaml`, `game-data/scripts/import-stu-research.ts`, `game-data/schemas/*` (neues optionales Feld, z. B. `rewardShip: { shipClassKey, moduleSelections? }`)
- `apps/backend/src/modules/game-data/game-data.service.ts` (Mapping)
- `apps/backend/src/modules/research/research.service.ts` (Abschluss-Hook aus col-D1)
- `apps/backend/src/modules/spacecraft/spacecraft.service.ts` (`adminSpawnShip` als Vorlage für Schiffserzeugung mit Crew und vollen Systemen)
- `apps/backend/src/modules/messaging/messaging.service.ts` (`MessageFolder.SHIP`)
- `apps/frontend/src/pages/research.tsx` (`TechDetailModal`: Belohnung anzeigen)

## Akzeptanzkriterien

- [ ] Techs können ein Belohnungsschiff definieren; die STU-Techs mit `reward_buildplan_id` sind auf SWU-Schiffsklassen der jeweiligen Fraktion abgebildet; die Zuordnung steht unter „Entscheidungen“ in `map.md`.
- [ ] Beim Abschluss einer solchen Tech entsteht genau ein Schiff des Spielers im Orbit seiner ersten (ältesten) Kolonie, mit Crew und vollen Systemen; ohne Kolonie entsteht nichts.
- [ ] Der Spieler erhält eine Nachricht im Ordner „Schiffe“ mit dem STU-Text und der Schiffsklasse.
- [ ] Das Detailmodal der Forschung zeigt „Belohnung: <Schiffsklasse>“.
- [ ] Backend-Tests: Schiffserzeugung, keine Kolonie, Idempotenz (kein zweites Schiff bei erneutem Tick).
- [ ] Frontend-Test: Belohnung im Detailmodal.

## Offene Frage

Welche konkrete Zuordnung soll für die STU-`reward_buildplan_id`-Werte zu den vorhandenen SWU-Schiffsklassen und Modulkonfigurationen gelten? Die im Issue genannte produktive SQLite-Migration enthält nur das Schema, während die Testdaten keine Reward-Baupläne setzen; ohne kanonische Quelldaten bzw. eine bestätigte Mapping-Liste kann nicht verlässlich bestimmt werden, welche Forschungen in beiden SWU-Fraktionen welches Schiff vergeben sollen.

## Comments

- 2026-10-22: Umsetzung blockiert, bevor Produktcode geändert wurde. Benötigt werden die produktiven STU-Forschungsdaten mit `reward_buildplan_id` samt Bauplänen oder eine vom Product Owner bestätigte SWU-Zuordnung.
