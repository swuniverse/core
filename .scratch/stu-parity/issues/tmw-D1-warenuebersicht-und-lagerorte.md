# Warenübersicht und Lagerorte je Ware in der Datenbank

**Status:** ready-for-agent
**Priority:** P1
**Size:** M
**Blocked by:** —

## Ziel

In der Datenbank kommt unter „Sonstiges“ der neue Eintrag „Warenübersicht“ hinzu. Er zeigt alle eigenen Waren, aufsummiert über Kolonien und Schiffe, sortiert und mit Icons wie in STU. Ein Klick auf eine Ware listet alle Lagerorte mit Links zur Kolonie bzw. zum Schiff. Dieses Issue ist kanonischer Eigentümer und ersetzt `col-F1`. Die Lagerortabfrage hat einen Erweiterungspunkt, über den Handelskonten (tmw-T3) und Angebotsreserven (tmw-T4a) später zusätzliche Quellen eintragen.

## STU-Quellen

- `src/Module/Database/View/CommoditiesOverview/*`, `src/Module/Database/View/ShowCommoditiesLocations/*`
- `src/html/database/commoditiesOverview.twig`, `src/html/database/commodityLocations.twig`
- `src/Lib/StorageWrapper.php` (bzw. `src/Module/Commodity/Lib/*` für Sortierung/Sichtbarkeit)

## SWU-Pfade

- Backend: `apps/backend/src/modules/database/database.controller.ts` (heute `GET database/commodities` = nur Katalog), `database.service.ts`
- Wiederverwendung: `apps/backend/src/modules/colony/colony-commodity-locations.service.ts` (heute nur aus einer Kolonie heraus, an eine Kolonie gebunden)
- Lager: `apps/backend/src/modules/colony/entities/colony-storage.entity.ts`, `apps/backend/src/modules/spacecraft/entities/cargo-item.entity.ts`, `spacecraft-torpedo-storage.entity.ts`
- Katalog und Sortierung: `apps/backend/src/modules/game-data/game-data.service.ts`, `game-data/data/commodities/stu-commodity-map.yaml` (`sort`, `visible`)
- Frontend: `apps/frontend/src/pages/database.tsx` (Gruppe „Sonstiges“), `apps/frontend/src/pages/colonies/components/CommodityLocationsDialog.tsx`
- Shared-DTOs: `packages/shared/src/lib/colony` bzw. neuer Ordner `packages/shared/src/lib/database`

## Akzeptanzkriterien

- [ ] `GET database/commodities/overview` liefert für den eingeloggten Spieler jede Ware mit Gesamtmenge > 0, aufsummiert über alle eigenen Kolonielager, Schiffsfrachträume und Torpedolager. Sortiert wird nach dem STU-`sort`-Wert, unsichtbare Waren entfallen.
- [ ] `GET database/commodities/:id/locations` liefert alle eigenen Lagerorte der Ware (Typ Kolonie/Schiff/Torpedolager, Name, Ort, Menge) und eine Summe. Fremde Lager erscheinen nie.
- [ ] Die Lagerortabfrage ist über eine registrierbare Quellen-Schnittstelle erweiterbar (Port/Provider-Muster), sodass tmw-T3 (Konten) und tmw-T4a (Angebote) weitere Quellen ohne Änderung am Datenbankmodul anschließen. Ein Test belegt das mit einer Fake-Quelle.
- [ ] Die Kolonie-Ansicht nutzt dieselbe Logik weiter, ohne Verhaltensänderung (`CommodityLocationsDialog` bleibt grün).
- [ ] Im Datenbank-Hub erscheint unter „Sonstiges“ der Eintrag „Warenübersicht“: zweispaltige Icontabelle (Icon, Name, Menge mit Tausenderpunkt), Seitenkopf `/ Datenbank / Warenübersicht`. Ein Klick öffnet die Lagerortliste mit Links auf `/colonies?…` bzw. `/spacecraft/:id`.
- [ ] Die UI folgt den Konventionen aus `inventory/shell-admin-runtime.md` Abschnitt 3 (Tabellenstil, `text-xs`, keine Emoji).
- [ ] Backend-Tests: Unit-Tests für Summierung, Sortierung, Ausschluss fremder Lager und den Erweiterungspunkt, dazu ein Controller-Test.
- [ ] Frontend-Tests (`database.spec.tsx`): Hub-Eintrag, Übersicht rendert Mengen, Klick zeigt Lagerorte.

## Comments
