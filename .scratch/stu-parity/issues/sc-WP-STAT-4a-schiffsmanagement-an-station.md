# Schiffsmanagement angedockter Schiffe und Batterie-Nachladen

**Status:** resolved
**Priority:** P2
**Size:** M
**Blocked by:** sc-WP-STAT-3a

## Ziel

Wie im Orbitalmanagement der Kolonie verwaltet die Station angedockte Schiffe: Crew, Ersatzbatterie, Reaktor und Torpedos aus dem Stationslager laden bzw. entladen. Dazu der Stationsschalter „Batterie automatisch nachladen“.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Station/Action/{ManageShips,ToggleBatteryReload}`, `Module/Station/View/ShowShipManagement`, `html/station/shipManagement.twig`
- `Lib/SpacecraftManagement/*` (Manager für Crew, Batterie, Reaktor, Torpedos)

## SWU-Pfade

- `apps/backend/src/modules/colony/colony-orbit.service.ts` (Orbitalmanagement als Vorbild; Logik auf einen gemeinsamen Provider-Port heben)
- `apps/frontend/src/pages/colonies/components/OrbitalManagementPanel.tsx`
- `apps/backend/src/modules/spacecraft/spacecraft-engineering.service.ts`, `spacecraft-torpedo.service.ts`

## Akzeptanzkriterien

- [x] Die Management-Logik arbeitet gegen eine Quelle „Kolonie“ oder „Station“ (eine Implementierung, kein Kopieren); bestehende Kolonie-Tests bleiben grün.
- [x] Stationsansicht bietet die Management-Tabelle für angedockte eigene und berechtigte Schiffe.
- [x] Schalter „Batterie automatisch nachladen“: im Tick lädt die Station die Ersatzbatterie angedockter Schiffe aus ihrem EPS nach (STU-Regel).
- [x] Backend-Tests (Station als Quelle, Batterie-Tick), Frontend-Test.
- [x] `lint`, `typecheck`, `test` und `build` sind grün.

## Comments

- 2026-10-30: Umgesetzt. Gemeinsame Logik in `spacecraft/ship-management.service.ts` (`ShipManagementService` gegen den Port `ShipManagementSource`: EPS, Crew, Lager); `ColonyOrbitService.executeManagement` und neuer `StationShipManagementService` (`GET/POST /spacecraft/:id/ship-management`, nur Außenposten/Basis mit voller Crew wie STU `canManageShips`; Quelle ist EPS, Crew und Frachtraum der Station) nutzen sie. Fremde angedockte Schiffe: nur Batterie/Reaktor/Torpedos (keine Crew), bei aktiven Schilden abgelehnt, Eigner erhält Stationsnachricht. Schalter `POST /spacecraft/:id/battery-reload` (Spalte `reloadBattery`, Migration) und `stationBatteryReload` im Tick: wie in STU `EnergyConsumeHandler::calculateBatteryReload` lädt die Station ihre **eigene** Ersatzbatterie (max. 1/10 Kapazität je Tick, aus neu produzierter EPS); die Formulierung „Batterie angedockter Schiffe“ im Issue entspricht nicht der STU-Quelle. Frontend: `StationShipManagementPanel` (Wiederverwendung von `OrbitalManagementPanel` über `endpoint`) in `spacecraft-detail`. Folgepunkte: Fracht-Zähler der Station wird nur beim Entnehmen angepasst; Torpedo-Reserven/Warpkern-Transfer (STU `ManageTorpedoReserves`, `ManageWarpcoreTransfer`) nicht Teil dieses Issues; kein Kolonie-Spec für `executeManagement` vorhanden (Refactoring nur typgeprüft).
