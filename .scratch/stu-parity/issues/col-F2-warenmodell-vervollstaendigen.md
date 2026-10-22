# Warenmodell vervollständigen: Sortierung, Sichtbarkeit, Beam- und Handelssperren

**Status:** resolved
**Priority:** P2
**Size:** S
**Blocked by:** —

## Ziel

Die Warendaten (`stu-commodity-map.yaml`) enthalten `sort`, `type`, `visible`, `npcCommodity` und `bound`, das Backend mappt aber nur einen Teil. Daher sortiert SWU Waren nicht wie STU und kennt keine Beam- oder Handelssperren. Das Issue übernimmt die STU-Ableitungen `isBeamable`, `isTradeable` und `isSaveable` und setzt sie im Transfer durch.

## STU-Quellen

- `src/Orm/Entity/Commodity.php` (`isTradeable` = beambar und nicht NPC-Ware; `isBeamable` = Typ STANDARD, sichtbar, nicht kontogebunden zwischen verschiedenen Spielern; `isSaveable` = Typ STANDARD)
- `src/Module/Commodity/CommodityTypeConstants.php` (`COMMODITY_TYPE_STANDARD = 1`, `COMMODITY_TYPE_EFFECT = 2`)

## SWU-Pfade

- `game-data/data/commodities/stu-commodity-map.yaml`
- `apps/backend/src/modules/game-data/game-data.service.ts` (`Commodity`-Interface)
- `apps/backend/src/modules/spacecraft/transfer.service.ts` (`loadCargo`, `unloadCargo`, `transferShipCargo`)
- `packages/shared` (Commodity-DTO)
- Frontend-Lageranzeigen: `apps/frontend/src/pages/colonies/components/SupplyDock.tsx`, `ColonyOverview.tsx`, Schiffslager in `spacecraft-detail.tsx`

## Akzeptanzkriterien

- [x] `Commodity` enthält `sort`, `type`, `visible`, `npcCommodity`, `bound` sowie abgeleitete `isBeamable`, `isTradeable`, `isSaveable` (Shared-Funktion, STU-Semantik).
- [x] Transfers Kolonie↔Schiff und Schiff↔Schiff lehnen nicht beambare Waren ab; kontogebundene Waren (`bound`) nur zwischen verschiedenen Spielern.
- [x] Lageranzeigen (Kolonie, Schiff, Kolonieliste) sortieren nach `sort`; unsichtbare Waren (`visible: false`) und Effektwaren erscheinen nicht im Lager.
- [x] `isTradeable` steht für den Handel bereit (Durchsetzung folgt mit tmw-T4a; dort im Issue-Comment vermerken).
- [x] Backend-Tests: Beamsperre, Bound-Regel, Ableitungen; Frontend-Test: Sortierung nach `sort`.

## Comments

Commodity metadata and STU-derived flags now flow from game data into the API and storage UIs. Colony/ship and ship/ship cargo transfers enforce beamability and account binding; storage displays filter hidden/effect commodities and use configured sort order. `tmw-T4a` must enforce the exposed `isTradeable` flag when offers are implemented.
