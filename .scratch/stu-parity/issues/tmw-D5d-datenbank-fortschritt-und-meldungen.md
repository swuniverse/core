# Datenbank-Awards: Fortschritt und Frontend-Meldungen

**Status:** ready-for-agent
**Priority:** P2
**Size:** S
**Blocked by:** tmw-D5b, tmw-D5c

## Ziel

Zeigt Entdeckungsfortschritt pro Datenbankkategorie und stellt neue Einträge sowie Award-Vergaben als Frontend-Meldungen dar. Backend-Kategorien und Ereignisse werden durch `tmw-D5b`/`tmw-D5c` bereitgestellt.

## SWU-Pfade

- `apps/frontend/src/pages/database.tsx`
- `apps/frontend/src/components/Toast.tsx` bzw. persistente Meldungsbox aus `sh-AP-12`
- `packages/shared/src/lib/` (Fortschritts- und Ereignisverträge)

## Akzeptanzkriterien

- [ ] Der Datenbank-Hub zeigt für die unterstützten Kategorien „x / y entdeckt“ und aktualisiert den Fortschritt aus dem Backend-Vertrag.
- [ ] Das Ereignis „Neuer Datenbankeintrag: <Name> (+x Prestige)“ wird als Meldung dargestellt; Award-Vergabe erzeugt eine separate Meldung.
- [ ] Ansichten zeigen keine Daten oder Fortschritte für unbekannte Ebenen; Ebenenbezug wird nur für Systemkategorien angezeigt.
- [ ] Frontend-Tests decken Fortschritt, Entdeckungsmeldung und Award-Meldung ab.
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Entscheidung

Die Oberfläche konsumiert die autoritativen Backend-Verträge und berechnet weder Nenner noch Awardvollständigkeit selbst. Regions-Awards und Regionsfortschritt bleiben außerhalb dieses ersten Umfangs.

## Comments

- 2026-11-06: Viertes und letztes geordnetes Child aus `tmw-D5`; setzt die Kategorien- und Systemkatalog-Integrationen `tmw-D5b` und `tmw-D5c` voraus.
