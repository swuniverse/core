# STU Target Architecture + Ticketliste

Status: Draft for current repo `swuniverse/core`
Ziel: STU-inspirierte Star-Wars-Variante ohne kompletten Wegwerf-Rewrite
Priorität: Architektur C + Tickets D

---

## 1. Leitprinzipien

1. **Kein Big Bang Rewrite**
   - bestehende Module behalten
   - neue Kernobjekte ergänzen
   - alte Services schrittweise auf neue Domain umstellen

2. **Map-first Architektur**
   - Bewegung, Kolonien, Onboarding, Kampf, Exploration hängen an Location-Model
   - aktuelles kleines Layer/System-Modell reicht für STU-Zielbild nicht

3. **Data-driven first**
   - Schiffsrümpfe, Module, Gebäude, Feldtypen, Forschungseffekte, Startprofile in YAML/DB
   - Services nur Regeln + Validierung

4. **Tick + Jobs als Systemkern**
   - Cron nur Trigger
   - eigentliche Arbeit in queuebaren Jobs/Handlers

5. **Vertical slices weiter nutzbar**
   - Frontendseiten bleiben grob erhalten
   - Backendcontroller bleiben grob erhalten
   - tiefe Domänenlogik wird unter den Modulen ersetzt/ergänzt

---

## 2. Zielarchitektur Überblick

### 2.1 Bounded Contexts / Module

### Core World

- `galaxy`
  - Layer
  - Sector
  - GalaxyField
  - FieldType
  - FactionZone
  - Wormhole (später)
- `system-map`
  - StarSystem
  - SystemField
  - CelestialObject
  - PlanetBody

### Player Domain

- `auth`
- `faction`
- `profile`
- `onboarding`

### Colony Domain

- `colony`
  - Colony
  - ColonyField
  - BuildingInstance
  - ColonyEffect
  - PopulationState
  - ColonyInventory
  - ColonyOrbitState

### Ship Domain

- `ship-class`
  - ShipClass / HullDef
  - starter templates
- `spacecraft`
  - Spacecraft
  - ShipSystemInstance
  - CargoHold
  - CrewAssignment
  - AlertState
  - DockingState
- `fleet`
  - Fleet
  - FleetOrder
  - FleetFormation (später)
- `movement`
  - routes
  - movement validation
  - signatures

### Progression

- `research`
  - TechTree
  - UserResearch
  - UnlockResolver

### Economy

- `commodity`
- `transfer`
- `trade`
  - TradePost
  - TradeAccount
  - MarketOrder / Deal

### Combat

- `combat`
  - CombatSession
  - CombatParticipant
  - CombatRound
  - BoardingAction

### Meta / Social

- `messaging`
- `holonet`
- `alliance`
- `history`
- `encyclopedia` / `database`

### Runtime

- `tick`
- `jobs`
- `notifications`
- `websocket`

---

## 3. Ziel-Datenmodell

## 3.1 Galaxy / Map

### Neue Entities

#### `GalaxyField`

Ersetzt nicht sofort `StarSystem`, ergänzt aktuelle Kartenebene.

Felder:

- `id`
- `layerId`
- `cx`
- `cy`
- `fieldTypeId`
- `factionZone` enum: `REBEL | EMPIRE | CONTESTED | UNKNOWN | NEUTRAL`
- `starSystemId nullable`
- `isPassable`
- `energyCost`
- `damage`
- `visibilityFlags jsonb`
- `effectFlags jsonb`
- `adminRegionKey nullable`

Indizes:

- unique `(layerId, cx, cy)`
- index `(layerId, factionZone)`
- index `(starSystemId)`

#### `GalaxyFieldType`

Felder:

- `id`
- `key`
- `name`
- `passable`
- `energyCost`
- `damage`
- `specialDamageType nullable`
- `viewKey`
- `isSystem`
- `colonizableBodyClassId nullable`
- `effects jsonb`

#### `SystemField`

Für internes Sternsystem-Grid.

Felder:

- `id`
- `starSystemId`
- `sx`
- `sy`
- `fieldTypeId`
- `celestialObjectId nullable`
- `isPassable`
- `energyCost`
- `damage`
- `effects jsonb`

Index:

- unique `(starSystemId, sx, sy)`

### Bestehende Entities weiterverwenden

- `Layer`
- `StarSystem`
- `CelestialObject`

### Anpassungen an `Layer`

Ergänzen:

- `isDefault`
- `isColonizable`
- `isNoobZone`
- `isFinished`
- `sectorSize default 20`

### Anpassungen an `StarSystem`

Ergänzen:

- `entryMode` enum (`EDGE_RANDOM`, `FIXED`, `WORMHOLE`)
- `factionZone`
- `isKnown`
- `isWormhole`
- `bodyCount`

---

## 3.2 Onboarding / Faction

### Neue Entities

#### `Faction`

- `id`
- `key` (`REBEL_ALLIANCE`, `GALACTIC_EMPIRE`, später weitere)
- `name`
- `colorPrimary`
- `colorSecondary`
- `homeZone`
- `starterShipClassId`
- `starterProfileKey`

#### `FactionModifier`

- `id`
- `factionId`
- `hullMultiplier`
- `shieldMultiplier`
- `cargoMultiplier`
- `researchMultiplier`
- `colonyGrowthMultiplier`
- `tradeModifier`

#### `OnboardingSelection`

- `id`
- `userId`
- `factionId`
- `selectedLayerId nullable`
- `selectedSectorX nullable`
- `selectedSectorY nullable`
- `selectedSystemId nullable`
- `selectedCelestialObjectId nullable`
- `status`
- `completedAt nullable`

### Anpassung `User`

Ergänzen:

- `onboardingCompleted boolean`
- `starterColonyId nullable`
- `starterShipId nullable`
- `lastActiveTick nullable`

---

## 3.3 Colony

### Bestehendes behalten

- `Colony`
- `ColonyField`
- `ColonyStorage`

### Wichtige Erweiterungen

#### `Colony`

ergänzen:

- `celestialObjectId nullable` **wichtig**
- `satisfaction`
- `housingUsed`
- `housingMax`
- `workersAssigned`
- `workersFree`
- `crewPool`
- `crewPoolMax`
- `orbitCapacity`
- `shieldStrength`
- `shieldMax`
- `isBlockaded`
- `colonyLevel`

#### `ColonyField`

ergänzen:

- `isActive`
- `integrity`
- `level`
- `assignedWorkers`
- `terraformTargetType nullable`
- `terraformFinishesAt nullable`

### Neue Entities

#### `ColonyEffect`

- `id`
- `colonyId`
- `effectKey`
- `value`
- `sourceType` (`BUILDING`, `TECH`, `FACTION`, `PLANET`, `EVENT`)
- `sourceId nullable`

#### `ColonyOrbitShip`

Optional nur View/Projection. Alternativ Query über Ship-Position.

#### `BuildingQueueJob`

- `id`
- `colonyId`
- `fieldId`
- `jobType` (`BUILD`, `UPGRADE`, `REPAIR`, `REMOVE`, `TERRAFORM`)
- `buildingId nullable`
- `startedAt`
- `finishesAt`
- `status`

---

## 3.4 Spacecraft / Ship Systems

### Problem heute

Aktuell `SpacecraftModule` = Ausrüstung + teilweise Systemzustand. Für STU-Zielbild zu flach.

### Zieltrennung

- **ShipClassDef** = Blaupause / Rumpfklasse
- **ModuleDef** = installierbare Module
- **ShipSystemInstance** = Laufzeit-Zustand kritischer Systeme

### Neue Entities

#### `ShipClassDef` (DB oder YAML-backed projection)

- `id`
- `key`
- `name`
- `category`
- `role`
- `factionId nullable`
- `buildTimeTicks`
- `cargoCapacity`
- `crewMin`
- `crewMax`
- `hullBase`
- `shieldBase`
- `epsBase`
- `warpBase`
- `impulseCost`
- `jumpFuelCost`
- `slots jsonb`
- `starterAllowed`
- `isNpc`

#### `ShipSystemInstance`

- `id`
- `spacecraftId`
- `systemKey` (`HULL`, `EPS`, `IMPULSE`, `HYPERDRIVE`, `SHIELDS`, `SENSORS`, ...)
- `moduleType nullable`
- `health`
- `maxHealth`
- `isActive`
- `priority`
- `energyUse`
- `cooldown`
- `statePayload jsonb`

#### `CargoItem`

- `id`
- `spacecraftId`
- `commodityId`
- `amount`

#### `CrewAssignment`

- `id`
- `spacecraftId`
- `roleKey`
- `assigned`
- `required`

#### `ShipOrder`

- `id`
- `spacecraftId`
- `type`
- `payload jsonb`
- `status`

#### `WarpSignature`

- `id`
- `layerId`
- `cx`
- `cy`
- `shipId nullable`
- `factionId nullable`
- `direction`
- `createdAt`
- `expiresAt`

### Anpassung `Spacecraft`

Ergänzen:

- `celestialObjectId nullable`
- `currentLayerId nullable`
- `inSystem boolean`
- `currentSystemFieldX nullable`
- `currentSystemFieldY nullable`
- `cargoUsed`
- `cargoMax`
- `fuel`
- `fuelMax`
- `battery`
- `batteryMax`
- `crewRequired`
- `isCloaked`
- `isDocked`
- `dockedToId nullable`
- `isTractored`
- `tractoredById nullable`
- `standbyMode`
- `defendingColonyId nullable`
- `blockingColonyId nullable`

### Anpassung `Fleet`

Ergänzen:

- `sortOrder`
- `alertState`
- `formationKey nullable`
- `defendingColonyId nullable`
- `blockingColonyId nullable`
- `moveOrder jsonb nullable`

---

## 3.5 Research

### Bestehendes behalten

- `Research`
- YAML tech tree

### Neue/erweiterte Konzepte

#### `ResearchEffect`

Kann aus YAML geladen werden.
Beispiele:

- unlock buildingId
- unlock shipClassId
- unlock moduleType
- modify colony effect
- modify faction/unit stat

#### Anpassung `Research`

Ergänzen:

- `sourceColonyId nullable`
- `pointsPerTickSnapshot`
- `startedAt`

### Service-Ziel

`UnlockResolverService`

- `isBuildingUnlocked(userId, buildingId)`
- `isShipClassUnlocked(userId, shipClassId)`
- `isModuleUnlocked(userId, moduleType)`

---

## 3.6 Economy / Trade / Transfer

### Neue Entities

#### `TransferJob`

- `id`
- `userId`
- `sourceType` (`COLONY`, `SHIP`, `TRADE_ACCOUNT`)
- `sourceId`
- `targetType`
- `targetId`
- `commodityId`
- `amount`
- `status`
- `energyCost`
- `startedAt`
- `completedAt nullable`

#### `TradePost`

- `id`
- `name`
- `locationType` (`SYSTEM`, `STATION`, `COLONY`)
- `locationId`
- `isNpc`
- `factionId nullable`

#### `TradeAccount`

- `id`
- `userId`
- `tradePostId`
- `credits`
- `slotLimit`

#### `TradeOrder`

- `id`
- `tradePostId`
- `userId nullable`
- `type` (`BUY`, `SELL`, `NPC_DEAL`)
- `commodityId`
- `amount`
- `unitPrice`
- `status`
- `expiresAt nullable`

#### `LotteryTicket` später

---

## 3.7 Combat

### Bestehendes behalten

- `CombatEngine`
- `CombatService`

### Neue Entities

#### `CombatSession`

- `id`
- `locationType` (`GALAXY_FIELD`, `SYSTEM_FIELD`, `COLONY_ORBIT`)
- `locationId`
- `status`
- `initiatorShipId`
- `startedAt`
- `endedAt nullable`
- `winnerSide nullable`

#### `CombatParticipant`

- `id`
- `combatSessionId`
- `spacecraftId`
- `side` (`ATTACKER`, `DEFENDER`)
- `fleetId nullable`
- `enteredAt`
- `leftAt nullable`
- `destroyedAt nullable`

#### `CombatRound`

- `id`
- `combatSessionId`
- `roundNumber`
- `summary jsonb`
- `createdAt`

### Später

- `BoardingAction`
- `SalvageField`

---

## 3.8 Tick / Jobs

### Zielarchitektur

- `node-cron` oder Nest Schedule nur als trigger
- BullMQ für Jobs
- idempotente handler pro Ticktyp

### Neue Entities / technische Tabellen

#### `GameTickState`

- `id`
- `tickNumber`
- `tickType`
- `scheduledFor`
- `startedAt nullable`
- `completedAt nullable`
- `status`
- `lockKey`

#### `JobExecutionLog`

- `id`
- `jobType`
- `jobKey`
- `startedAt`
- `completedAt nullable`
- `status`
- `error nullable`

### Tick Handler Zielset

- ColonyTickHandler
- SpacecraftTickHandler
- ResearchTickHandler
- BuildCompletionHandler
- ShipBuildCompletionHandler
- TerraformCompletionHandler
- ShieldRegenerationHandler
- PirateTickHandler
- HistoryTickHandler

---

## 4. Ziel-Service-Architektur

## 4.1 Map/Galaxy

### `GalaxyQueryService`

- `getSector(layerId, sectorX, sectorY)`
- `getField(layerId, cx, cy)`
- `getVisibleFieldsForShip(shipId)`
- `getAvailableHomeworldSectors(factionId)`

### `SystemMapService`

- `getSystemGrid(systemId)`
- `enterSystem(shipId, systemId)`
- `leaveSystem(shipId)`

### `GalaxySeedService`

- seed 120x120 field grid
- seed star systems
- assign faction zones
- seed known planets + random fillers

## 4.2 Onboarding

### `OnboardingService`

- `selectFaction(userId, factionId)`
- `listAvailableSectors(userId)`
- `listAvailableSystems(userId, sectorX, sectorY)`
- `listAvailablePlanets(userId, systemId)`
- `claimHomeworld(userId, celestialObjectId)`
- `spawnStarterAssets(userId)`

## 4.3 Colony

### `ColonyProjectionService`

- liefert UI DTOs mit productionDelta, effects, orbit ships, workers, housing

### `ColonyManagementService`

- build/upgrade/remove/repair/terraform

### `ColonyTickService`

- production
- consumption
- growth
- worker assignment effects
- storage limits

## 4.4 Spacecraft

### `ShipClassService`

- class defs laden
- starter classes
- build validation

### `ShipSystemsService`

- activate/deactivate system
- consume energy
- fail due to missing energy/crew

### `MovementService` neu zuschneiden

- validate preflight
- move one field at time
- apply field effects
- alert check
- create signatures
- handle fleet splitting

### `FleetService` erweitern

- leader semantics
- move together
- set alert
- defend/blockade orders

## 4.5 Economy

### `TransferService`

- ship<->colony
- ship<->ship
- ship<->trade post
- capacity + range + dock/orbit validation

### `TradeService`

- list trade posts/orders
- create/cancel buy/sell
- npc base trade

## 4.6 Combat

### `CombatSessionService`

- create session
- add participants from fleets
- persist rounds
- resolve aftermath

### `AlertService`

- red alert auto engage on entry
- yellow alert warn only

## 4.7 Tick

### `TickCoordinatorService`

- schedules jobs
- writes `GameTickState`
- ensures lock / idempotency

---

## 5. Frontend Zielstruktur

Bestehende Pages bleiben, aber mit neuen Datenquellen.

## 5.1 Neue Screens / Flows

- `OnboardingFactionPage`
- `OnboardingHomeworldPage`
- `SectorMapPage`
- `SystemMapPage`
- `ShipDetailTabs`:
  - Info
  - Systems
  - Cargo
  - Crew
  - Navigation
- `ColonyTabs`:
  - Information
  - Build Menu
  - Social
  - Building Control
- `TradePage`
- `AlliancePage`
- `HistoryPage`

## 5.2 Neue shared client DTOs

- `SectorDTO`
- `GalaxyFieldDTO`
- `SystemFieldDTO`
- `ColonyDetailDTOv2`
- `ShipDetailDTOv2`
- `TransferPreviewDTO`
- `CombatSessionDTO`

---

## 6. Migrationsstrategie ohne Big Rewrite

## Phase M1: additive migrations

- neue Tabellen hinzufügen
- alte Tabellen nicht löschen
- bestehende APIs stabil halten

## Phase M2: read-model migration

- Frontend zuerst neue Read-DTOs nutzen
- alte intern vereinfachte Felder bleiben kompatibel

## Phase M3: behavior migration

- build/move/combat intern auf neue Services umstellen

## Phase M4: cleanup

- veraltete Felder/Methoden entfernen wenn neue Flows stabil

---

## 7. Ticketliste

Prioritäten:

- P0 = architekturkritisch
- P1 = spielbarer Kernloop
- P2 = tiefe Systeme
- P3 = Meta/Polish

---

## P0 — Architekturgrundlage

### T-001 P0 Add `Faction` and `FactionModifier` entities

**Ziel:** Fraktionen aus User-Enum in echte Domain überführen.
**Akzeptanz:**

- Tabellen vorhanden
- Seed für Rebels/Empire
- User referenziert `factionId` weiter gültig

### T-002 P0 Extend `Layer` for STU-compatible metadata

**Ziel:** `Layer` mit default/noob/sector info erweitern.
**Akzeptanz:**

- neue Felder in Entity + migration
- seed setzt `sectorSize = 20`

### T-003 P0 Create `GalaxyFieldType` entity/schema

**Ziel:** Feldtypen data-driven machen.
**Akzeptanz:**

- passable/ecost/damage/effects definierbar
- seedbar aus YAML/TS config

### T-004 P0 Create `GalaxyField` entity

**Ziel:** persistente 120x120 Galaxy-Ebene einführen.
**Akzeptanz:**

- unique layer+coords
- factionZone + fieldTypeId + optional starSystemId

### T-005 P0 Create `SystemField` entity

**Ziel:** Sternsysteme mit internem Grid modellieren.
**Akzeptanz:**

- unique system+sx+sy
- CelestialObjects an Systemfelder bindbar

### T-006 P0 Build `GalaxySeedService` for 120x120 grid

**Ziel:** STU-nahe Galaxy-Struktur erzeugen.
**Akzeptanz:**

- 1 Default-Layer mit 120x120
- 36 Sektorlogik validierbar
- bekannte + random Systeme seedbar

### T-007 P0 Add `celestialObjectId` to `Colony`

**Ziel:** Kolonie an konkreten Himmelskörper hängen, nicht nur an System.
**Akzeptanz:**

- Migration vorhanden
- Starterkolonien migrierbar

### T-008 P0 Add location shape to `Spacecraft`

**Ziel:** Schiff entweder auf GalaxyField oder SystemField präzise lokalisieren.
**Akzeptanz:**

- layer/system/inSystem/current coords vorhanden
- vorhandene ship APIs brechen nicht

### T-009 P0 Create `GameTickState` table

**Ziel:** Tickausführung persistent und nachvollziehbar machen.
**Akzeptanz:**

- tick state schreiben/lesen möglich
- doppeltes Ausführen erkennbar

### T-010 P0 Introduce BullMQ infrastructure

**Ziel:** echte Job-Architektur vorbereiten.
**Akzeptanz:**

- Queue Modul
- test job läuft
- Redis wiring sauber

---

## P1 — Spielbarer Kernloop

### T-011 P1 Implement `OnboardingSelection` entity + service

**Ziel:** Homeworld-Auswahlfluss statt Zufallsplanet.
**Akzeptanz:**

- user kann fraktion wählen
- sektor/system/planet schrittweise auswählen

### T-012 P1 Add onboarding endpoints

**Endpoints:**

- `GET /onboarding/sectors`
- `GET /onboarding/systems`
- `GET /onboarding/planets`
- `POST /onboarding/claim-homeworld`

### T-013 P1 Spawn faction-specific starter ship

**Ziel:** Start nicht nur Kolonie, sondern auch Schiff.
**Akzeptanz:**

- Rebel/Empire starter ship data-driven
- Schiff erscheint im Orbit/System passend

### T-014 P1 Introduce `ShipClassDef`

**Ziel:** `shipClassId` Magic Number ablösen.
**Akzeptanz:**

- class defs seedbar/ladebar
- existing ships auf classes mappbar

### T-015 P1 Refactor `buildShip` to use costs/time/unlocks

**Ziel:** Schiffbau STU-näher machen.
**Akzeptanz:**

- Werft erforderlich
- Kosten geprüft
- Bauzeit als Job/Queue
- UnlockResolver angebunden

### T-016 P1 Add `ShipSystemInstance`

**Ziel:** Laufzeitsysteme getrennt von Modulen.
**Akzeptanz:**

- neue Schiffe bekommen Basissysteme
- health/isActive/cooldown pflegbar

### T-017 P1 Add ship cargo inventory (`CargoItem`)

**Ziel:** Frachtraum endlich modellieren.
**Akzeptanz:**

- cargo used/max sichtbar
- Items in DB persistiert

### T-018 P1 Create `TransferService`

**Ziel:** Schiff↔Kolonie Transfers ermöglichen.
**Akzeptanz:**

- Kapazitätschecks
- Besitzchecks
- Orbit/dock conditions

### T-019 P1 Add colony projection DTO with STU metrics

**Ziel:** Koloniedetail näher an Audit.
**DTO enthält:**

- energy current/max/delta
- storage current/max/delta
- population total/workers/free/housing
- effects[]
- orbitShips[]
- inventory with productionDelta

### T-020 P1 Add ship detail projection DTO with STU metrics

**DTO enthält:**

- hull/shields/eps/battery/crew
- systems[]
- cargo[]
- current location
- alert state
- actions available

### T-021 P1 Add `UnlockResolverService`

**Ziel:** Forschung muss konkrete Freischaltungen kontrollieren.
**Akzeptanz:**

- build/buildShip/installModule hängen an unlocks

### T-022 P1 Replace random starter colony assignment with onboarding claim flow

**Ziel:** `ColonySeedService.createStarterColony` nur noch nach Planetwahl.

### T-023 P1 Build frontend onboarding flow

**Seiten:**

- Fraktion
- Sektorwahl
- Systemwahl
- Planetwahl
- Abschluss

### T-024 P1 Add `SectorDTO` and `SystemGridDTO`

**Ziel:** Frontend bekommt echte 3-Zoom-Level Daten.

### T-025 P1 Build sector map UI (20x20)

**Ziel:** Galaxy -> Sector Drilldown.

### T-026 P1 Build system map UI

**Ziel:** Celestial objects nicht nur Liste, sondern Grid/Map.

---

## P2 — Tiefere Spielmechanik

### T-027 P2 Rewrite `MovementService` around fields

**Ziel:** feldweises Movement mit Field Effects.
**Akzeptanz:**

- preflight checks
- pro feld costs/effects
- auto stop on blockers

### T-028 P2 Add `WarpSignature` generation + queries

**Ziel:** STU-Signaturen.

### T-029 P2 Add alert-driven combat trigger service

**Ziel:** Red Alert greift bei Feld-Eintritt an.

### T-030 P2 Introduce `CombatSession`, `CombatParticipant`, `CombatRound`

**Ziel:** Kämpfe persistent nachvollziehbar.

### T-031 P2 Extend combat to fleet participation

**Ziel:** nicht nur 1v1.

### T-032 P2 Add shield regeneration process job

**Ziel:** separate minute process jobs statt in monolithischem tick.

### T-033 P2 Add `BuildingQueueJob`

**Ziel:** build/upgrade/repair/remove/terraform sauber als Jobs.

### T-034 P2 Add building activation/deactivation

**Ziel:** Gebäudeschaltung wie Audit.

### T-035 P2 Add building integrity + repair

**Ziel:** Gebäudezustand gameplay-relevant machen.

### T-036 P2 Add colony effects aggregation service

**Ziel:** Zufriedenheit, Wohnraum, Forschungspunkte etc. aus Quellen aggregieren.

### T-037 P2 Add worker assignment model

**Ziel:** total/workers/free/housing spielmechanisch korrekt.

### T-038 P2 Add orbit ship listing + actions in colony UI

**Aktionen:** transfer, dock, beam/land später

### T-039 P2 Add `TradePost`, `TradeAccount`, `TradeOrder`

**Ziel:** Handelsgrundlage.

### T-040 P2 Build first Trade UI

**Tabs:** Basishandel / Orders

### T-041 P2 Add fleet alert state management UI

**Ziel:** Yellow/Red/Standby nutzbar.

### T-042 P2 Add ship systems UI tab

**Ziel:** Systeme health + active + cooldown sichtbar.

### T-043 P2 Add cargo/transfer UI tab

### T-044 P2 Add crew management model and UI

### T-045 P2 Add docking/orbit state transitions

### T-046 P2 Add NPC pirate tick skeleton

**Ziel:** Background opposition.

---

## P3 — Meta, Social, World Depth

### T-047 P3 Create `Alliance` entity/module

### T-048 P3 Create `DiplomaticRelation` entity/module

### T-049 P3 Build alliance list/create/detail pages

### T-050 P3 Create `HistoryEvent` entity/module

### T-051 P3 Emit gameplay events into history log

**Quellen:** build complete, ship built, combat, colonization, trade

### T-052 P3 Build History page with filters

### T-053 P3 Extend messaging with folders/categories

### T-054 P3 Extend messaging with contacts/ignore list

### T-055 P3 Evolve Holonet toward narrative KommNet

### T-056 P3 Add encyclopedia/database page

**Inhalte:** ships, systems, commodities, rankings

### T-057 P3 Add rankings/highscores projections

### T-058 P3 Add salvage/wreck aftermath after combat

### T-059 P3 Add boarding/takeover prototype

### T-060 P3 Add wormholes/anomalies field effects

---

## 8. Empfohlene Reihenfolge der ersten 12 Tickets

1. T-001 Faction entities
2. T-002 Layer metadata
3. T-003 GalaxyFieldType
4. T-004 GalaxyField
5. T-005 SystemField
6. T-006 GalaxySeedService
7. T-007 Colony.celestialObjectId
8. T-008 Spacecraft location shape
9. T-011 OnboardingSelection + service
10. T-012 Onboarding endpoints
11. T-013 Starter ship spawn
12. T-014 ShipClassDef

Dann sofort: 13. T-019 Colony projection DTO 14. T-020 Ship projection DTO 15. T-018 TransferService 16. T-015 Build ship rewrite 17. T-021 UnlockResolver 18. T-025/T-026 new map UI

---

## 9. Risiken

### Risiko 1: Zu früh Frontend polieren

Gegenmaßnahme: erst DTO + service contracts stabilisieren.

### Risiko 2: Alte `shipClassId`/`module` Logik blockiert neue Architektur

Gegenmaßnahme: kompatible Adapter bauen, nicht sofort löschen.

### Risiko 3: Tick-Logik bleibt monolithisch

Gegenmaßnahme: ab P0 bereits Queue-Infrastruktur einführen.

### Risiko 4: Galaxy-Seed wird zu groß/komplex

Gegenmaßnahme: erst 120x120 Grid + 20 bekannte Systeme + random fillers. Keine Perfektion.

---

## 10. Definition of Done für v1-Architektur

v1 Architektur erreicht, wenn:

- Spieler Homeworld wählen kann
- Startkolonie an konkretem Planeten hängt
- Starterschiff spawnt
- Galaxy/Sektor/System Datenmodell existiert
- Ship classes data-driven sind
- cargo + transfer funktionieren
- colony + ship detail DTOs STU-nahe Daten liefern
- Tickstate persistent ist
- erste Jobs über Queue laufen

---

## 11. Empfehlung

Nicht sofort Handel/Allianz bauen.
Erst diese Schleife stabil machen:

1. Onboarding
2. Planet/Colony
3. Starter Ship
4. Movement on map
5. Transfer/Cargo
6. Ship build
7. Research unlocks
8. Combat trigger

Erst danach:

- Trade
- Alliance
- History
- Encyclopedia
