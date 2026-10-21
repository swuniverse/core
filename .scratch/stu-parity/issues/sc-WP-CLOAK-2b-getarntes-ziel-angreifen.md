# Getarntes Ziel angreifen

**Status:** ready-for-agent
**Priority:** P3
**Size:** S
**Blocked by:** sc-WP-CLOAK-2a

## Ziel

Hat ein Tachyon-Scan ein getarntes Schiff am eigenen Feld aufgedeckt, kann der Spieler es wie in STU angreifen; das Ziel wird dadurch enttarnt.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `html/spacecraft/control/control_*.twig` („Getarntes Ziel angreifen“)
- `Module/Spacecraft/Action/AttackSpacecraft`, `Lib/Battle/SpacecraftAttackPreparation.php`

## SWU-Pfade

- `apps/backend/src/modules/combat/combat.service.ts` (`attack`)
- Interaktions-Checks aus sc-WP-ENG-2
- `apps/frontend/src/components/spacecraft/NearbySensorPanel.tsx`

## Akzeptanzkriterien

- [ ] Getarnte Ziele am Feld sind nach frischem Tachyon-Scan angreifbar, sonst nicht (Backend-Ablehnung).
- [ ] Angriff enttarnt das Ziel.
- [ ] NBS-Liste zeigt aufgedeckte getarnte Kontakte mit Angriffsaktion.
- [ ] Backend- und Frontend-Tests.
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Comments
