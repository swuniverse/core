# SWU Spacecraft Implementation Plan

Source of truth:
- `docs/swu-spacecraft-target-model.md`
- STU codebase at `/Users/TMUNDIN/git/github.com/st-universe/core`
- STU dump at `/Users/TMUNDIN/git/github.com/st-universe/core/dist/db/stu.dump`

This document translates the target model into a concrete phased implementation plan for SWU and tracks the current implementation status.

---

## Current status snapshot (2026-08-06)

### Completed foundations

#### Ship build / retrofit baseline
- Build / queue / retrofit workflow exists and should be preserved.
- Buildplans remain the canonical module layout source.

#### Module data separation
Implemented module family splits for:
- shields: Standard (ELECTROMAGNETIC) / Verstärkt (PHASIC) / Militär (POLAR)
- hull: Matrix / Durastahl / Beskar / ablative variants
- torpedoes: Proton / Quantum / Plasma specializations
- projectile launchers: Standard / Mehrfach / Imperial
- heavy energy weapons: Leichter Turbolaser / Schwerer Turbolaser / Ionenkanone
- drive families:
  - EPS: `Energieverteiler`
  - Sublicht: `Ion-Triebwerk`, `Imperialer Ionenantrieb`
  - Reaktor: `Hypermaterie-Reaktor`, `Allianz-Hypermaterie-Reaktor`
  - Hyperdrive: `Standard-Hyperantrieb`, `Allianz-Hyperantrieb`, `Militär-Hyperantrieb`
- special modules: `Tarnvorrichtung`, `Astrometrie-Labor`, `Crewtransport-Modul`, `Torpedotransportmodul`, `Shuttlerampe`, `Hyperraumfeldscanner`
- weapon families: PHASER, DISRUPTOR, TORPEDO (in `weaponFamily` secret field)
- shield families: ELECTROMAGNETIC, PHASIC, POLAR (in `shieldFamily` secret field)

#### Ship class baselines (Phase 1 — COMPLETE)
All 42 ship classes populated from STU `stu_rumps` dump:
- `epsBase`
- `reactorBase`
- `warpdriveBase`
- `evadeBase`
- `hitChanceBase`
- `sensorRangeBase`
- `torpedoStorageBase`
- `flightEnergyCost`
- `batteryBase`

Legacy `warpBase` field removed entirely.

#### Runtime stat separation (Phase 2 — COMPLETE)
Runtime fields on `Spacecraft` entity:
- `epsMax`
- `reactorOutput`
- `warpdriveMax`
- `warpdrive`
- `evadeChance`
- `battery` / `batteryMax`
- `runtimeSystems` (JSONB)

Compatibility fields retained:
- `energy` = EPS current value
- `energyMax` = mirrors `epsMax`
- `warpSpeed` = legacy, maps to `warpdriveBase` (frontend still reads this in NavigationPanel)

Frontend now exposes:
- EPS, Reactor, Warpdrive, Battery as separate columns in ShipHeaderTable
- SystemStatusPanel with toggle buttons for all runtime systems

#### Runtime systems (Phase 3 — COMPLETE)
- `SpacecraftRuntimeStateService`: initialization, getSystems
- `PATCH /spacecraft/:id/systems/:systemKey` endpoint for player toggle
- Cooldown guard prevents toggling systems on cooldown
- Default system initialization for all 10 system keys

#### Resource flow (Phase 4 — COMPLETE for core loop)
`SpacecraftResourceFlowService` handles per-tick recharge:
1. Pay upkeep for active systems: SHIELDS(2), SENSORS(1), COMPUTER(1), WEAPONS(1)
2. Fallback chain: Reactor → EPS → Battery → Deactivation
3. Charge EPS from remaining reactor
4. Charge Warpdrive from remaining reactor
5. Charge Battery from remaining reactor
6. Re-sync runtime systems

#### Movement (Phase 5 — COMPLETE for core loop)
- In-system navigation: requires SUBLIGHT_DRIVE + COMPUTER active, consumes EPS
- Galaxy flight: requires WARPDRIVE + COMPUTER active, consumes warpdrive
- Inter-system warp: requires WARPDRIVE + COMPUTER active, consumes warpdrive
- Pre-flight system checks with aggregated error messages
- Runtime systems synced after all movement

#### Combat (Phase 6 — COMPLETE)
- Runtime systems affect combat:
  - WEAPONS inactive → no energy weapon fire
  - TORPEDO_BANK inactive → no projectile fire
  - SHIELDS inactive → no shield regeneration
- `evadeChance` affects hit chance (STU formula)
- Energy weapons consume EPS (`epsCost` per weapon, default 5)
- Weapon-vs-shield modifier table (15 entries: 3 weapon families × 5 shield families)
  - Source: STU `stu_weapon_shield`
  - Loaded from `game-data/data/combat/weapon-shield-modifiers.yaml`
- Torpedo specialization: damageType, hullDamageFactor, shieldDamageFactor
- Hull projectile resistance by damage type
- Launcher projectile damage multipliers
- Ion weapon system disable mechanic

#### Crew constraints (Phase 7 — BASIC)
- `toggleSystem` checks crew demand before activation
- Crew demand = sum of `baseCrewCapacity` for all active modules
- Insufficient crew → system activation rejected with error message

---

## Verification status

All tests pass (2026-08-06):
- `spacecraft-stats.service.spec.ts` — 4 tests
- `spacecraft-resource-flow.service.spec.ts` — 3 tests
- `spacecraft-movement-resources.spec.ts` — 6 tests
- `combat.engine.spec.ts` — 8 tests
- `game-data.service.spec.ts` — 22 tests
- Backend builds cleanly
- Frontend builds cleanly

---

## Known gaps remaining

### Phase 4 — Resource flow polish
- Configurable upkeep priorities (player chooses which system dies first on brownout)
- Shortage event messages / UI notifications on auto-deactivation
- Life support system upkeep once modeled

### Phase 5 — Movement polish
- Tractor movement extra costs
- Post-flight consequences (damage, cooldowns)
- Anomaly and environmental effects on movement
- `flightEnergyCost` from ship class not yet used (currently hardcoded `distance * 5`)

### Phase 7 — Crew polish
- Automatic system deactivation on crew loss (boarding, casualties)
- Technical crew affects repair speed
- Boarding / foreign crew states affect operation
- Escape pod / destruction crew outcomes

### UI / Frontend polish
- `warpSpeed` legacy field still used in NavigationPanel — should show warpdrive instead
- Brownout / shortage warning messages in UI
- System integrity display (currently toggle only shows active/inactive)
- `runtimeSystems` can be null on ships never ticked — handle gracefully

### Data model cleanup
- Consider removing `warpSpeed` column entirely once frontend fully migrated
- `eps` as explicit field alias for `energy` — currently same column
- `reactorLoad` / fuel concept if desired later

---

## Target implementation architecture

### Layer 1 — Static ship class baseline ✅
Each ship class carries STU rump-equivalent baselines. Source: `ship-classes.yaml` with `stuRumpId` reference.

### Layer 2 — Derived ship stats ✅
`SpacecraftStatsService` produces: hullMax, shieldsMax, epsMax, reactorOutput, warpdriveMax, batteryMax, evadeChance from class base + module modifiers.

### Layer 3 — Runtime spacecraft systems ✅
Per-ship `runtimeSystems` JSONB. Shape per system: `{active, cooldown, integrity, current?, max?}`.
Future table split possible once shape stabilizes.

### Layer 4 — Resource flow engine ✅
`SpacecraftResourceFlowService` owns recharge/upkeep. Reactor distributes → EPS/Warpdrive/Battery. Active systems consume upkeep.

---

## Recommended next work

Priority order:

1. **Use `flightEnergyCost` from ship class** — replace hardcoded `distance * 5` in navigate() with `shipClass.flightEnergyCost * distance`
2. **Remove `warpSpeed` from frontend** — NavigationPanel should use warpdrive/warpdriveMax
3. **Brownout UI notifications** — when resource-flow deactivates a system, surface that to the player
4. **Crew-loss cascade** — when crew drops below demand, auto-deactivate lowest-priority system

---

## Verification checklist

```bash
GAME_DATA_PATH=/Users/TMUNDIN/git/github.com/swuniverse/core/game-data/data npx nx test backend --skip-nx-cache
```

Then:

```bash
GAME_DATA_PATH=/Users/TMUNDIN/git/github.com/swuniverse/core/game-data/data npx nx run backend:build
npx nx run frontend:build
```

Expected:
- all tests pass
- backend builds
- frontend builds
