# Forschungsbelohnung: transaktionaler Schiff-Spawn

**Status:** resolved
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

- [x] Der Dienst verarbeitet ein vollständiges Reward-Mapping aus `shipClassKey` und `moduleSelections`.
- [x] Das Schiff gehört dem Spieler und entsteht im Orbit seiner ältesten Kolonie, mit Crew und vollständig gefüllten Systemen.
- [x] Ohne Kolonie entsteht kein Schiff; der Grant bleibt in einem eindeutig wiederaufnehmbaren Zustand.
- [x] Schiff, Module, Crew und Grant-Status werden gemeinsam transaktional persistiert.
- [x] Wiederholung und parallele Aufrufe erzeugen kein zweites Schiff.
- [x] Backend-Tests verwenden ausschließlich Test-Fixtures und decken Erfolg, fehlende Kolonie, fehlerhafte Konfiguration und Idempotenz ab.

## Entscheidung

Der Spawn verwendet ausschließlich das explizite Datenmapping. Es werden keine Schiffsklasse oder Module aus Forschungsfreischaltungen abgeleitet.

## Comments

Added `ResearchRewardShipService.grantShipReward(userId, techId)` (`spacecraft/research-reward-ship.service.ts`, provided/exported by `SpacecraftModule`). One transaction: reserve grant → resolve class/modules from the explicit `shipReward` mapping → oldest colony (createdAt, id) → ship in that colony's system-field location with modules, stats, crew, active runtime systems → complete grant. Without colony it returns `no-colony` and commits the RESERVED grant (resumable); invalid config throws and rolls back everything. Idempotency/parallelism rely on the grant row lock. Tests use mocked managers (no DB fixtures). Follow-up: col-D2a4 wires the service into research completion.
