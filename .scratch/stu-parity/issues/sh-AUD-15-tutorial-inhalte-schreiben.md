# Tutorial-Inhalte selbst schreiben und Lücken schließen

**Status:** ready-for-human
**Priority:** P3
**Size:** M
**Blocked by:** —

## Ziel

Das Tutorial-System steht (sh-AP-19a–d): Modell und API, PADD-Overlay, 34 Schritte in 7 Ansichten mit eigenen SWU-Texten. Ein Abgleich mit STU-Inhalten ist **nicht möglich**: STU legt in den Migrationen nur die Tabelle `stu_tutorial_step` an, die Inhalte stehen nur im Prod-Dump, und der ist nicht verfügbar.

Der Product Owner hat am 2026-11-17 entschieden: **Tutorial-Inhalte schreiben wir selbst**, ohne STU-Vorlage. Dieses Ticket ist ein Inhaltsauftrag an einen Menschen (Redaktion), danach die technische Einpflege.

Offene Inhaltsbereiche:
- Nicht abgedeckte Ansichten: Handel, Allianz, Datenbank, Ereignisse (`tutorialViewForPath` kennt sie nicht).
- Bestehende Texte prüfen und an die seit sh-AP-19c/d geänderte Oberfläche anpassen (z. B. Maindesk ohne Profilbesucher nach sh-AUD-04, Notrufbox nach sh-AUD-08, Urlaubsregeln nach sh-AUD-05).
- Tutorialziele, die auf nach README L4 entfernte SWU-Zusätze zeigen (Tab „Handelsposten“, Kartenexport, Hyperraumrouten-Overlay, Rangliste Prestige), entfernen.

## STU-Quellen

- `src/Orm/Entity/TutorialStep.php` (Modell; Inhalte nicht im Repo)
- `src/html/tutorial/` (Darstellung)

## SWU-Pfade

- `apps/backend/src/modules/tutorial/tutorial-definitions.ts`, `tutorial-definitions.spec.ts` (`validateTutorialDefinitions`)
- `apps/backend/src/modules/tutorial/tutorial.service.ts`, `tutorial.controller.ts`
- `apps/frontend/src/components/tutorial/TutorialPadd.tsx`
- `apps/frontend/src/components/layout/app-shell.tsx` (`tutorialViewForPath`, Z. ~20–31)
- `apps/frontend/src/pages/tutorial-targets.spec.tsx` (Ziele `data-tutorial`)
- `packages/shared/src/lib/tutorial/` (Typen)
- `apps/frontend/src/pages/trade.tsx`, `alliances.tsx`, `database.tsx`, `events.tsx` (neue Ziele)

## Akzeptanzkriterien

- [ ] Redaktion: Texte für Handel, Allianz, Datenbank und Ereignisse (je 3–6 Schritte) liegen vor, in Star-Wars-Terminologie und abgestimmt mit den Begriffen in `map.md` → „Entscheidungen“.
- [ ] Redaktion: bestehende 34 Schritte gegen die aktuelle Oberfläche geprüft; Änderungen notiert.
- [ ] Umsetzung: neue Ansichten in `tutorialViewForPath` und `tutorial-definitions.ts`, `data-tutorial`-Ziele in den Seiten; Definitionsversion erhöht, damit Spieler die neuen Schritte sehen.
- [ ] Veraltete Ziele entfernt; `tutorial-targets.spec.tsx` deckt alle Ziele ab.
- [ ] Backend-Test: Definitionsvalidierung grün. Frontend-Tests: jede Ansicht hat erreichbare Ziele.

## Herkunft

- [`../audit-2026-11-17/README.md`](../audit-2026-11-17/README.md), Abschnitt H („Weiterhin offen: Tutorial-Inhalte“), Abschnitt I (Zeile „Tutorial-Inhalte“: „Schreiben wir selbst“) und Abschnitt N1.
- [`../audit-2026-11-17/shell-admin-runtime.md`](../audit-2026-11-17/shell-admin-runtime.md), Seitenabgleich Tutorial, „Kleine Abweichungen“ (Tutorial deckt Handel, Allianz, Datenbank, Ereignisse nicht ab) und „Unsicherheiten – nachgeprüft“ (Tutorial-Inhalte).
- PO-Entscheidung 2026-11-17: Tutorial-Inhalte ohne STU-Abgleich selbst schreiben. Ergänzt die resolved Tickets sh-AP-19c/d.

## Comments
