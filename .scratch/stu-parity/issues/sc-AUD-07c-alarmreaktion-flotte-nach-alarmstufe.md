# Alarmreaktion: Flottenmitglieder nur ab Alarmstufe des Führers und ohne Hyperraum

**Status:** ready-for-agent
**Priority:** P2
**Size:** S
**Blocked by:** —

## Ziel

Reagiert eine alarmierte Flotte auf ein einfliegendes Schiff, nimmt SWU alle einsatzbereiten, nicht verborgenen Flottenmitglieder am Feld mit (`attackingParty` in `combat/battle-parties.ts`). Ihre Alarmstufe und ob sie im Hyperraum sind, spielt dabei keine Rolle. STU (`AlertStateBattleParty::initMembers`) nimmt nur Mitglieder mit, die nicht getarnt und nicht im Hyperraum sind und deren Alarmstufe mindestens der des Führers entspricht. Ein grünes Mitglied bleibt also außen vor, und bei Führer auf Rot kämpft ein gelbes Mitglied nicht mit.

## STU-Quellen

- `src/Module/Spacecraft/Lib/Battle/Party/AlertStateBattleParty.php` (`initMembers`: `!isCloaked() && !isWarped() && getAlertState()->isAtLeast($this->leaderAlertState)`)

## SWU-Pfade

- `apps/backend/src/modules/alert-reaction/alert-reaction.service.ts` (Parteibildung je Kandidat, Z. ~140–147; `foreign` filtert bereits Getarnte über `isHiddenFromViewer`)
- `apps/backend/src/modules/combat/battle-parties.ts` (`attackingParty` wird auch vom manuellen Angriff genutzt, dort gilt die Alarmstufen-Regel nicht)

## Akzeptanzkriterien

- [ ] Bei der Alarmreaktion kämpft ein Flottenmitglied nur mit, wenn seine Alarmstufe mindestens der des Führers entspricht (Gelb < Rot) und es nicht im Hyperraum ist. Der Führer selbst bleibt immer dabei.
- [ ] Der manuelle Angriff (`CombatService.attack`) bleibt unverändert.
- [ ] Backend-Tests: Führer Rot mit gelbem und rotem Mitglied → nur das rote kämpft mit; Führer Gelb → beide; grünes Mitglied nie; Mitglied im Hyperraum nicht.

## Herkunft

- Verifikationslauf 2026-11-20 zu [sc-AUD-07b](sc-AUD-07b-kampf-parteibildung-wie-stu.md): Abweichung beim Review gefunden. Die Mitglieder ohne Alarmstufenfilter sind älteres Verhalten und keine Folge von sc-AUD-07b.

## Comments
