# Eigene Nachrichtenordner und Verschieben

**Status:** ready-for-agent
**Priority:** P3
**Size:** M
**Blocked by:** —

## Ziel

Spieler legen eigene Nachrichtenordner an, benennen sie um, löschen sie (Inhalt zurück nach Persönlich) und sortieren sie. Persönliche Nachrichten lassen sich in eigene Ordner verschieben. Header und Zähler bleiben bei den sieben festen Ordnern.

## STU-Quellen

- `src/Module/Message/Action/AddPmCategory`, `EditPmCategory`, `DeletePmCategory`, `SortPmCategories`, `MovePm`
- `src/Module/Message/View/ShowNewPmCategory`, `ShowEditPmCategory`, `ShowPmCategoryList`
- `src/html/communication/newCategory.twig`, `editCategory.twig`, `pmMoveSelector.twig`, `pmCategorySortingJs.twig`, `pmCategoryList.twig`

## SWU-Pfade

- `apps/backend/src/modules/messaging/message-folder.ts` (geschlossene Ordnermenge), `entities/message.entity.ts`
- `apps/backend/src/modules/messaging/messaging.service.ts`, `messaging.controller.ts`
- `apps/frontend/src/pages/messages.tsx`
- `.scratch/events-and-message-folders/spec.md` (Zeile 78: „Die Ordner sind eine geschlossene, zentral definierte Menge“)

## Akzeptanzkriterien

- [ ] `.scratch/events-and-message-folders/spec.md` erhält einen Nachtrag: Systemordner bleiben geschlossen; eigene Ordner sind eine zweite Ebene nur für persönliche Nachrichten.
- [ ] Neues Modell `user_message_folders` (Name 1–40 Zeichen, Sortierung, Besitzer) mit CRUD-Endpunkten; nur der Besitzer sieht und ändert seine Ordner.
- [ ] Nachrichten des Ordners Persönlich können per Einzel- und Mehrfachauswahl in einen eigenen Ordner und zurück verschoben werden; andere Systemordner sind nicht verschiebbar.
- [ ] Löschen eines eigenen Ordners verschiebt dessen Nachrichten zurück nach Persönlich.
- [ ] Sortierung per Hoch/Runter-Buttons, persistiert.
- [ ] Header-Navlets und Zähler der sieben festen Ordner bleiben unverändert; eigene Ordner erscheinen nur in der Nachrichten-Seitenleiste.
- [ ] Backend-Tests für CRUD, Verschieben, Löschen mit Rückverschiebung und Rechteprüfung; Frontend-Tests für Ordnerliste und Verschieben.

## Entscheidung

Vorgabe: Variante (a). Eigene Ordner als zweite, spielerdefinierte Ebene nur für persönliche Nachrichten; die geschlossene Menge der sieben Systemordner bleibt unverändert. `.scratch/events-and-message-folders/spec.md` erhält einen Nachtrag.

## Comments

- 2026-10-21 Product Owner: Option a – Eigene Nachrichtenordner werden als zweite Ebene nur für persönliche Nachrichten eingeführt; die sieben Systemordner bleiben geschlossen und die Spec erhält einen Nachtrag.

- 2026-10-29 Agent: Abbruch nach zwei ernsthaften Prüfversuchen: Die verpflichtende affected-Prüfung scheitert reproduzierbar im bestehenden Frontend-Typecheck mit zahlreichen TS6305-Fehlern für nicht gebaute Deklarationsdateien, auch nach `nx reset`; der fokussierte Nachrichten-Frontendtest war grün (22/22). Produktcode wurde gemäß Abbruchregel verworfen. Blocker: Bitte den Frontend-Typecheck-/Build-Artefakt-Zustand reparieren oder bestätigen, wie die verpflichtende Prüfung in diesem Zustand bewertet werden soll.
- 2026-11-09: Die integrierte Baseline 14b86081/c8e14f1c beseitigt den zuletzt dokumentierten fachfremden Blocker (Frontend-TS6305-Gate); reguläre Nx-Lint-/Typecheck-/Build-Gates und vollständige Tests sind laut Baseline-Review grün, lokale Test-Spieldaten waren dafür vorhanden. Status ready-for-agent; vorhandene Issue-Abhängigkeiten bleiben verbindlich. Dies belegt keine Feature-Fertigstellung: verworfene Änderungen müssen neu umgesetzt und die aktuellen Issue-Tests und Pflicht-Gates erneut ausgeführt werden; keine Ausnahme.
