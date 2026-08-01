# STU module fabrication source

Source dump: `/Users/TMUNDIN/git/github.com/st-universe/core/dist/db/stu.dump`

Inspection commands used:

```bash
pg_restore -l /Users/TMUNDIN/git/github.com/st-universe/core/dist/db/stu.dump
pg_restore -s -f /tmp/schema.sql /Users/TMUNDIN/git/github.com/st-universe/core/dist/db/stu.dump
pg_restore -a \
  -t stu_modules \
  -t stu_modules_cost \
  -t stu_modules_buildingfunction \
  -t stu_commodity \
  -t stu_research \
  -f /tmp/module-data.sql \
  /Users/TMUNDIN/git/github.com/st-universe/core/dist/db/stu.dump
```

Relevant STU tables:

- `stu_modules`
  - `id`: module id, usually same as module commodity id for buildable modules.
  - `name`: STU module name, e.g. `Föderations Phaser (Klasse 2)`.
  - `level`: module class (`1..6`).
  - `type`: STU module type (`2` shields, `4` impulse/sub-light, `5` warp core/reactor, `7` beam weapons, `8` torpedo banks, `11` warp/hyperdrive).
  - `research_id`: old individual STU tech id.
  - `commodity_id`: output commodity.
  - `ecost`: energy cost in STU module creation action.
- `stu_modules_cost`
  - `module_id`, `commodity_id`, `count`: exact STU material costs per module.
- `stu_modules_buildingfunction`
  - `module_id`, `buildingfunction`: STU building function compatibility.
- `stu_modules_queue`
  - `colony_id`, `module_id`, `count`, `buildingfunction`.
  - No duration/finish column. STU module creation queues a count and the colony tick transfers the module commodity to storage when the building function is active.

Relevant STU source code:

- `/Users/TMUNDIN/git/github.com/st-universe/core/src/Module/Colony/Action/CreateModules/CreateModules.php`
  - subtracts `stu_modules_cost` and `module.ecost`
  - writes/updates `stu_modules_queue`
- `/Users/TMUNDIN/git/github.com/st-universe/core/src/Module/Tick/Colony/ColonyTick.php`
  - `proceedModules()` completes queued modules during colony tick by adding `queue.module.commodity` to storage and deleting the queue.

Important duration finding:

STU has exact per-module material costs and energy costs, but no per-module build duration in the module tables. A module job completes on the next colony tick while the matching building function is active. For SWU `durationSeconds`, generated entries therefore use `0` and carry source metadata indicating STU tick-queue semantics.

Sample verification:

- Klasse-2 weapon `Föderations Phaser (Klasse 2)`:
  - `stu_modules.id = 10702`
  - `commodity_id = 10702`
  - `research_id = 510200`
  - `level = 2`
  - STU costs: `25 Baumaterial`, `30 Transparentes Aluminium`, `30 Duranium`
  - SWU commodity map: `10702` → `Turbolaser (Klasse 2)`, rawName `Föderations Phaser (Klasse 2)`
