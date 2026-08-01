# SWU Spacecraft Implementation Plan

Source of truth:
- `docs/swu-spacecraft-target-model.md`
- STU codebase at `/Users/TMUNDIN/git/github.com/st-universe/core`
- STU dump findings for rumps/modules/torpedo hulls

This document translates the target model into a concrete phased implementation plan for SWU and tracks the current implementation status.

---

## Current status snapshot

### Completed foundations

#### Ship build / retrofit baseline
- Build / queue / retrofit workflow exists and should be preserved.
- Buildplans remain the canonical module layout source.

#### Module data separation
Implemented module family splits for:
- shields: Standard / Verstärkt / Militär
- hull: Matrix / Durastahl / Beskar / ablative variants
- torpedoes: Proton / Quantum / Plasma specializations
- projectile launchers: Standard / Mehrfach / Imperial
- heavy energy weapons: mapped to `Schwerer Turbolaser`
- drive families:
  - EPS: `Energieverteiler` `10301-10306`
  - Sublicht: `Ion-Triebwerk`, `Imperialer Ionenantrieb`
  - Reaktor: `Hypermaterie-Reaktor`, `Allianz-Hypermaterie-Reaktor`
  - Hyperdrive: `Standard-Hyperantrieb`, `Allianz-Hyperantrieb`

#### Runtime stat separation
Runtime fields now exist on `Spacecraft`:
- `epsMax`
- `reactorOutput`
- `warpdriveMax`
- `warpdrive`
- `evadeChance`
- `runtimeSystems`

Compatibility fields still exist:
- `energy`
- `energyMax`
- `warpSpeed`
- `battery`
- `batteryMax`

Current compatibility behavior:
- `energy` acts as EPS current value.
- `energyMax` mirrors `epsMax`.
- `warpSpeed` remains legacy compatibility and should not be treated as the future warpdrive resource.

#### Runtime systems foundation
Added `SpacecraftRuntimeStateService`.

Current runtime system keys:
- `SHIELDS`
- `REACTOR`
- `EPS`
- `WARPDRIVE`
- `SUBLIGHT_DRIVE`
- `SENSORS`
- `COMPUTER`
- `WEAPONS`
- `TORPEDO_BANK`
- `SPECIAL`

Current system state shape:
- `active`
- `cooldown`
- `integrity`
- optional `current`
- optional `max`

#### Resource flow foundation
Added `SpacecraftResourceFlowService`.

Current resource-flow behavior:
1. Reactor output pays basic shield upkeep first.
2. If reactor is insufficient, EPS pays.
3. If EPS is insufficient, battery pays.
4. If all are insufficient, shields are marked inactive.
5. Remaining reactor output recharges EPS.
6. Remaining output recharges warpdrive.
7. Remaining output recharges battery.
8. Runtime systems are resynchronized.

Current upkeep modeled:
- Shields cost `2` EPS per tick when shields are above zero and the SHIELDS system is active.

#### Movement resource split
Current movement behavior:
- In-system navigation consumes EPS (`energy`).
- Galaxy flight consumes `warpdrive`.
- Inter-system warp consumes `warpdrive`.
- Movement syncs `runtimeSystems` after resource changes.

#### Combat data foundations
Implemented:
- torpedo `damageType`
- torpedo `hullDamageFactor` / `shieldDamageFactor` usage
- hull projectile resistance by torpedo type
- launcher projectile damage multipliers
- armor absorb combat log

---

## Current verification status

Verified recently:
- focused spacecraft resource-flow and movement tests pass
- focused spacecraft stats tests pass
- focused game-data tests pass
- backend build passes
- TypeScript workspace diagnostics are clean

Known note:
- Some Nx test invocations have previously been flagged flaky by Nx, but reruns passed.

---

## Known gaps remaining

### Runtime system model is only partially used
`runtimeSystems` exists, but most gameplay systems still read legacy fields or module flags directly.

Still needed:
- system-specific activation / deactivation commands
- system state persistence policies
- system state exposure in API/DTO/UI
- system-specific cooldown semantics

### Resource flow only models shields
Currently only shield upkeep is modeled.

Still needed:
- sensors EPS upkeep
- weapons EPS upkeep / fire cost
- torpedo launcher EPS upkeep or fire prep cost if desired
- special systems EPS upkeep
- life support once modeled
- configurable system priority for brownouts

### Battery fallback is basic
Battery currently acts as a fallback pool for shield upkeep only.

Still needed:
- generalized reserve behavior for all EPS consumers
- clear UI state for battery discharge
- optional recharge priority tuning

### Movement is only partially STU-aligned
Implemented:
- local movement uses EPS
- galaxy/warp movement uses warpdrive

Still needed:
- richer pre-flight failure aggregation
- tractor movement cost modifiers
- local vs warp route distinction beyond current methods
- post-flight consequences
- anomaly/environment effects
- system activation requirements for movement

### Combat is not yet fully system-driven
Implemented:
- torpedo specialization
- hull resistance
- launcher multipliers

Still needed:
- disabled WEAPONS/TORPEDO_BANK runtime systems should prevent firing
- disabled SHIELDS runtime system should prevent shield regeneration / possibly shield use
- `evadeChance` should affect hit chance directly
- energy weapons should consume EPS
- weapon-vs-shield specialization from STU `stu_weapon_shield`

### Ship class baseline still incomplete
Current model still lacks first-class class fields for:
- `reactorBase`
- `warpdriveBase`
- `evadeBase`
- `hitChanceBase`
- `sensorRangeBase`
- `torpedoStorageBase`
- `flightEnergyCost`

Some values are represented via existing fields or compatibility fields, but the model is not fully STU-shaped yet.

### UI still simplified
Frontend still largely shows:
- Energy
- Warpdrive / legacy warp-related values
- Battery

Still needed:
- explicit reactor output
- EPS storage vs battery vs warpdrive separation
- runtime system active/inactive indicators
- resource shortage / brownout messages

---

## Target implementation architecture

## Layer 1 — Static ship class baseline
Extend ship class baseline model so each ship class represents STU rump semantics more closely.

### Add or derive baseline fields
- `epsBase`
- `reactorBase`
- `warpdriveBase`
- `batteryBase`
- `evadeBase`
- later:
  - `hitChanceBase`
  - `sensorRangeBase`
  - `torpedoStorageBase`
  - `flightEnergyCost`

### Source
- Existing `ship-classes.yaml` / `ShipClassDef`
- Regenerate / enrich from STU `stu_rumps` once ready

---

## Layer 2 — Derived ship stats
`SpacecraftStatsService` should remain a baseline + module modifier service, not a runtime state machine.

It should produce values such as:
- `hullMax`
- `shieldsMax`
- `epsMax`
- `reactorOutput`
- `warpdriveMax`
- `batteryMax`
- `evadeChance`
- later `sensorRange`, `hitChance`, `torpedoStorage`

It should not own:
- system activation
- recharge loops
- flight consumption
- combat state updates

Those belong to the runtime systems layer.

---

## Layer 3 — Runtime spacecraft systems
Per-ship runtime systems are stored in `runtimeSystems` JSONB for now.

This is intentionally transitional. It avoids an immediate table explosion while allowing STU-like system states.

Future table split remains possible once the shape stabilizes.

---

## Layer 4 — Resource flow engine
`SpacecraftResourceFlowService` owns recharge/upkeep logic.

It should continue evolving toward:
1. Reactor output distribution
2. EPS recharge
3. Warpdrive recharge
4. Battery recharge/discharge
5. system upkeep consumption
6. low-energy fallback behavior

---

## Phased implementation plan

## Phase 1 — Finish structural stat separation

### Status
Partially complete.

### Completed
- Drive/reactor/EPS module families separated.
- Runtime fields introduced:
  - `epsMax`
  - `reactorOutput`
  - `warpdriveMax`
  - `warpdrive`
  - `evadeChance`
- Compatibility retained:
  - `energyMax` mirrors EPS capacity behavior
  - `warpSpeed` remains legacy

### Remaining
- add full ship class baseline fields:
  - `reactorBase`
  - `warpdriveBase`
  - `evadeBase`
  - `hitChanceBase`
  - `sensorRangeBase`
  - `torpedoStorageBase`
  - `flightEnergyCost`
- regenerate/enrich ship class YAML from STU rump data

---

## Phase 2 — Runtime resource fields

### Status
Partially complete.

### Completed
- added DB/runtime fields:
  - `epsMax`
  - `reactorOutput`
  - `warpdriveMax`
  - `warpdrive`
  - `evadeChance`
  - `runtimeSystems`
- migrations added for these fields
- ship creation initializes most new values

### Remaining
- add `reactorLoad` / `reactorCapacity` if modeling loaded reactor fuel like STU
- decide whether to introduce `eps` as explicit alias separate from legacy `energy`
- expose new fields cleanly in frontend DTOs/UI

---

## Phase 3 — Runtime system state model

### Status
Foundation complete.

### Completed
- `SpacecraftRuntimeStateService`
- default system state initialization
- EPS/WARPDRIVE/REACTOR/SHIELDS current and max synchronization

### Remaining
- system activation/deactivation endpoints
- system-specific state handlers
- expose state in ship detail API
- frontend system-state indicators

---

## Phase 4 — Resource flow and recharge loop

### Status
Started.

### Completed
- reactor output distribution foundation
- EPS recharge
- warpdrive recharge
- battery recharge
- shield upkeep
- battery fallback for shield upkeep
- shield runtime deactivation on shortage

### Remaining
- generalize upkeep beyond shields
- add configurable priorities
- add shortage event messages
- add system-specific brownout behavior
- integrate with UI notifications

---

## Phase 5 — Movement refactor

### Status
Started.

### Completed
- in-system movement consumes EPS
- galaxy flight consumes warpdrive
- inter-system warp consumes warpdrive
- runtime systems sync after movement

### Remaining
- pre-flight condition aggregation
- tractor movement extra costs
- route-level local/warp distinction
- post-flight consequences
- anomaly and environmental effects
- movement UI error messaging

---

## Phase 6 — Combat refactor

### Status
Started before this document update.

### Completed
- torpedo damage types
- hull projectile resistance
- launcher multipliers

### Remaining
- runtime systems affect combat:
  - disabled WEAPONS => no energy weapons
  - disabled TORPEDO_BANK => no projectile fire
  - disabled SHIELDS => no shield regeneration / possibly no shield use
- energy weapons consume EPS
- `evadeChance` affects hit chance
- weapon-vs-shield specialization from STU `stu_weapon_shield`

---

## Phase 7 — Crew and operational constraints

### Status
Not started.

### Remaining
- active systems require crew where appropriate
- insufficient crew can deactivate systems
- technical crew affects repair/maintenance
- boarding/foreign crew states affect operation
- escape pod/destruction outcomes

---

## Recommended next sprint

The next sprint should be:

### Combat-system integration with runtimeSystems

Scope:
1. CombatEngine reads `runtimeSystems`.
2. If `WEAPONS.active === false`, energy weapons do not fire.
3. If `TORPEDO_BANK.active === false`, projectile weapons do not fire.
4. If `SHIELDS.active === false`, shield regeneration is skipped.
5. `evadeChance` contributes to hit chance.
6. Add tests for each behavior.

Why this next:
- Runtime systems now exist.
- Resource flow can deactivate shields.
- Combat currently ignores that state.
- This closes the first major gameplay loop between energy shortage and actual combat behavior.

---

## Verification checklist for next sprint

Run at minimum:

```bash
GAME_DATA_PATH=/Users/TMUNDIN/git/github.com/swuniverse/core/game-data/data npx nx test backend --runTestsByPath \
  src/modules/combat/combat.engine.spec.ts \
  src/modules/spacecraft/spacecraft-resource-flow.service.spec.ts \
  src/modules/spacecraft/spacecraft-movement-resources.spec.ts
```

Then:

```bash
npx nx run backend:build
```

Expected:
- tests pass
- backend builds
- no TypeScript diagnostics
