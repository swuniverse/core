# Flotten-Flugfolgen und Regressionstests absichern

**Status:** ready-for-agent
**Priority:** P2
**Size:** S
**Blocked by:** —

## Ziel

Die ursprünglich gemeldete Beschränkung auf das führende Schiff ist in der aktuellen Baseline behoben: `applyFieldConsequences` verarbeitet alle bewegten Mitglieder beim Galaxie-/Systemflug sowie beim Systemein- und -austritt. Jetzt sind die veraltete PostgreSQL-Testfixture und die fehlende kombinierte Flotten-/Ionensturm-Abdeckung zu schließen. STU verarbeitet Folgen je aktivem Mitglied und fliegt mit Überlebenden weiter; die neuere Flottennachfolge aus `sc-WP-FLEET-4` ist maßgeblich.

## STU-Quellen

- `src/Module/Spacecraft/Lib/Movement/ShipMover.php` (Konsequenzen je bewegtem Schiff)
- `src/Module/Spacecraft/Lib/Movement/Component/Consequence/`

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/spacecraft.service.ts` (`navigate`, `flyGalaxy`, `enterSystem`, `leaveSystem`, Ankunft in `processMovement`)
- `apps/backend/src/modules/spacecraft/flight-consequence-pipeline.ts`

## Akzeptanzkriterien

- [ ] Jede Feldtransition ruft die Pipeline für jedes bewegte Schiff der Flotte einmal auf; das führende Schiff wird nicht doppelt verarbeitet.
- [ ] Ein durch eine Folge zerstörtes Flottenmitglied wird weder weiterbewegt noch erneut gespeichert; die übrige Flotte fliegt konsistent weiter bzw. stoppt nach den Regeln aus `sc-WP-COMBAT-1a`.
- [ ] Backend-Tests: Feldeffekt und Ionensturm-Einflug treffen jedes Flottenmitglied genau einmal je Feld.

## Triage und konkreter Restauftrag

- Implementierungsbelege: `spacecraft.service.ts` (`navigate`, `flyGalaxy`, `enterSystem`, `leaveSystem`, `applyFieldConsequences`, `refreshMovementParticipants`), `field-transition-executor.ts`; Commits `346aeb89`, `88b7fbdd`, `9a5ed1e2`.
- `movement-concurrency.int-spec.ts` enthält bereits den Mehrschiff-Deflektortest und das Weiterfliegen nach Mitgliederverlust. `ion-storm-effects.int-spec.ts` prüft Einflugschaden/Zerstörung bisher nur am einzelnen Schiff. Ein grüner kombinierter Nachweis für alle vier normalen Flugpfade fehlt.
- Zuerst `movementService` in `movement-concurrency.int-spec.ts` aktualisieren: der automatisch aus `design:paramtypes` erzeugte `{}`-Stub für `LastCombatReportService` hat keine `has`-Methode. Den echten Dienst mit Repository oder einen ausdrücklich typisierten Stub einbinden. Kein Produktions-Optional-Chaining zur Kaschierung einer defekten Fixture und keine gelöschten Tests. Aufräumen kontrollierter Subscriber/Transaktionen auch bei fehlgeschlagenen Assertions absichern.
- Danach parametrisiert echte Feldfolge und Anomalie-Einflug für Flotten beim System-/Galaxieflug, Eintritt und Austritt prüfen: jede Teilnehmer-ID exakt einmal je betretenem Feld, gespeicherter Schaden, keine Doppelbearbeitung des Leaders. Bei Zerstörung keine erneute Speicherung/Weiterbewegung, Nachfolge und Überlebende entsprechend `sc-WP-FLEET-4`.
- Wurmloch und Navicomputer-Sprung nutzen schon Teilnehmer-Schleifen; kein zweiter Bewegungsexecutor, kein Wiederaufbau des entfernten `processMovement`-Warp-Pfads. Falls die neuen Tests eine echte Lücke zeigen, minimal im gemeinsamen Pfad beheben.

## Zusätzliche Akzeptanzkriterien

- [ ] Die vollständige Suite `movement-concurrency` läuft nach Fixture-Korrektur grün, einschließlich der bisherigen Konflikt-/Rollbackfälle.
- [ ] Ein kombinierter Ionensturm-/Flottentest zeigt Schaden und Zerstörungsabbruch, nicht nur Aufrufzahlen eines Pipeline-Mocks.
- [ ] Kein Produktionscode-Umbau für bereits erfüllte Kriterien; Prüfbelege und gegebenenfalls minimaler Fix werden dokumentiert.

## Comments

- 2026-11-12: Bei der Umsetzung von `tmw-K10b2` gefunden. Bitte die STU-Semantik in `ShipMover` bei der Triage gegenprüfen und die Abgrenzung zu `sc-WP-COMBAT-1a` festlegen.

- 2026-11-16 – Triage: Kein erneuter Feature-Neubau nötig. Codeverhalten weitgehend vorhanden, Ticket bleibt wegen Testfixture und fehlender kombinierter Abdeckung offen. 34 Unit-Tests grün; breiter PostgreSQL-Lauf rot, isolierte Nachfolge-/Ionensturm-Suiten grün. Siehe [Audit](../triage-2026-11-16.md).
