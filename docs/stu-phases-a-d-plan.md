# STU Phasen A-D Umsetzungsplan

Stand: 2026-05-06

## Neue Leitentscheidung

Karte zunächst **nicht automatisch generieren**.
Stattdessen STU-naher Ansatz:

- Layer manuell anlegen
- leeres Grid persistieren
- Admin pflegt Felder sektorweise
- Systeme werden manuell gesetzt
- systeminterne Inhalte vorerst ebenfalls manuell/halbmanuell

Automatische Generatoren bleiben später optional, aber **nicht Basis**.

## Phase A — Weltmodell / manuelle Map-Authoring-Basis

### Ziel

Persistente STU-nahe Kartenstruktur mit Admin-Authoring statt Auto-Seed.

### A1 Entities

- `GalaxyFieldType`
- `GalaxyField`
- `SystemField`

### A2 Services

- `StarmapAdminService`
  - `createLayer(...)`
  - `initializeLayerGrid(layerId, defaultFieldTypeId)`
  - `listFieldTypes()`
  - `updateGalaxyField(...)`
  - `bulkUpdateSectorFields(...)`
  - `createStarSystem(...)`
  - `initializeSystemGrid(systemId, defaultFieldTypeId)`
  - `updateSystemField(...)`
- `StarmapQueryService`
  - `getGalaxySectors(layerId)`
  - `getGalaxySectorFields(layerId, sectorX, sectorY)`
  - `getSystemGrid(systemId)`

### A3 Admin API (erst Backend-only, UI später)

- `POST /starmap/admin/layers`
- `POST /starmap/admin/layers/:id/initialize-grid`
- `GET /starmap/admin/field-types`
- `PATCH /starmap/admin/fields/:id`
- `POST /starmap/admin/sectors/fill`
- `POST /starmap/admin/systems`
- `POST /starmap/admin/systems/:id/initialize-grid`
- `PATCH /starmap/admin/system-fields/:id`

### A4 Öffentliche Query API

- `GET /starmap/layers/:id/sectors`
- `GET /starmap/layers/:id/sectors/:sectorX/:sectorY`
- `GET /starmap/systems/:id/grid`

### A5 Nicht tun in Phase A

- kein Perlin/Noise
- kein Auto-Galaxy-Seed
- kein Auto-System-Generator als Pflichtpfad

## Phase B — Read Models / DTOs

### Ziel

UI von Entities entkoppeln.

### DTOs

- `SectorDTO`
- `GalaxyFieldDTO`
- `SystemGridDTO`
- `SystemFieldDTO`
- `ColonyDetailDTOv2`
- `ShipDetailDTOv2`

### Services

- `ColonyProjectionService`
- `ShipProjectionService`

## Phase C — Runtime-Kern

### Ziel

STU-nahe Runtimeobjekte ergänzen.

### Entities

- `ShipSystemInstance`
- `CargoItem`

### Services

- `TransferService`
- einfache `Docking/Orbit` Regeln

## Phase D — Tick / Jobs

### Ziel

Tick aus God-Service lösen.

### Services

- `TickCoordinatorService`
- `ColonyTickHandler`
- `SpacecraftTickHandler`
- `ResearchTickHandler`
- `BuildCompletionHandler`

### Später

- BullMQ nach Handler-Schnitt stabil

## Empfohlene konkrete Reihenfolge

1. Phase A Entities + manuelle Admin APIs
2. Öffentliche Karten-Queries auf neue Tabellen umstellen
3. Phase B DTOs für Starmap/Colony/Ship
4. Phase C Ship runtime + Cargo/Transfer
5. Phase D Handler-Split
