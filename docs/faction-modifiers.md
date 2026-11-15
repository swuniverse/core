# Faction modifiers

Status as of 2026-11-15. Persisted faction modifiers are seeded and returned by the faction module. Gameplay consumers are listed below.

| Modifier | Effective today | Reader |
|---|---|---|
| `researchMultiplier` | Yes | `ResearchService.processTick` applies it once to the current tick's authoritative commodity production before queue consumption |
| `colonyGrowthMultiplier` | Yes | `ColonyTickProcessorService.growPopulation` applies it once to positive base growth before population and housing capacity limits |

`hullMultiplier`, `shieldMultiplier` and `cargoMultiplier` were removed on 2026-11-15 (tmw-FA1b2, migration `20261115160000-drop-faction-ship-multipliers`). STU has no faction-dependent ship values (its faction only carries start data and commodity effects; maximum hull and shields are stored per ship at build), and the multipliers were never read, so SWU follows STU instead of introducing them.

`tradeModifier` was removed on 2026-11-13 (tmw-T13, migration `20261113110000-drop-faction-trade-modifier`). It was never read; trade effects between players come from active trade agreements via `mayTradeFavorably` (see `docs/alliance-relationship-effects.md`).

`researchMultiplier` is resolved from the player's current faction on every main tick. The service multiplies the newly produced base points and floors the result to a whole number before applying it to research. Fractional points are not carried between ticks, and stored points or progress are never recalculated.

`colonyGrowthMultiplier` is resolved from the colony owner's current faction on every main tick. `ColonyTickProcessorService.growPopulation` multiplies only positive base growth once, floors the result to whole population, and then keeps the existing housing and configured population limits in force. Emigration and other negative population changes are not multiplied.
