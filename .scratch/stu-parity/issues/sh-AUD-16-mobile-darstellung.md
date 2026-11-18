# Mobile Darstellung prüfen und verbessern (SWU-eigen)

**Status:** needs-triage
**Priority:** P3
**Size:** M
**Blocked by:** —

## Ziel

Die mobile Darstellung ließ sich im Abgleich nicht beurteilen; dafür braucht es ein laufendes Spiel im Browser. Der Product Owner hat am 2026-11-17 entschieden: **mobile Darstellung machen wir selbst, STU ist kein Maßstab**. STU ist eine Desktop-Seite; die STU-Informationsdichte (Tabellen, Boxen, 350-px-Spalte) gilt auf dem Desktop, die mobile Ansicht folgt eigenen Regeln.

Dieses Ticket ist der Einstieg: Bestandsaufnahme im Browser, dann Teiltickets.

Triage: Zielgeräte und Breakpoints festlegen (z. B. 375 px Smartphone, 768 px Tablet), Prioritäten der Seiten (Maindesk, Kolonie, Schiffsdetail, Sternenkarte, Nachrichten, Handel) und Muster für breite STU-Tabellen (horizontales Scrollen, Spaltenreduktion, Kartenansicht).

## STU-Quellen

- – (kein Maßstab; PO-Entscheidung)

## SWU-Pfade

- `apps/frontend/src/components/layout/app-shell.tsx`, `sidebar.tsx`, `bottom-nav.tsx`, `header.tsx`
- `apps/frontend/src/styles.css` (Tokens, Tabellenstil)
- `apps/frontend/src/pages/dashboard.tsx`, `pages/colonies/ColoniesPage.tsx`, `spacecraft-detail.tsx`, `starmap.tsx`, `messages.tsx`, `trade.tsx`

## Akzeptanzkriterien

- [ ] Triage: Zielbreiten, Seitenpriorität und Tabellenmuster festgelegt; Teiltickets (S/M) angelegt.
- [ ] Bestandsaufnahme: Screenshots der Kernseiten bei 375 px und 768 px mit Liste der Probleme (Überlauf, unbedienbare Elemente, verdeckte Navigation, zu kleine Trefferflächen).
- [ ] Desktop-Darstellung (STU-Dichte) bleibt unverändert; Änderungen nur über Breakpoints.
- [ ] Frontend-Tests bzw. visuelle Prüfungen je Teilticket.

## Herkunft

- [`../audit-2026-11-17/README.md`](../audit-2026-11-17/README.md), Abschnitt H („Weiterhin offen: Mobile Darstellung, Farben und Tooltips“), Abschnitt I (Zeile „Mobile Darstellung“: „Machen wir selbst, STU ist kein Maßstab“) und Abschnitt N1.
- [`../audit-2026-11-17/shell-admin-runtime.md`](../audit-2026-11-17/shell-admin-runtime.md), „Unsicherheiten – nachgeprüft“ (Mobil/Responsive weiterhin offen).
- PO-Entscheidung 2026-11-17: eigenes Ticket ohne Paritätsbezug.

## Comments
