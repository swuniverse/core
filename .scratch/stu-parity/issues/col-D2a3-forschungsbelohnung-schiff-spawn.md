# Forschungsbelohnung: transaktionaler Schiff-Spawn

**Status:** claimed
**Priority:** P2
**Size:** M
**Blocked by:** col-D2a1, col-D2a2

## Ziel

Ein eigener Dienst erzeugt aus einem reservierten Grant genau ein vollständig konfiguriertes Belohnungsschiff im Orbit der ältesten Kolonie des Spielers.

## STU-Quellen

- `src/Module/Research/ResearchState.php::createRewardShip` (erste Kolonie, `maxOutSystems`, `createCrew`)
- STU-Bauplan aus `reward_buildplan_id`

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/spacecraft.service.ts` (`adminSpawnShip` als Vorlage)
- `apps/backend/src/modules/crew/`
- `apps/backend/src/modules/research/`

## Akzeptanzkriterien

- [ ] Der Dienst verarbeitet ein vollständiges Reward-Mapping aus `shipClassKey` und `moduleSelections`.
- [ ] Das Schiff gehört dem Spieler und entsteht im Orbit seiner ältesten Kolonie, mit Crew und vollständig gefüllten Systemen.
- [ ] Ohne Kolonie entsteht kein Schiff; der Grant bleibt in einem eindeutig wiederaufnehmbaren Zustand.
- [ ] Schiff, Module, Crew und Grant-Status werden gemeinsam transaktional persistiert.
- [ ] Wiederholung und parallele Aufrufe erzeugen kein zweites Schiff.
- [ ] Backend-Tests verwenden ausschließlich Test-Fixtures und decken Erfolg, fehlende Kolonie, fehlerhafte Konfiguration und Idempotenz ab.

## Entscheidung

Der Spawn verwendet ausschließlich das explizite Datenmapping. Es werden keine Schiffsklasse oder Module aus Forschungsfreischaltungen abgeleitet.
