# Fraktionsattribute, Teil 1: Startforschung und Startausstattung als Fraktionsdaten

**Status:** resolved
**Priority:** P2
**Size:** S
**Blocked by:** —

## Ziel

Was eine Fraktion beim Einstieg mitbringt, steht in STU als Daten an der Fraktion (`start_research_id`, `start_building_id`, `start_map_id`). In SWU ist es teils hart codiert, etwa `factionId === 2 ? 1003 : 1001` in `ensureBaseResearchCompleted`. Diese Werte werden Teil der Fraktionsdaten und vom Onboarding von dort gelesen. Das Verhalten bleibt unverändert. Zusätzlich liefert dieses Issue eine dokumentierte Bestandsaufnahme, welche Fraktionsmultiplikatoren heute tatsächlich wirken. Grundlage ist tmw-FA1b. Die Zahl der Fraktionen bleibt laut `CONTEXT.md` bei zwei. Die Willkommensnachricht gehört zu soc-A8.

## STU-Quellen

- `src/Orm/Entity/Faction.php` (`chooseable`, `player_limit`, `start_building_id`, `start_research_id`, `start_map_id`, `close_combat_score`, `positive_effect_*_commodity_id`, `welcome_message`)
- `src/Module/Index/Action/Register/Register.php`, `src/Component/Player/Register/PlayerDefaultsCreator.php`

## SWU-Pfade

- `apps/backend/src/modules/faction/entities/faction.entity.ts`, `faction-modifier.entity.ts`, `faction.service.ts` (`DEFAULT_FACTIONS`)
- `apps/backend/src/modules/onboarding/onboarding.service.ts` (`ensureBaseResearchCompleted` ~Z. 482, Starterschiff bzw. Starterkolonie), `apps/backend/src/modules/colony/colony-seed.service.ts` (`createStarterColony`, `createStarterSwuColony`)
- `docs/` (neue Kurznotiz zur Wirksamkeit der Multiplikatoren)

## Akzeptanzkriterien

- [x] Die Fraktionsentität erhält `startResearchTechId` (und, falls die Starterkolonie fraktionsabhängige Startgebäude setzt, deren Schlüssel). Die Migration befüllt die heutigen Werte: Rebellenallianz 1001, Galaktisches Imperium 1003.
- [x] Das Onboarding liest Startforschung und Startausstattung aus der Fraktion. Es gibt keine fraktionsbezogenen Literale mehr im Onboarding.
- [x] Eine Notiz `docs/faction-modifiers.md` listet je Multiplikator (`hull`, `shield`, `cargo`, `research`, `colonyGrowth`, `trade`), ob und wo er wirkt (Stand: keiner wird außerhalb des Fraktionsmoduls gelesen). Sie verweist auf tmw-FA1b.
- [x] Backend-Tests: Onboarding beider Fraktionen ergibt dieselbe Startforschung wie vorher (Regressionstest), und die Werte kommen aus der Fraktion.

## Comments

Fraktionsdaten, Migration und Onboarding auf datengetriebene Startforschung und Startgebäude umgestellt; die aktuelle Wirksamkeit der Multiplikatoren ist in `docs/faction-modifiers.md` dokumentiert. Folgepunkt bleibt tmw-FA1b.
