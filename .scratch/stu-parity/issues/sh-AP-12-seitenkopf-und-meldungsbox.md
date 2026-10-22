# Seitenkopf mit Breadcrumb und persistente Meldungsbox

**Status:** resolved
**Priority:** P1
**Size:** S
**Blocked by:** —

## Ziel

Jede Spielseite soll wie in STU mit „/ Modul / Unterseite“ beginnen und den Browsertitel setzen. Mehrzeilige Aktionsergebnisse (Kampf, Transfer, Scan, Kolonisierung) erscheinen als persistente Meldungsbox im Seitenkopf statt in kurzlebigen Toasts. Dieses Issue liefert beide Komponenten und stellt Maindesk und Datenbank als Referenz um; weitere Seiten folgen in den Fachissues.

## STU-Quellen

- `src/html/breadcrumb.twig`, `src/html/view/breadcrumbAndView.twig`
- `src/html/systeminformation.twig` (Tabelle „Meldung“, ab 6 Einträgen einklappbar, optionaler Weiter-Link)
- `src/Component/Game/ModuleEnum.php#getTitle`

## SWU-Pfade

- neu: `apps/frontend/src/components/PageHeader.tsx`, `apps/frontend/src/components/ActionResult.tsx` (+ Specs)
- `apps/frontend/src/pages/dashboard.tsx`, `apps/frontend/src/pages/database.tsx` (heutiges Muster `border border-swu-border bg-black/30 px-3 py-1.5`, `h1.text-xs.font-bold.text-swu-primary`)
- `apps/frontend/src/components/Toast.tsx` (bleibt für kurze Bestätigungen)
- `apps/frontend/index.html` (statischer Titel)

## Akzeptanzkriterien

- [x] `PageHeader` nimmt eine Liste von Segmenten (`{ label, to? }`), rendert „/ Segment / Segment“ im bestehenden Stil (verlinkte Segmente in `text-swu-primary`, letztes Segment fett) und setzt `document.title` auf „<letztes Segment> · Star Wars Universe“ (beim Unmount zurück auf den Standardtitel).
- [x] `PageHeader` hat einen Slot für die Meldungsbox direkt darunter.
- [x] `ActionResult` zeigt eine Liste von Meldungszeilen (BBCode über `BbCodeText`) in einer Box mit Kopf „Meldung“; ab 6 Einträgen sind nur die ersten 5 sichtbar plus Umschalter „Alle n Meldungen anzeigen“; optionaler Weiter-Link; schließbar; bleibt bis zum Seitenwechsel oder bis neue Meldungen kommen.
- [x] Ein kleiner Hook (z. B. `useActionResult()`) verwaltet die Meldungen je Seite und leert sie beim Routenwechsel.
- [x] Maindesk und Datenbank nutzen `PageHeader`; keine sichtbare Regression des bisherigen Kopfes.
- [x] Kurze Konvention in einem Kommentar am Komponentenkopf: kurze Bestätigungen als Toast, mehrzeilige Ergebnisse als `ActionResult`.
- [x] Frontend-Tests: Breadcrumb und `document.title`, Einklappen ab 6 Einträgen, Leeren beim Routenwechsel.

## Comments

- Implemented reusable `PageHeader`, `ActionResult`, and `useActionResult` components under `apps/frontend/src/components`, with Maindesk and Datenbank as reference integrations. Added focused frontend tests for breadcrumbs/title lifecycle, collapsed BBCode results, continuation links, and route-change cleanup. Toasts remain unchanged for short confirmations; further page migrations stay with their domain issues.
