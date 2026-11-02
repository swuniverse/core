# Kolonielimits in Forschungsdetail und Dashboard anzeigen

**Status:** claimed
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

- 2026-10-28: Die Umsetzung und die drei fokussierten Tests waren grün (Shared 6/6, Frontend 18/18), ebenso `nx run-many --targets=build`. Die verpflichtende Gesamtprüfung bleibt jedoch nach zwei ernsthaften Versuchen in `frontend:typecheck` rot: bestehender Fehler `apps/frontend/src/pages/database.tsx:1015` (`"REBEL" | "EMPIRE"` ist nicht `Faction`) sowie zahlreiche bestehende TS6305-Fehler wegen fehlender Frontend-Deklarationsausgaben. Produktcode wurde gemäß Abbruchregel verworfen. Bitte entscheiden, ob die bestehende Typecheck-Baseline zuerst separat repariert werden soll oder ob bekannte, issue-fremde Fehler für diesen Durchlauf ausgenommen werden dürfen.
- 2026-10-30 Product Owner: Option 1. Die Frontend-Typecheck-Baseline erhält mit `sh-AP-21` ein separates P1/S-Infrastruktur-Issue; `col-E1a` ist wieder `ready-for-agent`. Bis `sh-AP-21` gelöst ist, darf dieses Issue trotz dokumentierter, issue-fremder Baselinefehler abgeschlossen werden, wenn die fokussierten Tests und der Frontend-Build grün sind und keine neuen Typecheck-Fehler gegenüber der in `sh-AP-21` festgehaltenen Baseline entstehen. Aktuell sind die fokussierten bestehenden Tests `research.spec.tsx` und `DashboardLowerSections.spec.tsx` mit 16/16 grün.
