# Tutorial-Inhalte: Maindesk, Kolonie und Forschung

**Status:** ready-for-agent
**Priority:** P3
**Size:** S
**Blocked by:** sh-AP-19b

## Ziel

Die ersten Tutorials führen neue Spieler durch Maindesk, Kolonie (Oberfläche, Bau, Lager, Energie) und Forschung. Die Texte schreibt der Agent auf Deutsch mit den Domänenbegriffen aus `CONTEXT.md` und Star-Wars-Ton (Leitplanke 2: keine Star-Trek-Inhalte).

## STU-Quellen

- STU-Tutorialstruktur in `src/Orm/Entity/TutorialStep.php` (Inhalte in STU per Datenbank gepflegt, nicht im Repository; als Orientierung dienen Modul- und Ansichtsaufteilung)
- `src/html/view/maindesk.twig`, `src/html/colony/*`, `src/html/view/research.twig` (welche Elemente erklärt werden)

## SWU-Pfade

- Definitionsdatei aus sh-AP-19a (`apps/backend/src/modules/tutorial/*`)
- `apps/frontend/src/pages/dashboard.tsx`, `apps/frontend/src/pages/dashboard/*`
- `apps/frontend/src/pages/colonies/*` (`ColoniesPage.tsx`, `components/*`)
- `apps/frontend/src/pages/research.tsx`

## Akzeptanzkriterien

- [ ] Maindesk: 4–6 Schritte (Header mit Kolonien/Forschung/Nachrichten, Kolonieliste, Limits, Prozesse, Navigation).
- [ ] Kolonie: 6–10 Schritte (Oberfläche, Feld wählen, Gebäude bauen mit `waitFor` auf den ersten Bauauftrag, Energie- und Lagerbilanz, Bevölkerung, Gebäudeschaltung).
- [ ] Forschung: 3–5 Schritte (Liste, Detail, Forschung starten mit `waitFor`, Queue).
- [ ] Alle Ziele über `data-tutorial`-Attribute an stabilen Elementen; keine Abhängigkeit von CSS-Klassen.
- [ ] Die Frontend-Aufrufe von `tutorialEvent(...)` sitzen an den erfolgreichen Aktionen (Bau gestartet, Forschung gestartet).
- [ ] Backend-Test: Definitionen valide. Frontend-Tests: `data-tutorial`-Ziele je Schritt existieren auf den jeweiligen Seiten (Render-Test je Ansicht).

## Comments
