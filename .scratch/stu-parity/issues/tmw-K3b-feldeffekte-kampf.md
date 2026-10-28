# Feldeffekte, Teil 2b: Kampf (Treffer-/Ausweichstörung, Energiewaffen ±)

**Status:** claimed
**Priority:** P2
**Size:** S
**Blocked by:** tmw-K1a

## Ziel

Felder beeinflussen den Kampf wie in STU. `HIT_CHANCE_INTERFERENCE` am Ort des Angreifers senkt dessen Trefferchance auf 15–60 %. `EVADE_CHANCE_INTERFERENCE` am Ort des Verteidigers senkt dessen Ausweichchance um 40–85 %. `ENERGY_WEAPON_BUFF` bzw. `ENERGY_WEAPON_NERF` skalieren den Energiewaffenschaden auf 115–170 % bzw. 30–85 %.

## STU-Quellen

- `src/Module/Spacecraft/Lib/Battle/Weapon/AbstractWeaponPhase.php` (Z. ~75: `ceil(hitChance/100 * rand(15,60,true,30))`; Z. ~88: `evade - |evade/100 * rand(40,85,true,30)|`)
- `src/Module/Spacecraft/Lib/Battle/Provider/AbstractEnergyAttacker.php#getWeaponDamage` (Buff `rand(115,170,true,125)`, Nerf `rand(30,85,true,75)`)

## SWU-Pfade

- `apps/backend/src/modules/combat/combat.engine.ts` (`calculateHitChance` ~Z. 476, Schaden ~Z. 226–270)
- `apps/backend/src/modules/combat/combat.service.ts` (Ort der Teilnehmer ermitteln), `combat-report.formatter.ts`
- Effekt-Katalog aus tmw-K1a

## Akzeptanzkriterien

- [ ] Die Kampf-Engine erhält je Teilnehmer die aktiven Feldeffekte seines Ortes (ohne zusätzliche N+1-Abfragen).
- [ ] Die vier Effekte wirken nach den STU-Formeln. Torpedos sind von Buff/Nerf nicht betroffen.
- [ ] Der Kampfbericht nennt einmalig den wirksamen Feldeffekt („Beeinträchtigung der Zielerfassung durch <Feldtyp>“).
- [ ] Backend-Tests mit deterministischem Zufall: Treffer- und Ausweichchance, Energie- vs. Torpedoschaden, keine Wirkung ohne Effekt.

## Comments
