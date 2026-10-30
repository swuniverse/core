# Schiffsmanagement angedockter Schiffe und Batterie-Nachladen

**Status:** claimed
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

- [ ] Die Management-Logik arbeitet gegen eine Quelle „Kolonie“ oder „Station“ (eine Implementierung, kein Kopieren); bestehende Kolonie-Tests bleiben grün.
- [ ] Stationsansicht bietet die Management-Tabelle für angedockte eigene und berechtigte Schiffe.
- [ ] Schalter „Batterie automatisch nachladen“: im Tick lädt die Station die Ersatzbatterie angedockter Schiffe aus ihrem EPS nach (STU-Regel).
- [ ] Backend-Tests (Station als Quelle, Batterie-Tick), Frontend-Test.
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Comments
