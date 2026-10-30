# Faction modifiers

Status as of 2026-10-30. Persisted faction modifiers are seeded and returned by the faction module. Gameplay consumers are listed below.

| Modifier | Effective today | Reader |
|---|---|---|
| `hullMultiplier` | No | None outside the faction module |
| `shieldMultiplier` | No | None outside the faction module |
| `cargoMultiplier` | No | None outside the faction module |
| `researchMultiplier` | Yes | `ResearchService.processTick` applies it once to the current tick's authoritative commodity production before queue consumption |
| `colonyGrowthMultiplier` | No | None outside the faction module |
| `tradeModifier` | No | None outside the faction module |

`researchMultiplier` is resolved from the player's current faction on every main tick. The service multiplies the newly produced base points and floors the result to a whole number before applying it to research. Fractional points are not carried between ticks, and stored points or progress are never recalculated.
