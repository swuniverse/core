# Forschungsabschluss: Auszeichnung und Award-Gate

**Status:** needs-info
**Priority:** P3
**Size:** S
**Blocked by:** col-D1, soc-G1

## Ziel

STU vergibt für einige Forschungen eine Auszeichnung (`award_id`) und blendet Forschungen aus, die eine Auszeichnung voraussetzen (`needed_award`). Awards sind in Scope (Leitplanke 3); das Grundsystem entsteht in soc-G1. Dieses Issue ist der Forschungs-Auslöser aus soc-G2 und deckt ihn für den Bereich Forschung ab.

## STU-Quellen

- `src/Module/Research/ResearchState.php::checkForAward`
- `src/Module/Research/TechlistRetriever.php` (Filter `needed_award`)
- `src/Orm/Entity/Research.php` (`award_id`, `needed_award`)

## SWU-Pfade

- `game-data/data/research/{rebels,imperials}.yaml`, `game-data/scripts/import-stu-research.ts` (Felder `awardId`, `neededAwardId`; Award-IDs auf den SWU-Katalog aus soc-G1 abbilden)
- `apps/backend/src/modules/research/research.service.ts` (`getResearchState`, `areDependenciesMet`, Abschluss-Hook)
- Award-Vergabedienst aus soc-G1

## Akzeptanzkriterien

- [ ] Beim Abschluss einer Tech mit `awardId` wird die Auszeichnung über den idempotenten Vergabedienst aus soc-G1 vergeben.
- [ ] Techs mit `neededAwardId` sind nur sichtbar und startbar, wenn der Spieler die Auszeichnung besitzt; Start per API ohne Auszeichnung wird abgelehnt.
- [ ] Das Detailmodal zeigt die zu erhaltende Auszeichnung (Bild, Name).
- [ ] Backend-Tests: Vergabe, Gate sichtbar/unsichtbar, API-Ablehnung.
- [ ] Frontend-Test: Auszeichnung im Detailmodal.

## Comments

- 2026-10-29: Blockiert durch fehlende produktive Zuordnung. Der aktuelle STU-Quellstand definiert zwar `award_id` und `needed_award`, enthält im Repo aber keine produktiven Forschungszeilen bzw. Seed-Daten mit konkreten IDs; die Referenzdaten in SWU (`rebels.yaml`, `imperials.yaml`) und der Importer enthalten die Felder ebenfalls noch nicht. Welche konkreten Forschungen sollen auf `RESEARCH_STATIONS` bzw. `RESEARCH_INTERSTELLAR` abgebildet werden, und welche Forschung(en) benötigen welchen Award? Ohne diese Tabelle könnte die Mechanik nur mit ungenutzten Feldern umgesetzt werden; das erfüllt die Spielerparität und die Akzeptanzkriterien nicht belastbar.
