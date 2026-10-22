# Passive Modulreparatur an STU-Regel ausrichten?

**Status:** resolved
**Priority:** P2
**Size:** S
**Blocked by:** sc-WP-ENG-3

## Ziel

SWU repariert heute jedes Modul überall um 1 % Integrität je Tick (`spacecraft.service.ts`, Kommentar „Passive module repair (1% integrity per tick)“). STU kennt keine bedingungslose passive Reparatur: Schiffe werden in Kolonie-Werften bzw. an Stationen (`StationPassiveRepairHandler`) repariert. Nach der Entscheidung wird das Verhalten angepasst oder per ADR festgeschrieben.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Tick/Spacecraft/ManagerComponent/RepairActions.php` (`repairShipsOnColonies`, Werft aktiv, nicht blockiert)
- `Module/Tick/Spacecraft/Handler/StationPassiveRepairHandler.php`

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/spacecraft.service.ts` (`processTick`, passive Modulreparatur)
- `docs/adr/`

## Akzeptanzkriterien

- [x] Die 1-%-Reparatur in `spacecraft.service.ts#processTick` entfällt; Reparatur nur über Werft (col-A5), Eigenreparatur (sc-WP-ENG-3) und Stationen (sc-WP-STAT-4b). Tests angepasst, kein Test abgeschwächt.
- [x] Entscheidung unter „Entscheidungen“ in `map.md` (bereits eingetragen; ggf. um Umsetzungshinweis ergänzen).

## Entscheidung

Vorgabe: Variante (a), STU-Regel. Die 1-%-Reparatur je Tick an jedem Ort entfällt. Reparatur nur über Werft (col-A5), Eigenreparatur (sc-WP-ENG-3) und Stationen (sc-WP-STAT-4b). Keine ADR.

## Comments

- 2026-10-21 Product Owner: Option a – Die bedingungslose passive Modulreparatur von 1 % je Tick entfällt; Reparatur gibt es nur noch in der Werft, an Stationen oder per Eigenreparatur wie in STU.
- 2026-10-23 Umsetzung: Die globale 1-%-Reparatur wurde aus `SpacecraftService.processTick` entfernt; Modul-Cooldowns laufen unverändert weiter. Ein Regressionstest stellt sicher, dass beschädigte Module im normalen Schiffstick unverändert bleiben. Keine offenen Folgepunkte.
