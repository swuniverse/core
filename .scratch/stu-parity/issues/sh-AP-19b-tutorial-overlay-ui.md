# Tutorial: PADD-Overlay im Frontend

**Status:** resolved
**Priority:** P2
**Size:** S
**Blocked by:** sh-AP-19a

## Ziel

Das Frontend zeigt die Tutorialschritte wie STU als seitlich einfahrendes PADD-Fenster mit Titel, Text, Zurück/Weiter/Schließen und hebt die Zielelemente der Seite hervor. Schritte mit `waitFor` schließen sich automatisch, wenn der Spieler die Aktion ausführt. In den Einstellungen lassen sich Tutorials neu starten und abschalten.

## STU-Quellen

- `src/Public/static/js/tutorial.js` (`initPaddPopup`, `openPaddPopup`, Hervorhebung über `elementIds`, `innerUpdate`)
- `src/html/tutorial/padd*.twig`, `closebutton*.twig`
- `src/Module/Game/View/ShowPadd`, `ShowTutorialCloseButton`

## SWU-Pfade

- neu: `apps/frontend/src/components/tutorial/TutorialPadd.tsx`, `useTutorial.ts` (+ Specs)
- `apps/frontend/src/components/layout/app-shell.tsx` (Einbindung, Offsets `top-[58px] md:top-[86px]`, `md:ml-[68px]`)
- `apps/frontend/src/pages/settings.tsx` (Abschnitt „Tutorial“)
- Seiten mit `data-tutorial`-Attributen (in sh-AP-19c/19d)

## Akzeptanzkriterien

- [x] Beim Betreten einer Ansicht lädt `useTutorial(view)` den Stand; ist ein Schritt offen, fährt das PADD rechts unten ein (ohne Verdecken der Sidebar/Header, mobil als Bottom-Sheet).
- [x] PADD: Titel, Text (BBCode über `BbCodeText`), Fortschritt „Schritt n/m“, Zurück (inaktiv beim ersten), Weiter (inaktiv bei `waitFor`), Schließen-Menü mit „Später“ (nur ausblenden), „Tutorial dieser Seite beenden“ und „Alle Tutorials abschalten“.
- [x] Zielelemente (`[data-tutorial="<key>"]`) erhalten einen gut sichtbaren Rahmen in `swu-accent`; fehlt ein Ziel, springt das Overlay auf `fallbackIndex` bzw. zeigt den Schritt ohne Hervorhebung.
- [x] Ein globaler Event-Helfer `tutorialEvent(name)` schließt passende `waitFor`-Schritte ab und speichert den Fortschritt.
- [x] Stil nach UI-Konventionen (Box/Kopf aus 3.3, keine Schatten/Glassmorphism, `text-xs`).
- [x] Einstellungen: Schalter „Tutorials anzeigen“ und Button „Tutorials neu starten“.
- [x] Frontend-Tests: Anzeige bei offenem Schritt, Weiter/Zurück speichern, `waitFor` per Event, Hervorhebung und Fallback, Einstellungen.

## Comments

- 2026-10-27 Agent: Responsives PADD, persistente Navigation, `waitFor`-Event-Helfer, Zielhervorhebung/Fallback und Tutorial-Steuerung im Gameplay-Tab umgesetzt. Seitenspezifische Ziele und Events bleiben wie geplant bei sh-AP-19c/19d; die bestehende API liefert keinen separaten globalen Aktivstatus, daher zeigt der Schalter innerhalb der Sitzung den zuletzt ausgeführten Reset-/Disable-Zustand.
