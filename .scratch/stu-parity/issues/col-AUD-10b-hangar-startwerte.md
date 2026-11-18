# Hangar: Start-Energie, Crew, Module und Torpedos je Hangar-Rumpf wie STU

**Status:** ready-for-agent
**Priority:** P3
**Size:** S
**Blocked by:** col-AUD-12

## Ziel

Der Ablauf beim Hangarstart entspricht STU. Die Werte je Hangar-Rumpf (Startenergie, Standardtorpedo, Crew, Module) stehen bei STU nur in den DB-Tabellen `stu_buildplans_hangar`, `stu_buildplan` und `stu_buildplans_modules`. Die SWU-Werte in `ship-class-hangar.yaml` sind eigene Annahmen. Nach der Antwort auf die Datenanfrage (col-AUD-12) werden die Werte übernommen oder ausdrücklich als SWU-eigene Balance gekennzeichnet.

## STU-Quellen

- `src/Module/Colony/Action/StartAirfieldShip/StartAirfieldShip.php` (Z. 89–142)
- `src/Orm/Entity/BuildplanHangar.php` (`start_energy_costs` Z. 34, `default_torpedo_type_id`)
- DB-Tabellen `stu_buildplans_hangar`, `stu_buildplan`, `stu_buildplans_modules` (siehe col-AUD-12)

## SWU-Pfade

- `game-data/data/ship-building/ship-class-hangar.yaml` (Start 10/110/125/150, Bau 25/90)
- `apps/backend/src/modules/colony/colony.service.ts` (`startHangarShip` Z. 1039–1145)
- `apps/frontend/src/pages/colonies/components/PanelHangar.tsx`

## Akzeptanzkriterien

- [ ] Je Hangar-Rumpf sind Startenergie, Standardtorpedotyp, Crewbedarf und Module aus dem STU-Export auf die SWU-Rümpfe abgebildet. Die Zuordnung STU-Rumpf → SWU-Rumpf ist dokumentiert. Ohne Export bleiben die Werte und werden als „SWU-eigene Balance“ kommentiert.
- [ ] `startHangarShip` verwendet diese Werte (Energieabzug, Crew, Module, Torpedoladung).
- [ ] `PanelHangar` zeigt die Werte vor dem Start.
- [ ] Backend-Test: Start eines Rumpfs mit den neuen Werten (Energie, Crew, Torpedos).
- [ ] Frontend-Test `PanelHangar.spec.tsx` für die Anzeige.

## Herkunft

- [`../audit-2026-11-17/README.md`](../audit-2026-11-17/README.md), Abschnitt H „Weiterhin offen“ und Abschnitt I (Hangarwerte, Datenanfrage Punkt 2).
- [`../audit-2026-11-17/colony.md`](../audit-2026-11-17/colony.md), Unsicherheit Nr. 4.
- PO-Entscheidung 2026-11-17 (Abschnitt I): PO fragt bei STU nach; Fallback eigene Balance.

## Comments

- 2026-11-17: Aus dem Audit angelegt. Blockiert durch col-AUD-12; bei wontfix gilt der Fallback.
