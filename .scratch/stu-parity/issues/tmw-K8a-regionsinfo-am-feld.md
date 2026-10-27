# Regionsinfo am Feld

**Status:** resolved
**Priority:** P2
**Size:** S
**Blocked by:** —

## Ziel

Feldkontext, LSS-Tooltip und Schiffsdetail zeigen die Kartenregion und die Verwaltungsregion des aktuellen bzw. gewählten Feldes. Ein Klick öffnet einen Regionsinfo-Dialog mit Name, Beschreibung und ggf. dem Datenbankeintrag, wie STU `ShowRegionInfo`. Dieses Issue ist kanonischer Eigentümer und ersetzt den Regionsteil von `sc-WP-UI-4`.

## STU-Quellen

- `src/Module/Spacecraft/View/ShowRegionInfo/*`, `src/html/database/regioninfo.twig`
- `src/Orm/Entity/MapRegion.php`, `MapRegionSettlement.php`, `src/Component/Map/MapEnum.php` (`ADMIN_REGION_*`)
- `src/Module/Ship/View/ShowShip/ShipShowStrategy.php#getDatabaseEntryForShipLocation`

## SWU-Pfade

- `apps/backend/src/modules/starmap/entities/map-region.entity.ts`, `galaxy-field.entity.ts` (`regionId`, `adminRegionKey`), `starmap-query.service.ts` (liefert `adminRegionKey`)
- `apps/backend/src/modules/spacecraft/spacecraft.service.ts#getFieldContext` (~Z. 2566), `getLocalMap`
- `apps/frontend/src/components/spacecraft/FieldContextPanel.tsx`, `LssMap.tsx`, `ShipHeaderTable.tsx`

## Akzeptanzkriterien

- [x] Das Feldkontext-DTO enthält `region: { id, name, description } | null` und `adminRegion: { key, name } | null`, aufgelöst aus `regionId` bzw. `adminRegionKey`. Für unerkundete Felder sind beide `null`.
- [x] `GET starmap/regions/:id` liefert die Regionsinfo nur, wenn der Spieler mindestens ein Feld der Region erkundet hat, sonst 404.
- [x] Feldkontext und Schiffskopf zeigen „Region: <Name>“ als Link auf einen Dialog (Name, Beschreibung, Verwaltungsregion). Der LSS-Tooltip zeigt den Regionsnamen.
- [x] Backend-Tests: Auflösung, Nebel-Regel, 404. Frontend-Tests: `FieldContextPanel` zeigt Region und öffnet den Dialog.

## Comments

Regions- und Verwaltungsregionsdaten werden erkundungsabhängig in Feldkontext und Schiffsdetail aufgelöst; Feldkontext, Schiffskopf und LSS zeigen die Informationen, und der geschützte Regionsendpunkt liefert Details nur nach persönlicher Felderkundung. Keine offenen Folgepunkte.
