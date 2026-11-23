# Alarmreaktion: Flottenmitglieder nur ab Alarmstufe des Führers und ohne Hyperraum

**Status:** resolved
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

- [x] Bei der Alarmreaktion kämpft ein Flottenmitglied nur mit, wenn seine Alarmstufe mindestens der des Führers entspricht (Gelb < Rot) und es nicht im Hyperraum ist. Der Führer selbst bleibt immer dabei.
- [x] Der manuelle Angriff (`CombatService.attack`) bleibt unverändert.
- [x] Backend-Tests: Führer Rot mit gelbem und rotem Mitglied → nur das rote kämpft mit; Führer Gelb → beide; grünes Mitglied nie; Mitglied im Hyperraum nicht.

## Herkunft

- Verifikationslauf 2026-11-20 zu [sc-AUD-07b](sc-AUD-07b-kampf-parteibildung-wie-stu.md): Abweichung beim Review gefunden. Die Mitglieder ohne Alarmstufenfilter sind älteres Verhalten und keine Folge von sc-AUD-07b.

## Comments

- 2026-11-20 – **umgesetzt, Prüfung ausstehend.** Commit `0a48a73e`: `alert-reaction.service.ts` filtert die Feldliste vor `attackingParty` mit `joinsAlertParty` (Alarmstufe ≥ Führer, nicht WARPDRIVE aktiv im offenen Raum wie STU `isWarped`); der Führer bleibt über `attackingParty` immer dabei. `battle-parties.ts` und `CombatService.attack` unverändert. Bestehender Test „fleet leader only“ erwartete das grüne Mitglied mit – angepasst. Checks: Jest `alert-reaction` + `combat` 113/113, `nx typecheck backend` ohne Fehler außer den bekannten TS6305-dist-Meldungen der Migrationstests, ESLint sauber. **Ausstehend:** gesammelter Verifikationslauf (PostgreSQL-Integration `alert-reaction.int-spec.ts`, Diff-Review gegen STU). Modell: Opus 5.5 direkt (kein Sol/Luna verfügbar), keine Delegation.
- 2026-11-23 – **Prüfung bestanden, resolved.** Gesammelter Verifikationslauf auf `6f7bd48b`: Lint 0 Fehler, `nx typecheck` alle Projekte grün, Unit Backend 2721/2721 und Frontend 978/978, PostgreSQL-Integration 1062/1062. Diff-Review gegen die Akzeptanzkriterien und STU ohne Befund (Vergleich gegen die Alarmstufe des Kandidaten ist korrekt, weil Kandidaten nur Flottenführer oder Einzelschiffe sind; der Führer bleibt über den Fallback in `attackingParty` auch im Hyperraum dabei). Modell: Opus 5.5 direkt.
