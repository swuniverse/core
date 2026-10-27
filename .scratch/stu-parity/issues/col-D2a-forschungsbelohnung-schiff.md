# Forschungsbelohnung: Belohnungsschiff

**Status:** claimed
**Priority:** P2
**Size:** M
**Blocked by:** col-D1

## Ziel

SWU erhält einen optionalen, datengetriebenen und idempotenten Mechanismus für Forschungs-Belohnungsschiffe. Da die autoritativen STU-Zuordnungen nicht vorliegen, wird keine produktive Zuordnung aus Freischaltungen oder anderen Indizien erfunden; produktive Forschungen vergeben bis zu einer separat bestätigten Mapping-Tabelle kein Schiff.

## STU-Quellen

- `src/Module/Research/ResearchState.php::createRewardShip` (erste Kolonie, `maxOutSystems`, `createCrew`, PM in `SPECIAL_SHIP`: „Als Belohnung für den Abschluss der Forschung wurde dir ein Schiff vom Typ %s überstellt“)
- `src/Orm/Entity/Research.php` (`reward_buildplan_id`)
- STU-Daten: `testdata/Migrations/VersionTestResearch.php`, `src/Migrations/Sqlite/Version20260915191824.php` (Werte von `reward_buildplan_id`)

## SWU-Pfade

- `game-data/data/research/{rebels,imperials}.yaml`, `game-data/scripts/import-stu-research.ts`, `game-data/schemas/*` (optionales `rewardShip` mit Klasse und vollständigen Modulwahlen)
- `apps/backend/src/modules/game-data/game-data.service.ts` (Mapping)
- `apps/backend/src/modules/research/research.service.ts` (Abschluss-Hook aus col-D1)
- `apps/backend/src/modules/spacecraft/spacecraft.service.ts` (`adminSpawnShip` als Vorlage für Schiffserzeugung mit Crew und vollen Systemen)
- `apps/backend/src/modules/messaging/messaging.service.ts` (`MessageFolder.SHIP`)
- `apps/frontend/src/pages/research.tsx` (`TechDetailModal`: Belohnung anzeigen)

## Akzeptanzkriterien

- [ ] Forschungsdaten können optional eine vollständige Belohnung aus Fraktion, SWU-Tech-ID, `shipClassKey` und exakten `moduleSelections` definieren; fehlendes Mapping bedeutet ausdrücklich keine Belohnung.
- [ ] Der Abschlussmechanismus ist idempotent und besitzt einen dauerhaften Grant-Nachweis, sodass Wiederholungen weder ein zweites Schiff noch eine zweite Nachricht erzeugen.
- [ ] Bei einem konfigurierten Mapping entsteht genau ein Schiff des Spielers im Orbit seiner ersten (ältesten) Kolonie, mit Crew und vollen Systemen; ohne Kolonie entsteht nichts.
- [ ] Der Spieler erhält bei erfolgreicher Vergabe eine Nachricht im Ordner „Schiffe“ mit dem STU-Text und der Schiffsklasse.
- [ ] Das Detailmodal zeigt „Belohnung: <Schiffsklasse>“ nur, wenn ein Mapping konfiguriert ist.
- [ ] Alle produktiven Forschungsdaten bleiben zunächst ohne Belohnungsmapping; bestehende Forschungen erzeugen deshalb kein Schiff. Künftige Mappings werden erst nach separater Product-Owner-Freigabe in `map.md` dokumentiert.
- [ ] Backend-Tests verwenden ausschließlich Test-Fixtures und decken Schiffserzeugung, fehlende Kolonie, fehlendes Mapping und Idempotenz ab; Frontend-Test deckt vorhandene und fehlende Belohnung ab.

## Entscheidung

Der Mechanismus wird vollständig, optional und datengetrieben implementiert. Es werden keine Zuordnungen aus Forschungsfreischaltungen abgeleitet. Produktive Belohnungen benötigen später eine bestätigte Tabelle aus Fraktion, SWU-Tech-ID, Schiffsklasse und vollständiger Modulkonfiguration; bis dahin bleibt die produktive Mapping-Menge leer.

## Comments

- 2026-10-22: Umsetzung blockiert, bevor Produktcode geändert wurde. Benötigt werden die produktiven STU-Forschungsdaten mit `reward_buildplan_id` samt Bauplänen oder eine vom Product Owner bestätigte SWU-Zuordnung.
- 2026-10-27 Product Owner: Den idempotenten, datengetriebenen Mechanismus umsetzen, aber ohne bestätigte Tabelle keine produktiven Reward-Mappings anlegen und keine Belohnung aus Freischaltungen ableiten.
