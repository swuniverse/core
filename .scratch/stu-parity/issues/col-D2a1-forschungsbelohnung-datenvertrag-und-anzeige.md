# Forschungsbelohnung: Datenvertrag und Anzeige

**Status:** resolved
**Priority:** P2
**Size:** S
**Blocked by:** col-D1

## Ziel

Forschungsdaten können optional eine vollständig konfigurierte Schiffbelohnung beschreiben. Das Forschungsdetail zeigt sie nur bei einem expliziten Mapping an. Produktive Mappings bleiben bis zu einer gesonderten Product-Owner-Freigabe leer.

## STU-Quellen

- `src/Orm/Entity/Research.php` (`reward_buildplan_id`)
- `src/Module/Research/ResearchState.php::createRewardShip`
- `testdata/Migrations/VersionTestResearch.php`, `src/Migrations/Sqlite/Version20260915191824.php`

## SWU-Pfade

- `game-data/data/research/{rebels,imperials}.yaml`
- `game-data/scripts/import-stu-research.ts`
- `game-data/schemas/*`
- `apps/backend/src/modules/game-data/game-data.service.ts`
- `apps/frontend/src/pages/research.tsx` (`TechDetailModal`)

## Akzeptanzkriterien

- [x] Forschungsdaten können optional eine Belohnung aus Fraktion, SWU-Tech-ID, `shipClassKey` und vollständigen `moduleSelections` definieren.
- [x] Schema und Import validieren, dass eine vorhandene Belohnung vollständig ist; fehlendes Mapping bedeutet ausdrücklich keine Belohnung.
- [x] Alle produktiven Forschungsdaten bleiben zunächst ohne Belohnungsmapping; aus Freischaltungen oder anderen Indizien wird nichts abgeleitet.
- [x] Das Forschungsdetail zeigt „Belohnung: <Schiffsklasse>“ ausschließlich bei konfiguriertem Mapping.
- [x] Game-Data- und Frontend-Tests decken vorhandene, fehlende und unvollständige Belohnungen ab.

## Entscheidung

Der Vertrag wird optional und datengetrieben. Produktive Zuordnungen benötigen eine separat bestätigte Tabelle aus Fraktion, SWU-Tech-ID, Schiffsklasse und vollständiger Modulkonfiguration.

## Comments

Optional `shipReward` (faction, techId, shipClassKey, complete moduleSelections) added to `TechDef`; `GameDataService.validateShipReward` rejects incomplete rewards at load (unknown class, missing/unknown slots, faction/techId mismatch). Research state exposes `shipReward {shipClassKey,name}`; `TechDetailModal` shows "Belohnung: <Klasse>" only when mapped. No productive mappings added. The import script does not emit rewards, so validation lives in the loader (tested). Follow-ups: col-D2a2..4.
