# Kolonielimits in Forschungsdetail und Dashboard anzeigen

**Status:** ready-for-agent
**Priority:** P3
**Size:** S
**Blocked by:** —

## Ziel

STU zeigt in den Forschungsdetails, um wie viele Planeten, Monde oder Asteroiden eine Forschung das Kolonielimit erhöht, und blendet im Maindesk den Asteroideneintrag aus, solange das Limit 0 ist. SWU kennt die limiterhöhenden Techs (`COLONIZATION_TECH_IDS`), zeigt sie aber nur in Freitextbeschreibungen. Dieser Teil ist unabhängig davon, ob das Limitmodell selbst umgebaut wird (col-E1b).

## STU-Quellen

- `src/html/research/researchDetails.twig` (Koloniegrenzen)
- `src/html/maindesk/colonyLimits.twig` (Asteroid nur bei `ASTEROID_LIMIT`)
- `src/Component/Player/ColonyLimitCalculator.php`

## SWU-Pfade

- `packages/shared/src/lib/starmap/colonization-rules.ts` (`COLONIZATION_TECH_IDS`, `COLONIZATION_BASE_LIMITS`, `COLONIZATION_MAX_LIMITS`)
- `apps/backend/src/modules/colonization/colonization.service.ts` (`limits`)
- `apps/frontend/src/pages/research.tsx` (`TechDetailModal`)
- `apps/frontend/src/pages/dashboard/DashboardLowerSections.tsx` (`DashboardLimits`) + `.spec.tsx`

## Akzeptanzkriterien

- [ ] Das Forschungsdetail zeigt bei limiterhöhenden Techs eine Zeile „Kolonielimit: +1 Planet/Mond/Asteroid“ mit dem passenden Planetenicon, abgeleitet aus einer gemeinsamen Funktion in `packages/shared` (keine Duplikation der Tech-IDs im Frontend).
- [ ] Das Dashboard blendet den Asteroideneintrag aus, wenn das Asteroidenlimit 0 ist.
- [ ] Shared-Test für die Ableitungsfunktion; Frontend-Tests für Forschungsdetail und Dashboard.

## Comments
