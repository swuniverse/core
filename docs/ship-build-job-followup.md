# Shipyard queue status

This document replaces the obsolete MVP follow-up plan. Ship construction,
retrofits, and repairs now use `colony_ship_build_queue`; buildplans persist the
selected module snapshot.

## Current behavior

- Construction validates ownership, an active compatible shipyard, blockade
  state, hull crew maximum, special-module capacity, research, inventory, and
  available trained crew before resources are consumed.
- Creating a buildplan applies the same module, crew-maximum, and special-slot
  validation as construction.
- Retrofitting validates colony blockade state, orbit access, an active
  compatible shipyard, hull crew maximum, special-module capacity, research,
  and newly required inventory.
- Construction reserves crew and materials when queued. Retrofit jobs consume
  only newly installed modules and retain a snapshot for completion or
  cancellation.
- Building-function lifecycle hooks pause or cancel affected shipyard jobs.
- Due jobs are completed by the colony tick processor and the colony UI shows
  active and paused jobs.

Further changes to queue capacity, energy costs, repair steps, and dismantling
belong to their dedicated STU parity issues rather than this historical plan.
