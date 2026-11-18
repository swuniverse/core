# Datenbank: Planetentyp, Systemtyp und Regionskarte als Detailansicht

**Status:** ready-for-agent
**Priority:** P2
**Size:** M
**Blocked by:** —

## Ziel

In STU ist jeder entdeckte Datenbankeintrag klickbar. SWU zeigt Planetentypen nur mit Beschreibung im `title`-Tooltip, Systemtypen und Regionen als reine Tabellen; nur Sternensysteme haben eine Detailseite. Ergänzt werden:

- **Planetentyp** (`planettype.twig`): Detailansicht mit Name, Bild, Beschreibung und Oberflächenlayout (Feldraster des Typs).
- **Sternensystemtyp** (`starsystemtype.twig` ist in STU leer; Eintrag zeigt Name, Bild und Beschreibung aus `databaseEntry.twig`): Detailansicht mit diesen Angaben.
- **Region** (`regioninfo.twig`): Regionskarte mit den Feldern der Region, Feldtypen, Effekten und Tooltips, dazu Name und Beschreibung. Nur für entdeckte Regionen gemäß ADR-0009.

Einträge, die der Spieler nicht entdeckt hat, bleiben `???` ohne Link.

## STU-Quellen

- `src/Module/Database/View/DatabaseEntry/ShowDatabaseEntry.php` (`addSpecialVars`: `DATABASE_TYPE_PLANET` → `FIELD_ARRAY`/`SURFACE_TILE_STYLE`, `DATABASE_TYPE_MAP` → Region mit `MAP_DATA`)
- `src/html/database/planettype.twig`, `starsystemtype.twig`, `regioninfo.twig`, `databaseEntry.twig`

## SWU-Pfade

- `apps/frontend/src/pages/database.tsx` (`PlanetTypes` Z. 892, `SystemTypes` Z. 998, `Regions` Z. 1053; Routing/`View`)
- `apps/backend/src/modules/database/database.service.ts` (`getPlanetTypes` Z. 811, `getSystemTypes` Z. 497)
- `apps/backend/src/modules/database/database-region-catalog.service.ts` (`getRegions`)
- `apps/backend/src/modules/starmap/starmap.controller.ts` (`GET regions/:id` Z. 100, `GET planets/:id/surface` in `planet-surfaces.controller.ts`)
- `apps/backend/src/modules/starmap/starmap-query.service.ts` (`getExploredRegion`), `region-discovery.service.ts`, `celestial-class-discovery.service.ts`, `system-type-discovery.service.ts`
- `apps/frontend/src/components/database/SystemRasterMap.tsx` (wiederverwendbares Raster)
- Tests: `apps/backend/src/modules/database/database-region-catalog.service.spec.ts`, `apps/frontend/src/pages/database.spec.tsx`

## Akzeptanzkriterien

- [ ] Neue Detailendpunkte (oder Erweiterung bestehender) für Planetentyp, Systemtyp und Region, jeweils nur für entdeckte Einträge (sonst 404).
- [ ] Planetentyp-Detail zeigt das Oberflächenlayout des Typs als Feldraster.
- [ ] Regions-Detail zeigt eine Karte der Regionsfelder mit Feldtyp und Effekt-Tooltip; nur Felder, die der Spieler sehen darf.
- [ ] Listen verlinken entdeckte Einträge.
- [ ] Backend-Tests: 404 für unentdeckte Einträge, Regionsfelder gefiltert nach Sichtbarkeit. Frontend-Tests: Link aus Liste, Detail rendert Raster bzw. Karte.

## Herkunft

- Audit: [README.md](../audit-2026-11-17/README.md) Abschnitt C (Datenbank fällt unter Informationsdichte); [trade-map-world.md](../audit-2026-11-17/trade-map-world.md) „Große Abweichungen 3“ und Seitenabgleich `planettype.twig`, `starsystemtype.twig`, `regioninfo.twig`.
- tmw-D4 ist `resolved` ohne Regionskarte.

## Comments
