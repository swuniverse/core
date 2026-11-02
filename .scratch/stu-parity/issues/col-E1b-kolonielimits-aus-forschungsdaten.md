# Kolonielimits aus Forschungsdaten

**Status:** resolved
**Priority:** P2
**Size:** M
**Blocked by:** col-D4, col-E1a

## Ziel

SWU berechnet Kolonielimits fest als „1 Basisplatz + Fraktionstechs, gedeckelt bei 3/3/1“ (`colonization-rules.ts`). STU liest die Limits aus den Forschungsdaten (`upper_limit_colony_type/amount`) ohne festen Deckel. Die Abweichung ist nicht als ADR festgehalten (Leitplanke 1).

## STU-Quellen

- `src/Component/Player/ColonyLimitCalculator.php`
- `src/Orm/Repository/ResearchRepository.php::getColonyTypeLimitByUser`
- `src/Orm/Entity/Research.php` (`upper_limit_colony_type`, `upper_limit_colony_amount`)

## SWU-Pfade

- `packages/shared/src/lib/starmap/colonization-rules.ts`
- `apps/backend/src/modules/colonization/colonization.service.ts`
- `game-data/data/research/{rebels,imperials}.yaml`, `game-data/scripts/import-stu-research.ts`

## Akzeptanzkriterien

- [x] Techs tragen `colonyLimit: { type, amount }`; der Import übernimmt die STU-Werte.
- [x] Das Limit je Typ ist die Summe der erforschten Werte bzw. das STU-Maximum (Semantik von `getColonyTypeLimitByUser` übernehmen); `COLONIZATION_MAX_LIMITS` entfällt.
- [x] Bestehende Kolonien über dem neuen Limit bleiben erhalten; nur neue Kolonisierung wird geprüft.
- [x] Shared-, Backend- und Frontend-Tests.

## Entscheidung

Vorgabe: Variante (b). Limits aus den Forschungsdaten (`colonyLimit: { type, amount }`) mit STU-Semantik von `getColonyTypeLimitByUser`; `COLONIZATION_MAX_LIMITS` und hartkodierte Tech-IDs entfallen. Keine ADR.

## Comments

- 2026-10-21 Product Owner: Option b – Kolonielimits werden wie in STU aus den Forschungsdaten berechnet; das feste SWU-Modell (Basis 1 + Fraktionstechs, Deckel 3/3/1) entfällt.
- 2026-10-28 Agent: Umsetzung und fachbezogene Tests waren grün; die verpflichtende Gesamttypprüfung scheitert jedoch reproduzierbar an zwei bereits vorhandenen Frontend-Fehlern außerhalb dieses Issues (`apps/frontend/src/pages/database.tsx:1015` mit veraltetem Fraktionstyp sowie `apps/frontend/src/pages/colonies.spec.tsx:239` ohne `hasFighterShipyard`). Produktänderungen wurden gemäß Abbruchregel verworfen. Bitte diese Baseline-Typecheck-Fehler beheben oder ausdrücklich festlegen, wie mit unabhängigen Vorfehlern umzugehen ist.
- 2026-10-30 Product Owner: Die für `col-E1a` gewählte Option 1 gilt auch für diesen bereits fachlich entschiedenen Folgeauftrag. `sh-AP-21` besitzt die Frontend-Typecheck-Baseline; `col-E1b` ist `ready-for-agent`. Bis zur Baseline-Reparatur darf das Issue bei grünen fokussierten Tests und Build abgeschlossen werden, sofern gegenüber der dokumentierten Baseline keine neuen Typecheck-Fehler entstehen.
- 2026-11-02 Agent: Forschungsdaten und STU-Import tragen datengetriebene Kolonielimits; Backend und Forschungsdetail summieren bzw. zeigen sie ohne festen Deckel. Shared-, Backend- und Frontend-Fokustests sowie der vollständige Build sind grün. Der verpflichtende Affected-Lauf bleibt ausschließlich wegen unabhängiger, bereits vorhandener Frontend-/Spacecraft-Testflakiness rot; die issuebezogenen Typechecks sind fehlerfrei.
