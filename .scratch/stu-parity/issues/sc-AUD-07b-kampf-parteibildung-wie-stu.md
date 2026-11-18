# Kampf-Parteibildung wie STU (Flotte über Führer, angedockte Station verteidigt mit)

**Status:** ready-for-agent
**Priority:** P1
**Size:** S
**Blocked by:** sc-AUD-07a

## Ziel

SWU nimmt beim manuellen Angriff die ganze Flotte mit, auch wenn ein einfaches Mitglied angreift. Auf Verteidigerseite kommen alle gelben oder roten Schiffe des Zieleigners am Feld dazu (Mitverteidiger-Regel aus sc-WP-COMBAT-2); die Station, an der das Ziel angedockt ist, verteidigt dagegen nicht mit.

STU bildet die Parteien so:
- Angreifer: die ganze Flotte nur, wenn der Angreifer Flottenführer ist, sonst nur das Schiff.
- Verteidiger: das Ziel bzw. seine ungetarnten Flottenmitglieder plus die Station, an der sie angedockt sind.
- Andere alarmierte Schiffe desselben Eigners verteidigen nicht mit.

## STU-Quellen

- `src/Module/Spacecraft/Lib/Battle/Party/AttackingBattleParty.php` (Z. ~35–41)
- `src/Module/Spacecraft/Lib/Battle/Party/AttackedBattleParty.php` (Z. ~28–71)
- `src/Module/Spacecraft/Action/AttackSpacecraft/AttackSpacecraft.php`

## SWU-Pfade

- `apps/backend/src/modules/combat/combat.service.ts` (Z. ~99–200, Parteibildung Z. ~160–174)
- `apps/backend/src/modules/alert-reaction/alert-reaction.service.ts` (Kandidaten Einzelschiff/Flottenführer; prüfen, dass Parteien dieselbe Bildung nutzen)
- `apps/backend/src/modules/combat/battle-resolver.service.ts`

## Akzeptanzkriterien

- [ ] Eine gemeinsame Parteibildung (z. B. `buildAttackingParty`/`buildAttackedParty`) wird von manuellem Angriff, Alarmreaktion und ThreatReaction (sc-AUD-09) genutzt.
- [ ] Angreifende Flotte nur über den Führer; einfache Mitglieder greifen allein an.
- [ ] Verteidiger sind Ziel bzw. ungetarnte Flottenmitglieder plus die Station, an der sie angedockt sind; die SWU-Mitverteidiger-Regel (alle alarmierten Schiffe des Eigners am Feld) entfällt.
- [ ] Backend-Tests: Mitglied vs. Führer greift an, angedocktes Ziel mit verteidigender Station, getarnte Flottenmitglieder nicht dabei, fremde alarmierte Schiffe desselben Eigners nicht dabei.

## Herkunft

- Audit 2026-11-17: [README.md](../audit-2026-11-17/README.md) Abschnitt H („B3 Kampf“: Mitverteidiger-Regel ohne STU-Grundlage); [spacecraft.md](../audit-2026-11-17/spacecraft.md) große Abweichung 7, „Parteibildung beim manuellen Angriff“.
- Ersetzt die Mitverteidiger-Regel aus [sc-WP-COMBAT-2](sc-WP-COMBAT-2-mehrparteienkampf.md) (resolved; `map.md`-Eintrag „Mehrparteienkampf für Flotten und alarmierte Mitverteidiger“). PO-Linie „wie STU“ vom 2026-11-17.

## Comments
