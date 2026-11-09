# Wurmlochpassage: atomare Flotten- und Ankunftsintegration

**Status:** ready-for-agent
**Priority:** P2
**Size:** M
**Blocked by:** tmw-K7a1, tmw-K7a2a, tmw-K7a2b

## Ziel

Integriert Wurmlochpassagen sicher in Flotten- und Ankunftsabläufe: alle betroffenen Schiffe werden vorab atomar validiert, anschließend gemeinsam versetzt und erhalten die notwendigen Zielfeldfolgen. Der Backend-Kern aus `tmw-K7a1` ist Voraussetzung.

## STU-Quellen

- `src/Module/Spacecraft/Action/EnterWormhole/EnterWormhole.php`
- `src/Module/Spacecraft/Lib/Movement/Route/RandomSystemEntry.php`
- `src/Module/Spacecraft/Lib/Movement/Route/FlightRouteFactory.php`

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/spacecraft.service.ts`
- `apps/backend/src/modules/spacecraft/field-transition-executor.ts` und `flight-consequence-pipeline.ts`
- `apps/backend/src/modules/starmap/` (Orts-/Ebenenkenntnis)
- Flotten- und Signaturdienste

## Akzeptanzkriterien

- [ ] Flottenmitglieder werden vor jeder Mutation in einer gemeinsamen Transaktion vollständig geprüft; ein ungültiges Mitglied lehnt die ganze Passage ab. Keine partiellen Ergebnisse.
- [ ] Bei erfolgreicher Passage werden alle Teilnehmer konsistent zum gewählten Ausgangs-/Zielfeld versetzt.
- [ ] Zielfeld-Pipeline, lokale Erkundung, verbindliche Ebenenkenntnis aus `tmw-K5c` und der Abbruch laufender Reparaturen werden in derselben erfolgreichen Operation ausgeführt.
- [ ] Bewegungs-/Signaturdaten und Schiffslog beziehungsweise Ereignis „Wurmloch durchflogen“ werden konsistent geschrieben; fehlgeschlagene Passage hinterlässt keine Teilmutation oder Erfolgsmeldung.
- [ ] Ressourcen für eine nötige Sublight-Aktivierung werden je Schiff atomar geprüft und abgezogen; keine zusätzlichen Flug-/Warp-Kosten.
- [ ] Backend-Integrationstests prüfen erfolgreiche Flotte, ein ungültiges Flottenmitglied, Rollback, Ankunftsfolgen und genau-einmal-Schreibvorgänge.

## Entscheidung

Flottenpassagen sind vollständig vorab und atomar zu validieren; STU-Teilresultate werden nicht übernommen. Erfolgreiche Passage führt Zielfeldfolgen, Erkundung, Ebenenkenntnis, Signatur und Log innerhalb derselben Operation aus.

## Comments

- 2026-11-06: Aus `tmw-K7a` als zweiter geordneter Teilauftrag extrahiert; blockiert durch `tmw-K7a1`.
- 2026-11-09: Zwei vorhandene Nebenläufigkeitsfehler wurden unabhängig bestätigt. Bei einer simulierten gesperrten Verlagerung überschreibt der reale produktive Bewegungsspeicherer nach dem Warten den bestätigten Zustand mit einem alten Snapshot; dies war kein vollständiger `navigate`- oder Wurmlochlauf. Beim realen öffentlichen Flottenbeitritt nach einer simulierten Verlagerung zeigte der erneut geladene PostgreSQL-Zustand Leiter und beigetretenes Mitglied an verschiedenen Orten in derselben Flotte. Keine K7a2-Implementierung oder Abnahme folgt aus den Diagnosen. Zuerst `tmw-K7a2a` für den gemeinsamen Flottenvertrag, danach `tmw-K7a2b` für Bewegungs-Schreibschutz; zusätzlich bleibt `tmw-K7a1` Voraussetzung. `ready-for-agent` bezeichnet den spezifizierten Auftrag, nicht die Auflösung seiner Blocker. Manager-gebundene Ankunftsfolgen und erst nach Commit ausgelöste Benachrichtigungen bleiben Teil von K7a2; sämtliche Akzeptanzkriterien bleiben offen.
