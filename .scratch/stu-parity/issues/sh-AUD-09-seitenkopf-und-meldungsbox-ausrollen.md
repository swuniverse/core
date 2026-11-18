# Seitenkopf und Meldungsbox auf allen Spielseiten

**Status:** needs-triage
**Priority:** P2
**Size:** M
**Blocked by:** —

## Ziel

STU hat auf jeder Seite einen Breadcrumb „/ Modul / Unterseite“ (`breadcrumb.twig`) und einen Seitentitel je Modul (`<title>`). Jedes Aktionsergebnis erscheint als Tabelle „Meldung“ (`systeminformation.twig`) und bleibt bis zum Seitenwechsel stehen.

SWU hat beide Bausteine seit sh-AP-12 (`components/PageHeader.tsx`, `components/ActionResult.tsx` mit `useActionResult`), nutzt sie aber kaum:
- `PageHeader` steht nur in `dashboard.tsx`, `database.tsx`, `trade.tsx`, `admin-ticks.tsx`, `admin-mass-message.tsx` und `password-reset.tsx`. Kolonien, Schiffe, Schiffsdetail, Karte, Forschung, Nachrichten, HoloNet, Allianzen, Ereignisse und Einstellungen haben weder Breadcrumb noch Seitentitel; `document.title` setzt nur `PageHeader`.
- `ActionResult` wird **nirgends** gerendert, auch nicht auf Maindesk und Datenbank, obwohl das AK von sh-AP-12 diese als Referenz verlangt. Mehrzeilige Ergebnisse (Kampf, Transfer, Scan, Massenschaltung) laufen über Toasts (max. 3, 4 s) und gehen verloren.

Ziel: alle Spielseiten mit `PageHeader` und alle Aktionen mit mehrzeiligem Ergebnis mit `ActionResult`.

Triage: Der Umfang ist größer als Size M. Bei der Triage in Teiltickets je Bereich aufteilen (Vorschlag: a) Kolonie und Forschung, b) Schiffe/Stationen und Karte, c) Kommunikation, Allianz, Ereignisse, Einstellungen, Admin). Zu klären ist außerdem, welche Ergebnisse Toast bleiben (kurze Bestätigungen) und welche in die Meldungsbox gehören.

## STU-Quellen

- `src/html/breadcrumb.twig`
- `src/html/systeminformation.twig`
- `src/html/sitedefaults.twig` (Seitenrahmen)

## SWU-Pfade

- `apps/frontend/src/components/PageHeader.tsx`, `PageHeader.spec.tsx`
- `apps/frontend/src/components/ActionResult.tsx` (`ActionResult`, `useActionResult`), `ActionResult.spec.tsx`
- `apps/frontend/src/components/Toast.tsx`
- Seiten ohne Seitenkopf: `apps/frontend/src/pages/colonies.tsx` bzw. `pages/colonies/ColoniesPage.tsx`, `spacecraft.tsx`, `spacecraft-detail.tsx`, `starmap.tsx`, `research.tsx`, `research-tree.tsx`, `messages.tsx`, `holonet.tsx`, `rpg-plots.tsx`, `alliances.tsx`, `alliance-forum.tsx`, `events.tsx`, `settings.tsx`, `player-profile.tsx`, `notes.tsx`, `colony-scans.tsx`, `admin*.tsx`
- Referenzseiten: `apps/frontend/src/pages/dashboard.tsx`, `database.tsx`

## Akzeptanzkriterien

- [ ] Triage: Aufteilung in Teiltickets (Size S/M) und Liste „Toast vs. Meldungsbox“ festgelegt.
- [ ] Jede Spielseite rendert `PageHeader` mit Breadcrumb „/ Bereich / Unterseite“ und setzt `document.title`.
- [ ] Maindesk und Datenbank nutzen `ActionResult` als Referenz (AK aus sh-AP-12).
- [ ] Aktionen mit mehrzeiligem Ergebnis (mindestens Kampf, Transfer/Beamen, Scans, Massenschaltung von Gebäuden/Systemen, Flottenaktionen) zeigen das Ergebnis in `ActionResult` bis zum Seitenwechsel bzw. bis zur nächsten Aktion.
- [ ] Frontend-Tests je Seite: Breadcrumb und Titel; je umgestellter Aktion: Meldungsbox mit allen Zeilen.

## Herkunft

- [`../audit-2026-11-17/README.md`](../audit-2026-11-17/README.md), Abschnitt A (Zeile „Meldungsbox `ActionResult`“), Abschnitt C (Seitenrahmen) und Abschnitt D (sh-AP-12).
- [`../audit-2026-11-17/shell-admin-runtime.md`](../audit-2026-11-17/shell-admin-runtime.md), G7.
- sh-AP-12 ist resolved, das AK „ActionResult … Maindesk und Datenbank als Referenz“ ist nicht erfüllt; der Rollout auf die übrigen Seiten wurde den Fachbereichen überlassen und dort nicht erledigt. PO-Linie 2026-11-17 „wie STU“.

## Comments
