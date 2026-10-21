# Stationsmodell und Stationsrollen festlegen (ADR)

**Status:** ready-for-agent
**Priority:** P1
**Size:** S
**Blocked by:** —

## Ziel

Stationen sind im Scope (Leitplanke 3). Dieses Issue legt per ADR fest, wie Stationen im SWU-Modell abgebildet werden, und wählt nach Leitplanke 2 Star-Wars-Namen für die STU-Stationsrollen. Alle Stationsissues (sc-WP-STAT-1a bis -6b) und mehrere Handels-/Datenbankissues bauen darauf auf. Kein Produktcode außer ggf. Shared-Konstanten.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Component/Spacecraft/SpacecraftTypeEnum.php` (Ship/Station als Spacecraft-Typ)
- `Component/Spacecraft/SpacecraftRumpRoleEnum.php` (CONSTRUCTION, DEPOT_SMALL, DEPOT_LARGE, SHIPYARD, SENSOR, OUTPOST, BASE; Limits SHIPYARD 2, DEPOT_LARGE 1; Orte: DEPOT_SMALL im System, BASE über System, OUTPOST außerhalb, sonst überall)
- `Component/Station/{StationLocationEnum,StationUtility}.php`, `Component/Station/Dock/*`
- `Orm/Entity/{Station,DockingPrivilege,StationShipRepair}.php`
- `Module/Ship/Action/BuildConstruction` (5 Workbees, Baumaterial 100, Duranium 50)

## SWU-Pfade

- `docs/adr/` (neue ADR), `CONTEXT.md` (Begriffe Station, Konstrukt, Stationsrollen, Andocken)
- `apps/backend/src/modules/spacecraft/entities/spacecraft.entity.ts`, `ship-class-def.entity.ts`
- `game-data/data/ship-building/ship-classes.yaml` (Workbee-Klassen `REBEL_WORKBEE_DROID`, `EMPIRE_WORKBEE_DROID` vorhanden; Stationsklassen fehlen)
- `.scratch/alliance-stu-parity/allianz-infrastruktur-spec.md` (Integrationsverträge Allianzdepot, Zugangsprivilegien, `AllianceContextCleanup`)
- `.scratch/stu-parity/map.md` → Entscheidungen

## Akzeptanzkriterien

- [ ] ADR legt fest: Station als Typ von `Spacecraft` (Diskriminator) oder eigene Entity, mit Begründung (Wiederverwendung von Laufzeitsystemen, Lager, NBS, Kampf).
- [ ] Rollentabelle mit SWU-Namen je STU-Rolle (z. B. Konstrukt, kleines/großes Depot, Raumwerft, Sensorphalanx, Außenposten, Basis), Ortsregel, Limit je Spieler und benötigten Workbees; dazu je Fraktion mindestens eine Stationsklasse je Rolle mit Basiswerten aus STU-Rumpfdaten (als Plan für sc-WP-STAT-1b, keine Datenänderung nötig).
- [ ] ADR beschreibt Docking (Plätze je Rolle, Rechte Spieler/Allianz/Fraktion/Schiff, Verbot vor Erlaubnis) und die Einhaltung der Allianz-Integrationsverträge.
- [ ] `CONTEXT.md` um die Stationsbegriffe ergänzt; Entscheidung mit Datum unter „Entscheidungen“ in `map.md`.
- [ ] Keine Tests nötig (Doku); `lint` bleibt grün.

## Comments
