# Wurmlochpassage: atomare Flotten- und Ankunftsintegration

**Status:** ready-for-agent
**Priority:** P2
**Size:** M
**Blocked by:** tmw-K7a1

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
- [ ] Zielfeld-Pipeline, lokale Erkundung und bei gesetzter Ebenenkenntnis-Integration `tmw-K5c` werden in derselben erfolgreichen Operation ausgeführt.
- [ ] Bewegungs-/Signaturdaten und Schiffslog beziehungsweise Ereignis „Wurmloch durchflogen“ werden konsistent geschrieben; fehlgeschlagene Passage hinterlässt keine Teilmutation oder Erfolgsmeldung.
- [ ] Ressourcen für eine nötige Sublight-Aktivierung werden je Schiff atomar geprüft und abgezogen; keine zusätzlichen Flug-/Warp-Kosten.
- [ ] Backend-Integrationstests prüfen erfolgreiche Flotte, ein ungültiges Flottenmitglied, Rollback, Ankunftsfolgen und genau-einmal-Schreibvorgänge.

## Entscheidung

Flottenpassagen sind vollständig vorab und atomar zu validieren; STU-Teilresultate werden nicht übernommen. Erfolgreiche Passage führt Zielfeldfolgen, Erkundung, Ebenenkenntnis, Signatur und Log innerhalb derselben Operation aus.

## Comments

- 2026-11-06: Aus `tmw-K7a` als zweiter geordneter Teilauftrag extrahiert; blockiert durch `tmw-K7a1`.
