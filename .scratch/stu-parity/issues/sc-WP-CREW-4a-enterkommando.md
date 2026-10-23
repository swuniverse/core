# Enterkommando (Truppenkampf gegen Crew)

**Status:** ready-for-agent
**Priority:** P3
**Size:** M
**Blocked by:** sc-WP-CREW-1, sc-WP-ENG-2c

## Ziel

STU erlaubt mit Truppenquartieren, ein fremdes Schiff am Feld zu entern; Sicherheitscrew kämpft gegen die Zielcrew (`CloseCombatUtil`), bei Erfolg wechseln Systeme bzw. Fracht. Ob und wie SWU das will, ist offen. Das NBS-Flag `boarding` ist vorbereitet; `STU_PRESTIGE.BOARDING_*` existiert.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Spacecraft/Action/BoardShip`, `Module/Spacecraft/Lib/CloseCombat/{BoardShipUtil,CloseCombatUtil}.php`
- `Component/Spacecraft/System/Type/TroopQuartersShipSystem.php`

## SWU-Pfade

- `apps/backend/src/modules/combat/combat.service.ts`, `apps/backend/src/modules/spacecraft/spacecraft-crew.service.ts`
- `apps/backend/src/modules/prestige/prestige.constants.ts` (`BOARDING_BASE_LOSS`, `BOARDING_MODULE_LEVEL_LOSS`)
- `packages/shared/src/lib/spacecraft/index.ts` (NBS `boarding`)

## Akzeptanzkriterien

- [ ] Entern gegen jedes fremde Schiff unabhängig von Haltung und Fraktion; Truppenkampf nach STU-Formel (`CloseCombatUtil`), Folgen wie STU (Systemschaden, Crewverluste, Prestige `BOARDING_*`).
- [ ] Interaktions-Checks (Ziel ungeschildet, kein Urlauber, kein NPC, Truppenquartiere vorhanden).
- [ ] Backend-Tests für Sieg/Niederlage und Ziel derselben Fraktion, Frontend-Test NBS-Aktion.
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Entscheidung

Vorgabe: Variante (a), wie STU. Entern gegen jedes fremde ungeschildete Schiff, unabhängig von Haltung und Fraktion; ausgenommen Urlauber und NPCs. Truppenkampf und Folgen nach STU.

## Comments

- 2026-10-21 Product Owner: Option a – Entern ist wie in STU gegen jedes fremde ungeschildete Schiff (außer Urlauber) spielbar, auch innerhalb der eigenen Fraktion.
