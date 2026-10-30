# Ranglisten „RPG-Schreiber“ und „Aurodium-Besitz“, Highscore-Gliederung wie STU

**Status:** claimed
**Priority:** P2
**Size:** M
**Blocked by:** —

## Ziel

Zwei fehlende Ranglisten kommen hinzu: „Die 10 bestbewerteten RPG-Schreiber“ auf Basis der Holonet-Bewertungen und das Star-Wars-Pendant zu „Die 10 Söhne des Nagus“, gemessen am Aurodium-Besitz. Die Highscores im Datenbank-Hub erhalten die STU-Gliederung „Siedler / Schiffe (anonym) / Handel / Kolonien“. Noch fehlende Ranglisten erscheinen dort erst, wenn ihr Issue umgesetzt ist (kein Platzhalterlink).

## STU-Quellen

- `src/Module/Database/View/RpgRanking/*`, `src/Orm/Repository/KnPostRepository.php#getRpgVotesTop10` (Summe aller Bewertungen über alle nicht gelöschten KN-Beiträge, nur Nicht-NPCs, keine RPG-Filterung)
- `src/Module/Database/View/LatinumRanking/*`
- `src/html/database/highscores/topRpg.twig`, `topLatinum.twig`
- `src/html/view/database.twig` (Gliederung der Highscores)

## SWU-Pfade

- `apps/backend/src/modules/database/database.service.ts`, `database.controller.ts` (`GET rankings/:key`), `database-ranking.spec.ts`
- `apps/backend/src/modules/holonet/entities/holonet-rating.entity.ts`, `holonet-post.entity.ts`
- Aurodium = Ware `id 50` laut `game-data/data/commodities/stu-commodity-map.yaml` (umbenanntes Latinum)
- `apps/frontend/src/pages/database.tsx` (`groups`, Gruppe „Highscores“)

## Akzeptanzkriterien

- [ ] `GET database/rankings/rpg` liefert die Top 10 Spieler nach der Summe der positiven Holonet-Bewertungen ihrer nicht gelöschten Beiträge, über alle Kategorien wie in STU. NPC-Konten sind ausgeschlossen, sobald tmw-W1 existiert. Bis dahin werden Admins nicht gesondert behandelt.
- [ ] `GET database/rankings/aurodium` liefert die Top 10 nach Aurodium-Besitz (Kolonielager + Schiffsfrachträume). Die Berechnung nutzt eine erweiterbare Quellenliste, damit tmw-T11a die Handelskonten ergänzen kann.
- [ ] Die Aurodium-Rangliste heißt „Die 10 Günstlinge der Hutten“. Vorgabe nach Leitplanke 2: Das Hutt-Kartell ist das Pendant der Ferengi, siehe tmw-W1. Der Titel wird in `map.md` unter „Entscheidungen“ eingetragen, falls er dort noch fehlt.
- [ ] Der Datenbank-Hub gliedert „Highscores“ in die Untergruppen „Siedler“ (Entdecker, Forscher, RPG-Schreiber, Prestige), „Schiffe (anonym)“ (Ausbilder), „Handel“ (Aurodium) und „Kolonien“ (Architekten, Produzenten).
- [ ] Die Ranglistentabellen folgen dem bestehenden Ranglistenmuster (Platz, Spieler mit Profillink, Wert mit Tausenderpunkt).
- [ ] Backend-Tests: Aggregation RPG (gelöschte Beiträge zählen nicht, mehrere Beiträge werden summiert), Aggregation Aurodium (Kolonie und Schiff), Limit 10.
- [ ] Frontend-Tests: Die Hub-Gliederung rendert die vier Untergruppen, und beide neuen Ranglisten werden angezeigt.

## Comments

- 2026-10-27 Agent: Abbruch wegen fehlender Produktentscheidung: Akzeptanzkriterium nennt Aurodium als Ware `id 50`, während das aktuelle SWU-Schema und `game-data/data/commodities/stu-commodity-map.yaml` STU-IDs in den 10000ern verwendet und keinen bestätigten SWU-Commodity-Schlüssel 50 bereitstellt. Bitte den kanonischen SWU-Aurodium-Commodity-Key festlegen (oder bestätigen, dass `50` als neue SWU-ID einzuführen ist), damit Kolonie- und Schiffslager korrekt aggregiert werden können.
- 2026-10-30 Product Owner: Option 1. Der kanonische Commodity-Key für Aurodium ist `50`, wie im aktuellen `stu-commodity-map.yaml` mit `sourceId: 50`, `rawName: Latinum` und `name: Aurodium` hinterlegt. Die Rangliste aggregiert ausschließlich Ware 50 aus Kolonielagern und Schiffsfrachträumen; Ware 51 „Flüssiges Aurodium“ zählt nicht. Handelskonten ergänzt später `tmw-T11a` über den vorgesehenen Quellen-Port. Der Titel bleibt „Die 10 Günstlinge der Hutten“. Das Issue ist `ready-for-agent`.
