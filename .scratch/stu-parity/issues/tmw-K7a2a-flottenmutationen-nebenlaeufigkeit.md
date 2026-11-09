# Flottenmutationen: gemeinsame Nebenläufigkeitsregeln

**Status:** resolved
**Priority:** P2
**Size:** M
**Blocked by:** —

## Ziel

Flottenmitgliedschaft und Führung werden bei gleichzeitigen Positionswechseln auf Grundlage des nach Sperren gültigen Zustands geändert. Ein unterstützter transaktionaler Vertrag stellt einem späteren vollständigen Positionswechsel die autoritative Teilnehmermenge bereit. Dieses Issue implementiert weder eine Wurmlochpassage noch einen Wurmlochendpunkt.

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/spacecraft.service.ts` (Flotte erstellen, beitreten, verlassen, auflösen, Führung ändern und bewegungsbedingte Austritte)
- `apps/backend/src/modules/spacecraft/entities/spacecraft.entity.ts` und bestehende Flottenpersistenz
- Bestehende PostgreSQL-Integrationsinfrastruktur unter `apps/backend/src/testing/integration/`

## Akzeptanzkriterien

- [x] Flottenerstellung, Beitritt, Austritt, Auflösung, Führungswechsel und bewegungsbedingte Austritte verwenden einen gemeinsamen Transaktions- und Sperrordnungsvertrag mit Positionswechseln. Mitgliedschaft, Führung, Eigentum, Zulässigkeit und relevante Positionen werden nach Erwerb der benötigten Sperren autoritativ erneut gelesen und geprüft.
- [x] Ein unterstützter transaktionaler Helper ermöglicht zukünftigen vollständigen Positionswechseln die Auswahl und Sperrung der vollständigen aktuellen Teilnehmermenge. Ein bereits abgeschlossener Beitritt wird dabei berücksichtigt; ein wartender Beitritt nach einem abgeschlossenen Positionswechsel prüft die neue Kolokation und wird bei fehlender Kolokation abgelehnt.
- [x] Gezielte Schreibvorgänge für Mitgliedschaft und Führung stellen keine veralteten Positionen, Ressourcen oder Führungswerte wieder her; angrenzende Flottenspeicherungen überschreiben keine geschützten Führungsfelder mit veralteten Daten.
- [x] Das bestehende partielle Verhalten gewöhnlicher Flüge mit nicht fixierter Flotte bleibt erhalten. Der Helper schreibt keine neue Wurmlochregel vor; keine monolithische Umstrukturierung und kein neuer Endpunkt.
- [x] Tests nutzen die produktiven öffentlichen Flottenoperationen und eine echte, migrationsbasierte, disposable PostgreSQL-Datenbank mit kontrollierten Barrieren: wartender Beitritt nach bestätigter Verlagerung lehnt alte Kolokation ab; vor Verlagerung bestätigter Beitritt erscheint in der autoritativen Teilnehmermenge. Persistierter Zustand wird erneut geladen.
- [x] Tests prüfen relevante Interleavings von Austritt, Auflösung und Führungswechsel, Rollback und deterministische Sperrreihenfolge; keine veraltete Wiederherstellung und keine partielle Mutation nach Fehlern.
- [x] `lint`, `typecheck`, `test` und `build` sind grün.

## Comments

- 2026-11-09: Zwei lokale Berichte bestätigen einen vorhandenen Beitrittswettlauf: Der echte öffentliche `joinFleet` wartete während einer simulierten, gesperrten Verlagerung; nach deren Commit zeigte der erneut geladene PostgreSQL-Zustand den Leiter am neuen und das beigetretene Mitglied am alten Ort in derselben Flotte. Die weitere Sperrreihenfolge und übrigen Operationen sind erforderliche Teilnehmer des gemeinsamen Vertrags, nicht separat nachgewiesene identische Fehler. Keine Implementierung oder abgeschlossene Abnahme wird behauptet.
- 2026-11-09: Implementiert und als lokaler Kandidat getestet auf `agent-tmw-k7a2a`, Basis `940628fa`. `lockFleetParticipants` verlangt eine caller-eigene READ-COMMITTED-Transaktion vor eigenen Schiffssperren: Flotte `FOR NO KEY UPDATE`, danach vollständige aktuelle Mitglieder plus auslösendes Schiff aufsteigend nach ID mit `FOR UPDATE NOWAIT`. Sperrkonflikte oder geänderte Mitgliedschaft führen zum Abbruch statt zu einer weiteren Flottensperre; Wiederholung nur in neuer Transaktion. Nach Sperren werden Eigentum, Mitgliedschaft, Führung sowie die bestehende operationsspezifische Zulässigkeit und Kolokation geprüft. Mitgliedschaft, Führung, Name und Fixierung werden gezielt geschrieben. Bewegungsbedingte Austritte sind gemeinsam atomar; ihre bisherigen Erfolgsnachrichten folgen erst nach Commit. Der Helper wählt die ganze Flotte, gewöhnlicher nicht fixierter Flug behält seine partielle Auswahl einschließlich entfernter Mitglieder.
- 2026-11-09: Maintained PostgreSQL-Regressionssuite mit 22 Fällen: öffentlicher wartender Beitritt zuerst RED (persistierte `fleetId` blieb unerwartet gesetzt), danach GREEN; zusätzliche RED/GREEN-Nachweise für Erstellungs-/Auflösungsrollback, Austritt, Führungswechsel und gewöhnlichen Austrittsrollback. Kontrollierte Verlagerung ist keine Wurmlochimplementierung. Abschließende tatsächlich ausgeführte Kandidatengates: Backend-Lint Exit 0 (0 Fehler, 1424 offengelegte Warnungen), spec-inklusive Typprüfung Exit 0, komplette Backend-Units 211/211 Suites und 1981/1981 Tests ohne Skips, Build Exit 0; gezieltes PostgreSQL 4/4 Suites und 30/30 Tests sowie vollständiges PostgreSQL 37/37 Suites und 312/312 Tests ohne Skips, Exit 0. Pro Integrationslauf bestehender gemeinsamer disposable PostgreSQL-16-Harness mit echten Migrationen und beiden ambienten DB-URLs unset. Nx-Lint/Build ohne Nx-Cache; `tsc --build` kann inkrementellen Compilerzustand verwenden. Logs und Vertrag: `.workmux/tmw-K7a2a-fleet-concurrency-report-20261109.md` (ignorierter lokaler Handoff). `resolved` bezeichnet nur diesen implementierten, verifizierten Kandidaten; unabhängige Review und serielle Integration stehen aus. Keine Umsetzung oder Auflösung von K7a2b, K7a2 oder K7a3.
