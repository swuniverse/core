# Forschungsbelohnung: Abschlussintegration und Nachricht

**Status:** resolved
**Priority:** P2
**Size:** S
**Blocked by:** col-D2a1, col-D2a2, col-D2a3

## Ziel

Der Forschungsabschluss stößt die idempotente Schiffvergabe an und meldet eine erfolgreiche Vergabe genau einmal im Nachrichtenordner „Schiffe“.

## STU-Quellen

- `src/Module/Research/ResearchState.php::finish`
- `src/Module/Research/ResearchState.php::createRewardShip`

## SWU-Pfade

- `apps/backend/src/modules/research/research.service.ts`
- `apps/backend/src/modules/messaging/messaging.service.ts` (`MessageFolder.SHIP`)
- `apps/backend/src/modules/spacecraft/`

## Akzeptanzkriterien

- [x] Der Abschluss-Hook ruft die Belohnungsvergabe nur bei explizitem Mapping auf.
- [x] Bei erfolgreicher Vergabe erhält der Spieler genau eine Nachricht im Ordner „Schiffe“: „Als Belohnung für den Abschluss der Forschung wurde dir ein Schiff vom Typ <Schiffsklasse> überstellt“.
- [x] Ohne Mapping oder ohne Kolonie entsteht weder Schiff noch Erfolgsmeldung.
- [x] Wiederholte Abschlussverarbeitung erzeugt weder ein zweites Schiff noch eine zweite Nachricht.
- [x] Integrationstests decken Erfolg, fehlendes Mapping, fehlende Kolonie und Wiederholung ab.

## Entscheidung

Schiffvergabe, Grant-Abschluss und Erfolgsmeldung bilden den idempotenten Abschlussablauf; produktive Reward-Mappings bleiben bis zu einer gesonderten Freigabe leer.

## Comments

`ResearchService.notifyCompletion` ruft nach der Abschlussmeldung `grantShipReward` auf (nur bei `tech.shipReward`); der Granter wird von `SpacecraftModule.onModuleInit` registriert (`registerShipRewardGranter`), um einen Modulzyklus zu vermeiden. Bei `granted` genau eine Nachricht im Ordner SHIP (deliveryKey `research-reward-ship:<user>:<tech>`); Fehler werden geloggt und blockieren den Abschluss nicht. `ResearchRewardShipResult.granted` trägt nun `shipClassName`. Tests in `research.service.spec.ts`. Offen: Wiederholung nach `no-colony` (Grant bleibt RESERVED) wird erst bei erneutem Abschluss-Hook aufgenommen; es gibt keinen Retry-Auslöser — bei Bedarf eigenes Issue. Produktive Mappings bleiben leer.
