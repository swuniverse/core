# Fraktionszuordnung der Techs explizit machen

**Status:** resolved
**Priority:** P2
**Size:** S
**Blocked by:** —

## Ziel

`isTechForFaction` in `research.service.ts` leitet die Fraktion einer Tech heuristisch aus der letzten ID-Ziffer bzw. dem Namen ab. Das ist fragil. Jede Tech in den Forschungsdaten soll ein explizites, validiertes `faction`-Feld erhalten; die Heuristik entfällt. Zusätzlich wird die Richtung der EXCLUDE-Kanten gegen die STU-Daten geprüft.

## STU-Quellen

- `src/Orm/Entity/ResearchDependency.php` (Modi, Richtung)
- `src/Component/Research/ResearchModeEnum.php`
- `Faction::getStartResearch` (Fraktionsbindung über Startforschung)

## SWU-Pfade

- `game-data/data/research/{rebels,imperials}.yaml`, `game-data/scripts/import-stu-research.ts`, `game-data/schemas/*` (Daten-Repo `swuniverse/game-data`)
- `apps/backend/src/modules/research/research.service.ts` (`isTechForFaction`, `EXCLUSIVE_TECH_FACTIONS`, EXCLUDE-Auswertung)
- `apps/backend/src/modules/game-data/game-data.service.ts`

## Akzeptanzkriterien

- [x] Jede Tech hat `faction` (`REBEL_ALLIANCE`, `GALACTIC_EMPIRE` oder `SHARED` bzw. die in `packages/shared` üblichen Werte); das Schema macht das Feld verpflichtend, der Import setzt es.
- [x] `isTechForFaction` nutzt nur noch das Feld; ID- und Namensheuristik sind entfernt.
- [x] Die EXCLUDE-Richtung ist gegen die STU-Daten geprüft; Abweichungen sind korrigiert und im Issue-Comment dokumentiert.
- [x] Backend-Tests: Fraktionsfilter mit explizitem Feld, eine geteilte Tech, EXCLUDE-Ausblendung.
- [x] Fehlt `faction` in den Daten, schlägt die Datenvalidierung beim Laden fehl (Test).

## Comments

- Explizite Fraktionen stehen nun an allen Forschungsdefinitionen; der Loader validiert sie, und die Service-Filterung verwendet ausschließlich dieses Feld. Die Importer setzen `faction` und interpretieren STU-`ResearchModeEnum::EXCLUDE` korrekt als Modus `0` statt `3`.
- STU prüft EXCLUDE invers: Eine Zeile `research_id = A, depends_on = B` blendet `B` aus, sobald `A` begonnen wurde. SWU wertet die importierte Kante bereits in genau dieser Richtung aus; ergänzt wurden ein Regressionstest und die korrigierte Moduszuordnung im Import.
