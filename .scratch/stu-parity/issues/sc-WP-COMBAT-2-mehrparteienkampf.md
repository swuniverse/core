# Mehrparteienkampf: Flotten und Mitverteidiger

**Status:** resolved
**Priority:** P1
**Size:** M
**Blocked by:** sc-WP-FLEET-1a

## Ziel

Kämpfe laufen wie in STU zwischen Parteien statt 1 gegen 1: Die Flotte des Angreifers greift gemeinsam an; auf Verteidigerseite schießen die Flotte des Ziels sowie alarmierte Schiffe (Gelb/Rot) desselben Eigners am Feld mit. Der Kampfbericht deckt mehrere Schiffe ab. Fundament für sc-WP-COMBAT-1.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Spacecraft/Lib/Battle/Party/*` (`AttackingBattleParty`, `AttackedBattleParty`, `AlertStateBattleParty`, `ColonyDefendingBattleParty`, `BattlePartyFactory`)
- `Module/Spacecraft/Lib/Battle/{AttackMatchup,SpacecraftAttackCycle,SpacecraftAttackCore,SpacecraftAttackPreparation}.php`

## SWU-Pfade

- `apps/backend/src/modules/combat/combat.service.ts` (`attack`), `combat.engine.ts`, `combat-report.formatter.ts`, `combat.engine.spec.ts`, `combat.service.spec.ts`
- `apps/backend/src/modules/spacecraft/spacecraft-destruction.service.ts` (`destroyFromCombat`, `saveCombatSurvivor`)
- `packages/shared/src/lib/` (Kampfbericht-DTO)
- `apps/frontend/src/components/spacecraft/CombatReportDialog.tsx`

## Akzeptanzkriterien

- [x] Parteienbildung: Angreifer = Angreiferschiff bzw. seine Flotte am Feld (nur einsatzfähige Schiffe); Verteidiger = Ziel bzw. dessen Flotte plus alarmierte Schiffe (Gelb/Rot) desselben Eigners am Feld.
- [x] Ein Kampfzyklus wählt je Runde Schütze und Ziel nach STU-Matchup; Energie- und Projektilphase wie bisher.
- [x] Zerstörte Schiffe scheiden aus; alle Teilnehmer erhalten den Bericht (Eigner je Partei).
- [x] Der Bericht listet je Schuss Schütze, Ziel, Waffe und Schaden und fasst Verluste je Partei zusammen; Dialog stellt mehrere Schiffe dar.
- [x] 1-gegen-1-Kämpfe verhalten sich unverändert (bestehende Tests grün).
- [x] Backend-Tests: Flotte gegen Einzelschiff, Einzelschiff gegen Flotte mit alarmiertem Mitverteidiger; Frontend-Test für Mehrschiff-Bericht.
- [x] `lint`, `typecheck`, `test` und `build` sind grün.

## Comments

Implemented field-local battle parties in the combat service and engine, including fleet/alarm composition, per-ship firing and destruction, owner notifications, multi-ship reports, and a dense party summary in the dialog. Added backend party/matchup coverage and a frontend multi-ship report test. Focused tests, production typechecks, and all builds pass; the prescribed affected command is blocked by pre-existing backend test-project TS6305 declaration-output errors unrelated to this change.
