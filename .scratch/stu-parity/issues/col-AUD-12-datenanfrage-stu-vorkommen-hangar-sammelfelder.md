# Datenanfrage an STU: Vorkommen, Hangar-Baupläne, Sammelfeldvorräte

**Status:** needs-info
**Priority:** P2
**Size:** S
**Blocked by:** —

## Ziel

Einige STU-Spielwerte stehen nur in der STU-Datenbank, nicht im Repo. Der Product Owner fragt sie bei STU an. Dieses Ticket hält fest, was gebraucht wird. Liegt der Export vor, legt der Agent die Rohdaten unter `.scratch/stu-parity/data/` ab (CSV, unverändert) und dokumentiert die Zuordnung zu SWU-IDs. Damit entsperrt er col-AUD-09b und col-AUD-10b sowie das Sammelfeld-Ticket aus README Abschnitt I.

## STU-Quellen

- `src/Module/Ship/Action/Colonize/Colonize.php` (Z. 195, `random_int(min, max)` je Vorkommen)
- `src/Module/Colony/Action/StartAirfieldShip/StartAirfieldShip.php` (Z. 89–142)
- `src/Orm/Entity/BuildplanHangar.php`
- Sammeln: `BussardCollectorHandler` und `stu_location_mining` (siehe README Abschnitt I)

## SWU-Pfade

- `game-data/data/colony-classes/stu-colony-classes.yaml`, `apps/backend/src/modules/game-data/game-data.service.ts` (Z. 1215–1219)
- `game-data/data/ship-building/ship-class-hangar.yaml`
- Sammelfelder: `apps/backend/src/modules/spacecraft/` (Ressourcen sammeln, sc-WP-RES-1)

## Akzeptanzkriterien

- [ ] Export der drei Datensätze liegt unter `.scratch/stu-parity/data/` mit Quelle und Datum:
  1. `stu_colony_class_deposit` (`colony_class_id`, `commodity_id`, `min_amount`, `max_amount`) plus `stu_colony_classes` (`id`, `name`) und `stu_commodity` (`id`, `name`).
  2. `stu_buildplans_hangar` (`rump_id`, `buildplan_id`, `start_energy_costs`, `default_torpedo_type_id`) plus Namen aus `stu_rump` und `stu_torpedo_types`; dazu `stu_buildplan` (`id`, `crew`) und `stu_buildplans_modules` (`buildplan_id`, `module_id`, `module_type`).
  3. `stu_location_mining`, nur aggregiert: `commodity_id`, Feldtyp, min/avg/max von `max_amount`, Anzahl.
- [ ] Eine Zuordnungstabelle STU-ID → SWU-ID (Kolonieklassen, Waren, Rümpfe, Torpedotypen) liegt daneben.
- [ ] Danach Status `resolved`. Kommt keine Antwort, setzt der PO `wontfix`; dann gilt in den abhängigen Tickets der Fallback „SWU-eigene Balance“.

## Herkunft

- [`../audit-2026-11-17/README.md`](../audit-2026-11-17/README.md), Abschnitt I (Entscheidungen zu den offenen Punkten, „Datenanfrage an STU“) und Abschnitt H „Weiterhin offen“.
- [`../audit-2026-11-17/colony.md`](../audit-2026-11-17/colony.md), Unsicherheiten Nr. 1 und Nr. 4.
- PO-Entscheidung 2026-11-17: PO fragt bei STU nach; ein Prod-Dump ist nicht verfügbar; Fallback eigene Balance.

## Offene Frage

Liefert STU die drei Exporte (Vorkommen je Kolonieklasse, Hangar-Baupläne mit Crew/Modulen, aggregierte Sammelfeldvorräte)? Falls nein oder nur teilweise: Soll der Agent für die fehlenden Teile SWU-eigene Werte festlegen (Fallback laut README Abschnitt I), oder sollen die abhängigen Tickets bis auf Weiteres warten?

## Comments

- 2026-11-17: Aus dem Audit angelegt. Blockiert col-AUD-09b und col-AUD-10b.
