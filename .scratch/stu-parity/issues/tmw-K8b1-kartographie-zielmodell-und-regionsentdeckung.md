# Kartographie-Zielmodell und Regionsentdeckung

**Status:** claimed
**Priority:** P2
**Size:** M
**Blocked by:** tmw-K8a

## Ziel

Das systemgebundene Kartographiemodell wird ohne Verhaltensänderung bestehender Systempläne auf eindeutig typisierte System- und Regionsziele erweitert. Eine persistente persönliche Regionsentdeckung stellt den Abschlussvertrag für den späteren Regionsablauf und `tmw-D4` bereit.

## STU-Quellen

- `src/Orm/Entity/AstronomicalEntry.php` (`systems_id`, `region_id`)
- `src/Module/Ship/Action/AstroMapping/*`

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/entities/cartography-plan.entity.ts`
- `apps/backend/src/modules/spacecraft/cartography-plan.service.ts`
- Shared-Kartographie-DTOs unter `packages/shared/`
- `apps/backend/src/modules/starmap/entities/map-region.entity.ts`
- `apps/backend/src/database/migrations/`

## Akzeptanzkriterien

- [ ] Ein Kartographieplan besitzt einen Zieltyp `SYSTEM | REGION` und genau eine passende Zielreferenz; Datenbank-Constraint und Servicevalidierung verhindern kein oder mehrere Ziele.
- [ ] Bestehende Pläne werden idempotent als `SYSTEM` migriert und behalten Ziel, Messpunkte, Status, Finalisierung und Eindeutigkeit unverändert.
- [ ] Repository-, Service- und DTO-Verträge verwenden einen typisierten Zielvertrag statt einer impliziten alleinigen `starSystemId`; bestehende System-API-Antworten bleiben kompatibel, soweit kein bewusst versionierter Vertrag nötig ist.
- [ ] Eindeutigkeits- und Sperrregeln verhindern konkurrierende aktive Pläne desselben Spielers für dasselbe typisierte Ziel und bewahren bestehende Plan-/Finalisierungsinvarianten.
- [ ] Eine Entität `RegionDiscovery` speichert eindeutig Spieler × Region, `discoveredAt` und Herkunft `CARTOGRAPHY`; Migration, Fremdschlüssel und Indizes sind vorhanden.
- [ ] Regionsentdeckungen können idempotent und transaktional angelegt beziehungsweise gelesen werden; dieses Issue erzeugt sie noch nicht über eine Spieleraktion.
- [ ] Systemkartographie verhält sich nach der Generalisierung unverändert, einschließlich Abschluss, Entdeckung, Prestige, Nachrichten und vorhandener Tests.
- [ ] Backend-Tests decken Migration, Exactly-one-Constraint, Eindeutigkeit, typisierte DTOs, idempotente Regionsentdeckung und vollständige Systemregression ab.

## Entscheidung

STU nutzt ein gemeinsames polymorphes Modell. SWU bildet es explizit mit Zieltyp und Exactly-one-Constraint ab, statt einen zweiten parallelen Kartographieablauf anzulegen.
