# Tutorial-Inhalte: Schiffe, Sternenkarte und Kommunikation

**Status:** resolved
**Priority:** P3
**Size:** S
**Blocked by:** sh-AP-19b

## Ziel

Weitere Tutorials erklären Schiffsliste und Schiffsdetail (Systeme, Energie, Flug), die Sternenkarte sowie Nachrichten und HoloNet. Die Texte schreibt der Agent auf Deutsch mit den Domänenbegriffen aus `CONTEXT.md` und Star-Wars-Ton (Leitplanke 2).

## STU-Quellen

- STU-Tutorialstruktur in `src/Orm/Entity/TutorialStep.php`
- `src/html/view/shiplist.twig`, `src/html/spacecraft/spacecraft.twig`, `src/html/view/starmap.twig`, `src/html/view/pmCategory.twig`

## SWU-Pfade

- Definitionsdatei aus sh-AP-19a
- `apps/frontend/src/pages/spacecraft.tsx`, `spacecraft-detail.tsx`, `apps/frontend/src/components/spacecraft/*`
- `apps/frontend/src/pages/starmap.tsx`
- `apps/frontend/src/pages/messages.tsx`, `holonet.tsx`

## Akzeptanzkriterien

- [x] Schiffe: 6–10 Schritte (Liste, Schiffskopf mit Hülle/Schilden/EPS/Crew, Systeme schalten, Alarmstufe, Navigation mit Flug als `waitFor`, NBS-Liste).
- [x] Sternenkarte: 3–5 Schritte (Ebenen, Navigation, Systeme, Legende).
- [x] Kommunikation: 3–5 Schritte (Ordner, Nachricht schreiben, HoloNet lesen und schreiben).
- [x] Ziele über `data-tutorial`-Attribute; `tutorialEvent(...)` an den erfolgreichen Aktionen.
- [x] Backend-Test: Definitionen valide. Frontend-Tests: `data-tutorial`-Ziele je Schritt existieren auf den jeweiligen Seiten.

## Comments

Verifiziert: Backend-Tutorialtests (9 Tests), betroffene Frontend-Seitentests (86 Tests), Backend- und Frontend-Typechecks, ESLint ohne Fehler (3 vorhandene Warnungen) sowie `git diff --check` erfolgreich.
