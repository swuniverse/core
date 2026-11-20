# Kampf-Parteibildung wie STU (Flotte über Führer, angedockte Station verteidigt mit)

**Status:** resolved
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

- [x] Eine gemeinsame Parteibildung (z. B. `buildAttackingParty`/`buildAttackedParty`) wird von manuellem Angriff, Alarmreaktion und ThreatReaction (sc-AUD-09) genutzt. (ThreatReaction-Teil → Kriterium in [sc-AUD-09](sc-AUD-09-threatreaction-vor-traktor-und-entern.md))
- [x] Angreifende Flotte nur über den Führer; einfache Mitglieder greifen allein an.
- [x] Verteidiger sind Ziel bzw. ungetarnte Flottenmitglieder plus die Station, an der sie angedockt sind; die SWU-Mitverteidiger-Regel (alle alarmierten Schiffe des Eigners am Feld) entfällt.
- [x] Backend-Tests: Mitglied vs. Führer greift an, angedocktes Ziel mit verteidigender Station, getarnte Flottenmitglieder nicht dabei, fremde alarmierte Schiffe desselben Eigners nicht dabei.

## Herkunft

- Audit 2026-11-17: [README.md](../audit-2026-11-17/README.md) Abschnitt H („B3 Kampf“: Mitverteidiger-Regel ohne STU-Grundlage); [spacecraft.md](../audit-2026-11-17/spacecraft.md) große Abweichung 7, „Parteibildung beim manuellen Angriff“.
- Ersetzt die Mitverteidiger-Regel aus [sc-WP-COMBAT-2](sc-WP-COMBAT-2-mehrparteienkampf.md) (resolved; `map.md`-Eintrag „Mehrparteienkampf für Flotten und alarmierte Mitverteidiger“). PO-Linie „wie STU“ vom 2026-11-17.

## Comments

### 2026-11-19 – umgesetzt, Prüfung ausstehend

Commit: `fix(combat): form battle parties like STU (sc-AUD-07b)`.

- Neues `combat/battle-parties.ts`: `attackingParty` (STU `AttackingBattleParty`: ganze Flotte nur, wenn der Angreifer laut `Fleet.leaderId` Führer ist, sonst Einzelschiff) und `attackedParty` (STU `AttackedBattleParty`: Ziel plus ungetarnte Flottenmitglieder plus Stationen, an denen sie angedockt sind; NPC-Stationen ausgenommen). Das Ziel zählt immer als ungetarnt, weil der akzeptierte Angriff es enttarnt; der STU-Sonderfall „alle getarnt → ganze Flotte“ entfällt dadurch.
- `CombatService.attack` nutzt beide Funktionen; die Mitverteidiger-Regel (alle gelben/roten Schiffe des Eigners) ist entfernt. `combatLocationRelations` lädt dafür `user` und `fleet`.
- `AlertReactionService` bildet die alarmierte Partei über `attackingParty`; ein zerstörter Kandidat überspringt jetzt (`continue`) statt die ganze Reaktion abzubrechen (`break`). ThreatReaction existiert noch nicht; sc-AUD-09 soll dieselben Funktionen verwenden (Kriterium 1 daher noch offen).
- Kills einer mitverteidigenden Station eines anderen Eigners werden weiterhin dem `defenderUserId` (Zieleigner) gutgeschrieben – Resolver-Vertrag unverändert.

**Sofort geprüft:** `jest src/modules/combat src/modules/alert-reaction` 111/111 grün (neu: Führer vs. Mitglied, getarnte Flottenmitglieder und fremde alarmierte Schiffe nicht dabei, angedockte Station verteidigt, NPC-Station nicht). ESLint auf geänderten Dateien 0 Fehler. `nx typecheck backend` scheitert nur an fremden, nicht committeten sh-AUD-07b-Dateien (`colony-tick.spec.ts`, `minute-shipyard.spec.ts`).

**Ausstehend:** PostgreSQL-Integration (`alert-reaction.int-spec.ts`, Kampf-Int-Specs), `nx typecheck backend` nach Abschluss von sh-AUD-07b, Review gegen STU, Kriterium 1 mit sc-AUD-09.

Modell: Opus 5.5 direkt (Spielregel; kein Sol/Luna in dieser Sitzung verfügbar), keine Delegation.
- 2026-11-20 – **resolved nach Verifikation.** Kriterium 1: manueller Angriff und Alarmreaktion nutzen `combat/battle-parties.ts`; der ThreatReaction-Teil ist als Kriterium in sc-AUD-09 übernommen (sc-AUD-09 ist von diesem Ticket blockiert). Folgepunkt [sc-AUD-07c](sc-AUD-07c-alarmreaktion-flotte-nach-alarmstufe.md): STU `AlertStateBattleParty` filtert Flottenmitglieder zusätzlich nach Alarmstufe ≥ Führer; SWU nimmt alle nicht verborgenen Mitglieder (bestehendes Verhalten). Gesammelter Verifikationslauf 2026-11-20 (Claude Opus 5.5, Sol nicht verfügbar): Diff-Review gegen die Akzeptanzkriterien; `npm run lint` 0 Fehler, `npm run typecheck` grün, `npm run test` grün (Backend 2700/2700, Frontend 972/972), PostgreSQL-Integrationssuite inkl. aller Migrationen 1058/1062 – die 4 Fehler lagen in zwei veralteten Test-Fixtures (`profile-friends.int-spec.ts`: `shipRepo`-Mock ohne `manager` seit sc-AUD-13; `layer-access-http.int-spec.ts`: `MAP_EDITOR` nur im JWT, seit col-AUD-16a liest `JwtStrategy` Rechte aus der DB), korrigiert und erneut 54/54 grün. Browserprüfungen entfallen laut Nutzerentscheid vom 2026-11-20.
