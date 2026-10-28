# Kolonielimits aus Forschungsdaten

**Status:** claimed
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

- [ ] Techs tragen `colonyLimit: { type, amount }`; der Import übernimmt die STU-Werte.
- [ ] Das Limit je Typ ist die Summe der erforschten Werte bzw. das STU-Maximum (Semantik von `getColonyTypeLimitByUser` übernehmen); `COLONIZATION_MAX_LIMITS` entfällt.
- [ ] Bestehende Kolonien über dem neuen Limit bleiben erhalten; nur neue Kolonisierung wird geprüft.
- [ ] Shared-, Backend- und Frontend-Tests.

## Entscheidung

Vorgabe: Variante (b). Limits aus den Forschungsdaten (`colonyLimit: { type, amount }`) mit STU-Semantik von `getColonyTypeLimitByUser`; `COLONIZATION_MAX_LIMITS` und hartkodierte Tech-IDs entfallen. Keine ADR.

## Comments

- 2026-10-21 Product Owner: Option b – Kolonielimits werden wie in STU aus den Forschungsdaten berechnet; das feste SWU-Modell (Basis 1 + Fraktionstechs, Deckel 3/3/1) entfällt.
