# ThreatReaction vor Traktor und Entern, NPC-Ausschluss beim Traktor wie STU

**Status:** claimed
**Priority:** P1
**Size:** M
**Blocked by:** sc-AUD-07a, sc-AUD-07b

## Ziel

In SWU sind Traktor und Entern gegen alarmierte Schiffe risikolos: `spacecraft-tractor.service.ts` und `spacecraft-boarding.service.ts` kennen weder Alarmstufe noch Battle-Resolver. In STU ruft der Verursacher vor dem Traktor bzw. Entern `ThreatReaction::reactToThreat` auf. Steht das Ziel nicht auf Grün und ist es kein Freund, feuert die Partei des Ziels einen Einweg-Kampf auf den Verursacher. Erst danach wird beim Traktor auf aktive Schilde geprüft. Außerdem schließt SWU NPC-Schiffe vom Traktor aus; STU prüft beim Traktor kein NPC.

## STU-Quellen

- `src/Module/Spacecraft/Lib/Interaction/ThreatReaction.php` (Z. ~24–74)
- `src/Module/Spacecraft/Action/ActivateTractorBeam/ActivateTractorBeam.php` (Z. ~132–136)
- `src/Module/Spacecraft/Action/BoardShip/BoardShip.php` (Z. ~146–150)
- `src/Module/Spacecraft/Lib/Battle/SpacecraftAttackCauseEnum.php` (`ACTIVATE_TRACTOR`, `BOARD_SHIP`)
- `src/Module/Spacecraft/Lib/Battle/FightLib.php` (Z. ~105–153, `canAttackTarget`)

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/spacecraft-tractor.service.ts` (Z. ~33–34 NPC-Ausschluss)
- `apps/backend/src/modules/spacecraft/spacecraft-boarding.service.ts`
- `apps/backend/src/modules/combat/battle-resolver.service.ts` (Einweg-Ursache aus sc-AUD-07a, Parteibildung aus sc-AUD-07b)
- `apps/frontend/src/components/spacecraft/NearbySensorPanel.tsx` (Anzeige des Ergebnisses)

## Akzeptanzkriterien

- [x] Vor Traktor-Aktivierung und Entern läuft eine ThreatReaction: Steht das Ziel nicht auf Grün, gehört einem anderen Spieler und ist kein Freund, feuert seine Partei (Bildung wie `createAttackingBattleParty` des Ziels) einen Einweg-Kampf auf den Verursacher; Ziel-Eigner erhält eine PM mit Ursache und Kampfverlauf.
- [x] Reihenfolge wie STU: Erst nach der Reaktion wird beim Traktor auf aktive Schilde geprüft; wird der Verursacher zerstört oder handlungsunfähig, bricht die Aktion ab.
- [x] Der NPC-Ausschluss beim Traktor entfällt (STU prüft kein NPC); Urlaubsschutz und übrige STU-Prüfungen bleiben.
- [x] Die ThreatReaction bildet ihre Parteien über `attackingParty`/`attackedParty` aus `combat/battle-parties.ts` (übernommen aus sc-AUD-07b, Kriterium 1).
- [x] Die Antwort an den Client enthält den Kampfbericht bzw. -hinweis; das UI zeigt ihn an.
- [x] Backend-Tests: alarmiertes Ziel feuert vor Traktor und vor Entern, grünes Ziel und Freund feuern nicht, Verursacher zerstört bricht ab, NPC-Ziel kann erfasst werden.

## Herkunft

- Audit 2026-11-17: [README.md](../audit-2026-11-17/README.md) Abschnitte H („fehlende ThreatReaction“), K3 und N2 („Traktor ohne NPC“); [spacecraft.md](../audit-2026-11-17/spacecraft.md) große Abweichung 10.
- PO-Entscheidung K3 vom 2026-11-17: Haltungsunabhängigkeit bleibt (= STU), ThreatReaction und NPC-Angleichung als Ticket. Ersetzt in `map.md` den Teil „außer … NPC“ der Entscheidung sc-WP-TRACT-1b (2026-10-21, Option a) und den Ergebniseintrag „Nicht-NPC-Schiffe“; betrifft [sc-WP-TRACT-1b](sc-WP-TRACT-1b-traktor-auf-fremde-schiffe.md) und [sc-WP-CREW-4a](sc-WP-CREW-4a-enterkommando.md).

## Comments

- 2026-11-23 – **umgesetzt, Prüfung ausstehend.** Commit „feat(spacecraft): threat reaction before tractor and boarding (stu-parity sc-AUD-09)“. Neuer Port `spacecraft/threat-reaction.port.ts` (`THREAT_REACTIONS`, Muster wie `MOVEMENT_REACTIONS`); Implementierung `alert-reaction/threat-reaction.service.ts` (Ziel nicht Grün, fremd, kein Freund → `attackingParty` des Ziels feuert Einweg-Kampf `ACTIVATE_TRACTOR`/`BOARD_SHIP` auf den Verursacher allein, PM „Bedrohungsreaktion“ mit STU-Ursachentext und Kampfverlauf an den Ziel-Eigner; ohne Kampfzeilen kein Bericht wie STU `isEmpty`). Traktor/Entern: Vorprüfung in eigener Transaktion → Reaktion → vollständige Prüfung in der Schreibtransaktion; Zielschilde beim Traktor erst danach. Abbruch nach erfolgter Reaktion (Verursacher/Ziel zerstört, Traktorstrahl zerstört, Schilde aktiv …) liefert statt Fehler `{ message, threatReport }` bzw. Enter-`outcome: 'ABORTED'` ohne Prestigekosten. NPC-Ausschluss beim Traktor entfernt (Service und Nearby-Aktion `actions.tractor`), Entern behält ihn. UI: `NearbySensorPanel` zeigt Meldung und öffnet `CombatReportDialog` mit `threatReport`. Abweichung zu Kriterium 4: Die Verursacherseite ist wie STU (`createSingletonBattleParty`) nur das Schiff selbst, nicht `attackedParty`. Checks: Jest `alert-reaction` + `combat` + Traktor/Entern 147/147, Vitest `NearbySensorPanel` 25/25, `nx typecheck` backend/frontend/shared grün, ESLint ohne neue Warnungen. **Ausstehend:** gesammelter Verifikationslauf (Lint/Typecheck/Unit gesamt, PostgreSQL-Integration, Diff-Review gegen STU). Modell: Opus 5.5 direkt (kein Sol/Luna verfügbar), keine Delegation.
