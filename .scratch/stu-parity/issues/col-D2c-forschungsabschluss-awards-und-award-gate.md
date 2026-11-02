# Forschungsabschluss: Auszeichnung und Award-Gate

**Status:** claimed
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

- [ ] Techs können stabile optionale SWU-Schlüssel `awardKey` und `neededAwardKey` definieren; rohe STU-Award-IDs werden nicht als Runtime-Identifikatoren persistiert.
- [ ] Produktive `award_id`- und `needed_award`-Zuordnungen werden aus demselben autoritativen STU-Produktionsdump wie `col-D2b` extrahiert. STU-Award 1 wird `RESEARCH_STATIONS`, STU-Award 15 wird `RESEARCH_INTERSTELLAR`; unbekannte IDs werden berichtet und ausgelassen.
- [ ] Enthält der Dump keine produktiven Zuordnungen, bleiben die produktiven SWU-Felder leer; dieses Issue erfindet keine kuratierten Ersatzmappings.
- [ ] Beim Abschluss einer Tech mit `awardKey` wird die Auszeichnung über den idempotenten Vergabedienst aus soc-G1 vergeben.
- [ ] Techs mit `neededAwardKey` sind nur sichtbar und startbar, wenn der Spieler die Auszeichnung besitzt; Start per API ohne Auszeichnung wird abgelehnt.
- [ ] Das Detailmodal zeigt die zu erhaltende Auszeichnung (Bild, Name).
- [ ] Backend-Tests: Vergabe, Gate sichtbar/unsichtbar, API-Ablehnung.
- [ ] Frontend-Test: Auszeichnung im Detailmodal.

## Entscheidung

Der STU-Produktionsdump ist die autoritative Quelle für Forschungs-Award-Vergaben und Award-Gates. STU-Award 1 wird auf `RESEARCH_STATIONS`, Award 15 auf `RESEARCH_INTERSTELLAR` abgebildet; SWU speichert nur stabile Award-Schlüssel. Unbekannte IDs werden im Importbericht aufgeführt und ausgelassen. Ein leerer autoritativer Datenbestand führt zu leeren produktiven SWU-Mappings; kuratierte Ersatzmappings werden nicht in diesem Issue erfunden und benötigen eine separate Produktentscheidung.

## Comments

- 2026-10-29: Blockiert durch fehlende produktive Zuordnung. Der aktuelle STU-Quellstand definiert zwar `award_id` und `needed_award`, enthält im Repo aber keine produktiven Forschungszeilen bzw. Seed-Daten mit konkreten IDs; die Referenzdaten in SWU (`rebels.yaml`, `imperials.yaml`) und der Importer enthalten die Felder ebenfalls noch nicht. Welche konkreten Forschungen sollen auf `RESEARCH_STATIONS` bzw. `RESEARCH_INTERSTELLAR` abgebildet werden, und welche Forschung(en) benötigen welchen Award? Ohne diese Tabelle könnte die Mechanik nur mit ungenutzten Feldern umgesetzt werden; das erfüllt die Spielerparität und die Akzeptanzkriterien nicht belastbar.
- 2026-10-30 Product Owner: Option 1. `award_id` und `needed_award` werden aus demselben autoritativen STU-Produktionsdump wie `col-D2b` extrahiert. STU-IDs 1 und 15 werden auf `RESEARCH_STATIONS` beziehungsweise `RESEARCH_INTERSTELLAR` abgebildet; Game-Data enthalten stabile SWU-Schlüssel, keine rohen IDs. Unbekannte Zuordnungen werden berichtet und ausgelassen. Enthält der Dump keine produktiven Zeilen, bleiben die SWU-Mappings leer; kuratierte Fallbacks benötigen eine separate Produktentscheidung.
