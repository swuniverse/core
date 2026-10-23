# Forschungs-Navlet mit Bild, Produktion und Wartend-Badge

**Status:** claimed
**Priority:** P2
**Size:** S
**Blocked by:** —

## Ziel

Das Forschungs-Navlet im Header erreicht die STU-Dichte: Forschungsbild, Warenicon der Forschungspunkte, Fortschritt mit „+Produktion je Tick“ und ein Badge „+1“, wenn eine weitere Forschung wartet. Ohne aktive Forschung erscheint das Forschungs-Navigationsicon mit „Keine Forschung“.

## STU-Quellen

- `src/html/game/component/researchComponent.twig`
- `src/Module/Game/Component/ResearchComponent.php` (`CURRENT_RESEARCH_PRODUCTION_COMMODITY`, `WAITING_RESEARCH`)

## SWU-Pfade

- `apps/backend/src/modules/dashboard/dashboard.service.ts#getHeader`
- `packages/shared/src/lib/common/index.ts` (`GlobalHeaderStatusDto.research`)
- `apps/frontend/src/components/layout/header.tsx` (Forschungsblock ab `lg`)
- Assets: `assets/research/<id>.png`, `assets/commodities/<id>.png`

## Akzeptanzkriterien

- [ ] `GlobalHeaderStatusDto.research` enthält zusätzlich `imageId` (bzw. Tech-ID für das Asset), `commodityId`, `productionPerTick` (Forschungspunkte, die der nächste Haupttick voraussichtlich bringt, aus derselben Quelle wie der Tick) und `queuedCount` bzw. den Namen der nächsten wartenden Forschung.
- [ ] Header zeigt Bild (mit Fallback ohne Bild, falls das Asset fehlt), Name, Balken, `Fortschritt/Benötigt (+Produktion)` mit Warenicon (15 px) und bei wartender Forschung ein Badge „+1“ in `text-swu-accent` mit `title="wartet: <Name>"`.
- [ ] Ohne aktive Forschung: Icon und Text „Keine Forschung“, Link auf `/research`.
- [ ] Backend-Test: Produktionswert und Wartend-Angabe im Header-DTO. Frontend-Tests: Anzeige mit/ohne Wartend-Badge und ohne Forschung.

## Comments
