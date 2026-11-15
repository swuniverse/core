# Kartographie-Zielmodell und Regionsentdeckung

**Status:** resolved
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

- [x] Ein Kartographieplan besitzt einen Zieltyp `SYSTEM | REGION` und genau eine passende Zielreferenz; Datenbank-Constraint und Servicevalidierung verhindern kein oder mehrere Ziele.
- [x] Bestehende Pläne werden idempotent als `SYSTEM` migriert und behalten Ziel, Messpunkte, Status, Finalisierung und Eindeutigkeit unverändert.
- [x] Repository-, Service- und DTO-Verträge verwenden einen typisierten Zielvertrag statt einer impliziten alleinigen `starSystemId`; bestehende System-API-Antworten bleiben kompatibel, soweit kein bewusst versionierter Vertrag nötig ist.
- [x] Eindeutigkeits- und Sperrregeln verhindern konkurrierende aktive Pläne desselben Spielers für dasselbe typisierte Ziel und bewahren bestehende Plan-/Finalisierungsinvarianten.
- [x] Eine Entität `RegionDiscovery` speichert eindeutig Spieler × Region, `discoveredAt` und Herkunft `CARTOGRAPHY`; Migration, Fremdschlüssel und Indizes sind vorhanden.
- [x] Regionsentdeckungen können idempotent und transaktional angelegt beziehungsweise gelesen werden; dieses Issue erzeugt sie noch nicht über eine Spieleraktion.
- [x] Systemkartographie verhält sich nach der Generalisierung unverändert, einschließlich Abschluss, Entdeckung, Prestige, Nachrichten und vorhandener Tests.
- [x] Backend-Tests decken Migration, Exactly-one-Constraint, Eindeutigkeit, typisierte DTOs, idempotente Regionsentdeckung und vollständige Systemregression ab.

## Entscheidung

STU nutzt ein gemeinsames polymorphes Modell. SWU bildet es explizit mit Zieltyp und Exactly-one-Constraint ab, statt einen zweiten parallelen Kartographieablauf anzulegen.

## Comments

- 2026-10-30: Umsetzung nach zwei Prüfversuchen abgebrochen. Die fokussierten Kartographie-/Migrations-/DTO-/Regionsentdeckungs-Tests (30 Tests) und alle Builds sind grün, aber das verpflichtende affected-Test-Gate bleibt wegen zwei fachfremder bestehender Spacecraft-Testfixture-Fehler rot: `spacecraft-core-controls.spec.ts` stellt kein `shipRepo.findOneBy` bereit; `spacecraft-fleet.service.spec.ts` endet in `Not enough EPS for navigation`. Produktcode wurde gemäß Abbruchregel verworfen. Bitte zuerst die Backend-Testfixture-Baseline (`sh-AP-23`) reparieren oder dieses Issue ausdrücklich mit dokumentierter Baseline-Ausnahme erneut freigeben.
- 2026-11-09: Die integrierte Baseline 14b86081/c8e14f1c beseitigt den zuletzt dokumentierten fachfremden Blocker (Spacecraft-Repository- und Flotten-Fixtures); reguläre Nx-Lint-/Typecheck-/Build-Gates und vollständige Tests sind laut Baseline-Review grün, lokale Test-Spieldaten waren dafür vorhanden. Status ready-for-agent; vorhandene Issue-Abhängigkeiten bleiben verbindlich. Dies belegt keine Feature-Fertigstellung: verworfene Änderungen müssen neu umgesetzt und die aktuellen Issue-Tests und Pflicht-Gates erneut ausgeführt werden; keine Ausnahme.
- 2026-11-15: Umgesetzt wie STU `AstronomicalEntry` (`systems_id` oder `region_id`). `cartography_plans` hat `targetType` (`SYSTEM`/`REGION`), `starSystemId` und `mapRegionId`, beide nullable. Ein Check-Constraint erzwingt genau ein passendes Ziel, partielle Unique-Indizes erlauben einen Plan je Spieler und typisiertem Ziel. Bestandspläne werden per Default zu `SYSTEM`, die Migration ist idempotent. Der Service arbeitet mit dem typisierten Vertrag `CartographyTarget` (`systemTarget`/`regionTarget`) und weist ungültige Ziele ab. `CartographyPlanDto` ergänzt `targetType`/`mapRegionId`, `starSystemId` bleibt kompatibel. Die System-Finalisierung lässt Regionspläne unangetastet; deren Abschluss folgt in tmw-K8b2. `RegionDiscovery` (`region_discoveries`, eindeutig je Spieler × Region, `discoveredAt`, Herkunft `CARTOGRAPHY`, FKs mit Cascade) samt `RegionDiscoveryService.record/has/list`: idempotent, optional im Transaktionsmanager. Es gibt noch keine Spieleraktion dafür. Tests: Unit (Validierung, Regionsplan, Finalisierungsabgrenzung) und PostgreSQL (Exactly-one, Eindeutigkeit, idempotente Migration, Regionsentdeckung inklusive Rollback); die Systemkartographie-Tests sind unverändert grün.
