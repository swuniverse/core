# Datenbankkategorie „Stationsrümpfe“

**Status:** ready-for-agent
**Priority:** P2
**Size:** S
**Blocked by:** sc-WP-STAT-2

## Ziel

Analog zur Kategorie Schiffsrümpfe kommt eine Kategorie Stationsrümpfe hinzu. Unentdeckte Einträge werden mit `???` maskiert. Entdeckt wird ein Stationsrumpf durch einen Scan, die Belohnung ist `STU_PRESTIGE.SCAN_STATION_HULL`. Die Datenbankgruppe „Schiffe & Technik“ heißt danach „Schiffe & Stationen“ wie in STU.

## STU-Quellen

- `src/Component/Database/DatabaseCategoryTypeEnum.php` (`STATIONRUMP`)
- `src/html/database/shiprump.twig` (gleiches Muster), `src/Module/Database/Lib/CreateDatabaseEntry.php`

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/ship-class-discovery.service.ts`, `entities/ship-class-discovery.entity.ts` (Vorbild)
- Stationsmodell und -scan aus sc-WP-STAT-0 bis sc-WP-STAT-2
- `apps/backend/src/modules/prestige/prestige.constants.ts` (`SCAN_STATION_HULL: 5`)
- `apps/backend/src/modules/database/database.service.ts`, `apps/frontend/src/pages/database.tsx`

## Akzeptanzkriterien

- [ ] Ein Scan einer Station (eigene ausgenommen) entdeckt deren Rumpf einmalig je Spieler und vergibt `SCAN_STATION_HULL` Prestige mit Prestigelog.
- [ ] `GET database/station-classes` und `.../:key` liefern die Liste mit `???`-Maskierung bzw. Details nur für entdeckte Rümpfe. NPC-Rümpfe sind ausgeschlossen.
- [ ] Die Hub-Gruppe heißt „Schiffe & Stationen“ und enthält „Stationsrümpfe“.
- [ ] Backend-Tests: Entdeckung per Scan, Idempotenz, Maskierung. Frontend-Test: Kategorie und Detail.

## Comments
