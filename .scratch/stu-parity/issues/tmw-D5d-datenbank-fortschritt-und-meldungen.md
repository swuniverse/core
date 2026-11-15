# Datenbank-Awards: Fortschritt und Frontend-Meldungen

**Status:** resolved
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

- [x] Der Datenbank-Hub zeigt für die unterstützten Kategorien „x / y entdeckt“ und aktualisiert den Fortschritt aus dem Backend-Vertrag.
- [x] Das Ereignis „Neuer Datenbankeintrag: <Name> (+x Prestige)“ wird als Meldung dargestellt; Award-Vergabe erzeugt eine separate Meldung.
- [x] Ansichten zeigen keine Daten oder Fortschritte für unbekannte Ebenen; Ebenenbezug wird nur für Systemkategorien angezeigt.
- [x] Frontend-Tests decken Fortschritt, Entdeckungsmeldung und Award-Meldung ab.
- [x] `lint`, `typecheck`, `test` und `build` sind grün.

## Entscheidung

Die Oberfläche konsumiert die autoritativen Backend-Verträge und berechnet weder Nenner noch Awardvollständigkeit selbst. Regions-Awards und Regionsfortschritt bleiben außerhalb dieses ersten Umfangs.

## Comments

- 2026-11-06: Viertes und letztes geordnetes Child aus `tmw-D5`; setzt die Kategorien- und Systemkatalog-Integrationen `tmw-D5b` und `tmw-D5c` voraus.
- 2026-11-15: Umgesetzt (32f9a833).
  - Hub: `DatabaseProgress` (`components/database/DatabaseProgress.tsx`) zeigt die Zeilen von `GET /database/category-progress` als „x / y entdeckt“; Ebenenname nur bei Sternensystemen, vollständige Kategorien hervorgehoben, erhaltene Awards mit ★ markiert. Neu laden bei `DATABASE_ENTRY_DISCOVERED` und `AWARD_GRANTED`; keine eigene Zählung.
  - Meldungen: `DatabaseNotices` in der App-Hülle zeigt „Neuer Datenbankeintrag: …“ und „Award erhalten: …“ als getrennte Toasts.
  - Unbekannte Ebenen: Der Fortschrittsendpunkt filtert Sternensystem-Ebenen jetzt über `LayerAccessService.getLayers` auf bekannte Ebenen (vorher alle sichtbaren); flache Kategorien haben keinen Ebenenbezug.
  - Tests: `DatabaseProgress.spec.tsx` (Fortschritt, Ebene nur bei Sternensystemen, Neuladen nach Ereignis, leere Anzeige, beide Meldungen); `database-completion.int-spec.ts` (nur bekannte Ebenen). `database.spec.tsx` mockt die Fortschrittsbox, die eigene Tests hat.
  - Gates: Lint 0 Fehler (1430/110 nach Korrektur der Importreihenfolge in `database.spec.tsx`), Typecheck und Build grün, Frontend 766/766, Backend-Unit 2124/2124, Integration 748/750: die zwei Fehler in `profile-friends.int-spec.ts` waren ein Zeitlimit beim Start des eigenen Testcontainers; einzeln 2/2 grün.

