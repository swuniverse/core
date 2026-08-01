# SWU Spacecraft Target Model

## Purpose

This document captures the target gameplay and runtime model for spacecraft in SWU, derived from STU mechanics and code behavior observed in `/Users/TMUNDIN/git/github.com/st-universe/core` and the STU database dump.

This is a functional design document, not an implementation diff. It describes:
- which gameplay mechanics exist in STU,
- which abstractions SWU should preserve,
- how SWU should structure spacecraft systems,
- and in which phases the current simplified model should evolve.

---

## Core Principle

STU does **not** model ships as a flat object with a few derived stats. It models them as a combination of:

1. **Rumpf / hull baseline**
2. **Buildplan / module layout**
3. **Installed ship systems**
4. **System state and activation**
5. **Runtime resources**
6. **Movement rules**
7. **Combat interactions**
8. **Crew requirements and operating state**

SWU should follow the same principle.

A ship is not just:
- hull,
- shields,
- energy,
- warp speed.

A ship is a **resource-driven systems platform**.

---

## STU-Derived Baseline Model

### Hull / Rumpf base values

STU rump tables contain distinct baseline values for each hull:

- `base_hull`
- `base_shield`
- `base_eps`
- `base_reactor`
- `base_warpdrive`
- `base_damage`
- `base_sensor_range`
- `evade_chance`
- `hit_chance`
- `base_torpedo_storage`
- `eps_cost`
- `flight_ecost`

This means:
- EPS is a first-class baseline stat.
- Reactor output is a first-class baseline stat.
- Warpdrive capacity is a first-class baseline stat.
- Evasion is a first-class baseline stat.
- Movement has dedicated energy costs.

### Module groups observed in STU

The relevant STU module families are structurally separated into the following groups:

- HULL
- SHIELDS
- EPS
- IMPULSEDRIVE
- REACTOR
- COMPUTER
- ENERGY_WEAPON
- TORPEDO_BANK
- SENSOR
- WARPDRIVE
- SPECIAL

Each group has dedicated behavior and dedicated runtime consequences.

---

## Target SWU Spacecraft Model

## 1. Spacecraft baseline stats

Each ship class should expose these baseline values:

- `hullBase`
- `shieldBase`
- `epsBase`
- `reactorBase`
- `warpdriveBase`
- `batteryBase`
- `evadeBase`
- `hitChanceBase`
- `sensorRangeBase`
- `torpedoStorageBase`
- `flightEnergyCost`

These values represent the **unmodified hull** before any module adjustments.

### Notes

- `batteryBase` may initially remain a SWU-derived approximation until better STU data is available.
- `hitChanceBase` and `sensorRangeBase` should be added once downstream combat and navigation systems consume them directly.
- `flightEnergyCost` should replace implicit movement costs later.

---

## 2. Spacecraft runtime resources

A ship should track the following runtime resources separately:

- `hull`
- `hullMax`
- `shields`
- `shieldsMax`
- `eps`
- `epsMax`
- `battery`
- `batteryMax`
- `reactorLoad`
- `reactorCapacity`
- `reactorOutput`
- `warpdrive`
- `warpdriveMax`
- `evadeChance`
- `hitChance`
- `sensorRange`
- `torpedoStorage`

### Meanings

#### EPS
Operational ship power used by internal systems.

Consumed by:
- shields
- scanners
- weapons
- life support systems
- transfers / utility actions
- possibly cloak and special systems

#### Reactor
Primary generator / loaded core that provides output.

Used to:
- replenish EPS
- replenish Warpdrive
- possibly refill battery under safe conditions

#### Warpdrive
Dedicated travel resource for star map / inter-system movement.

Used by:
- warp travel
- long-distance movement
- possibly warp-boost mechanics

#### Battery
Reserve energy store that can buffer EPS shortages.

Used when:
- EPS is insufficient
- reactor output is delayed or limited
- emergency system uptime is required

---

## 3. Ship systems

Each ship should have explicit runtime systems rather than only derived stats.

Recommended system groups:

- Shields
- Reactor
- EPS
- Warpdrive
- Impulse Drive
- Weapons
- Torpedo Launcher
- Sensors
- Computer
- Life Support
- Special Systems
- Tractor Beam (if installed)

Each system should have state such as:
- active / inactive
- mode
- cooldown
- integrity
- optional current charge or capacity

### Why this matters

STU gameplay is not based on static ship stats alone.
A ship can fail because:
- it lacks power,
- systems are inactive,
- crew is insufficient,
- warpdrive is empty,
- shields are down,
- reactor cannot be reloaded,
- or modules are damaged.

That requires explicit systems.

---

## 4. Module semantics in SWU

### Hull modules
Hull modules affect:
- maximum hull durability
- projectile / torpedo resistance profiles

They should not be treated as simple hitpoint upgrades only.

### Shield modules
Shield modules affect:
- maximum shield capacity
- crew burden
- EPS consumption / operating burden

### EPS modules
EPS modules affect:
- `epsMax`
- `batteryMax`

Current working approximation:
- `batteryMax += round(baseEpsCapacity / 3)`

This matches the intended design direction until a more exact STU battery model is extracted.

### Reactor modules
Reactor modules affect:
- `reactorOutput`
- possibly reactor capacity or load ceilings later

They do **not** equal EPS.
They feed EPS and warpdrive, but are not the same mechanic.

### Hyperdrive modules
Hyperdrive modules affect:
- `warpdriveMax`
- possibly jump quality or warp efficiency later

They do **not** represent normal internal ship power.

### Sublicht / impulse modules
Impulse modules affect:
- `evadeChance`
- possibly local movement behavior later

They do **not** represent warpdrive.
They do **not** represent EPS directly.

### Computer / sensor modules
These should eventually influence:
- `hitChance`
- targeting quality
- scan range
- detection / initiative

### Weapon / launcher modules
Energy weapons and projectile launchers must remain distinct:
- Energy weapons consume EPS.
- Torpedo launchers use torpedo inventory plus launcher characteristics.

Launcher families should be able to affect:
- torpedo damage multiplier
- salvo behavior
- firing efficiency

---

## 5. Buildplans and ship construction

## Buildplan role

A buildplan should remain the canonical representation of a ship layout.

A buildplan should define:
- hull / rump
- installed module per module slot / system type
- crew requirement
- torpedo launcher configuration
- optional special systems

## Construction

A shipyard build should:
1. validate yard capability,
2. validate buildplan compatibility,
3. validate required modules and commodities,
4. validate crew requirements,
5. validate research and faction restrictions,
6. enqueue build process,
7. create finished ship with concrete installed systems.

## Retrofit

A retrofit should:
- compare old buildplan vs new buildplan,
- compute returned modules,
- compute required modules,
- compute crew deltas,
- validate cargo/storage return paths,
- and apply changes only when queue completes.

This is already largely aligned in SWU and should be preserved.

---

## 6. Movement model

## Two movement layers

SWU should preserve the conceptual split between:

1. **local/system movement**
2. **warp / inter-system movement**

## Pre-flight conditions

Before movement begins, the game should validate:
- enough crew
- enough EPS for activation and travel
- enough warpdrive for relevant route mode
- system readiness
- movement constraints (tractor, docking, blockades, etc.)

## Flight costs

Movement should consume:
- EPS for flight activation and local movement costs
- Warpdrive for warp travel

### Tractor flight
Tractor flight should cost extra, as in STU.

## Post-flight consequences

After movement, the game should process:
- exploration / mapping
- anomaly effects
- tracker / signature effects
- deflector or environmental effects
- post-flight system consequences

---

## 7. Energy and recharge model

## Reactor flow

The reactor should provide a per-tick output budget.

That output should be distributed to:
1. system upkeep,
2. EPS refill,
3. warpdrive refill,
4. battery refill,

according to defined priority rules.

## EPS use

EPS is the primary operational energy pool.

It should be reduced by:
- active shields
- active weapons
- active scanners
- life support
- utility actions
- launch / movement costs inside a system

## Battery behavior

Battery acts as reserve storage.

When EPS is insufficient:
- battery may discharge to keep systems online,
- otherwise systems must power down.

## Warpdrive behavior

Warpdrive should be charged separately.
It should not be interchangeable with EPS.

Warp travel should consume warpdrive.

---

## 8. Crew model

Crew should be modeled as an operating requirement, not only a capacity cap.

Crew affects:
- whether ships can fly,
- whether certain systems can activate,
- repair ability,
- boarding / foreign crew interactions,
- evacuation outcomes,
- special operations.

The model should preserve:
- own crew vs foreign crew
- crew minimums for operation
- crew transfer and assignment
- technical crew implications

---

## 9. Combat model

## Energy weapons
Energy weapons should:
- consume EPS or require EPS availability,
- use weapon-specific stats,
- interact with shields and systems.

## Torpedoes
Torpedoes should:
- consume torpedo inventory,
- depend on torpedo type,
- depend on launcher quality,
- interact with hull resistance profiles.

## Hull interactions
Hull modules should support:
- projectile / torpedo type specific mitigation
- material-family and ablative-family differentiation

## Shield interactions
Longer-term, STU also suggests weapon-vs-shield specialization (`stu_weapon_shield`).
This can be introduced later as an advanced balancing phase.

## Evasion
Impulse drive effects should directly contribute to evade chance and therefore affect hit resolution.

---

## 10. UI target behavior

The player-facing UI should separate these values clearly.

Recommended visible runtime sections:

### Core values
- Hull
- Shields
- EPS / Energy
- Battery
- Reactor Output
- Warpdrive
- Crew

### System state
- Shields active/inactive
- Sensors active/inactive
- Weapons active/inactive
- LSS active/inactive
- Hyperdrive ready/not ready
- Reactor loaded / transfer state

### Construction / Shipyard effects
Module effects should be shown in terms of their real gameplay impact:

- Hull: hull strength + torpedo protection
- Shields: shield capacity + crew + energy burden
- EPS: EPS storage + reserve battery
- Reactor: reactor output
- Hyperdrive: warpdrive capacity
- Impulse: evade chance
- Weapons: base damage / projectile multiplier
- Sensors: sensor range

---

## 11. Migration strategy for SWU

## Phase A — Completed / in progress
- Separate shield, hull, torpedo, and launcher data families
- Introduce clearer moduleType mappings
- Begin separating drive-related families

## Phase B — Structural stat separation
Introduce and persist:
- `epsMax`
- `reactorOutput`
- `warpdriveMax`
- `evadeChance`
- `batteryMax`

Continue using legacy fields only as compatibility mirrors where needed.

## Phase C — Active system model
Add explicit spacecraft systems with state and runtime activation.

## Phase D — Resource flow
Implement:
- reactor output distribution,
- EPS consumption,
- battery reserve logic,
- warpdrive charging and depletion.

## Phase E — Movement refactor
Rework:
- pre-flight checks,
- route costs,
- local vs warp movement,
- tractor-related movement penalties,
- post-flight consequences.

## Phase F — Combat refactor
Integrate:
- EPS-based weapon constraints,
- evadeChance in hit logic,
- torpedo launcher quality,
- projectile-vs-hull interactions,
- later shield specialization.

---

## 12. Recommended immediate next implementation step

The next implementation step should **not** be another module import wave.

It should be:

### build the actual ship runtime resource model

Specifically:
1. formalize `eps`, `battery`, `warpdrive`, `reactorOutput`, `evadeChance`,
2. map drive/reactor/eps modules into those runtime stats,
3. preserve legacy compatibility only where unavoidable,
4. then refactor movement and system consumption on top of that foundation.

This gives SWU a stable and STU-faithful spacecraft foundation instead of continuing to expand a simplified but incorrect model.
