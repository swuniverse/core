# LSS-Klick fliegt direkt wie STU

**Status:** resolved
**Priority:** P2
**Size:** XS
**Blocked by:** —

## Ziel

Ein Klick auf ein LSS-Feld öffnete seit tmw-K1a (`3584d88a`) bei jedem Feld einen Kasten „Gefährliches Feld [x|y] · Energie · Schaden“ mit „Flug starten“, auch bei Energie 0 und Schaden 0. STU fliegt beim Klick direkt; Feldhinweise stehen im LSS-Tooltip.

## Entscheidung (Projektinhaber, 2026-11-24)

Klick fliegt sofort, ohne Rückfrage. Das tmw-K1a-Kriterium „Zielfeldwarnung vor dem Flug“ wird durch den LSS-Tooltip mit Effektbeschreibungen erfüllt (`LssMap.spec`: „includes field effect descriptions in the tooltip“).

## Akzeptanzkriterien

- [x] Klick auf ein geradliniges Feld ruft sofort `POST /spacecraft/:id/fly` auf; kein Kasten, kein „Flug starten“.
- [x] Diagonales Feld fliegt nicht und meldet „Nur geradlinige Flugrouten sind möglich“.
- [x] Während ein Flug läuft, startet ein weiterer Klick keinen zweiten Flug.
- [x] Tutorial-Ereignis `spacecraft.flight.started` weiterhin erst nach erfolgreichem Flug.

## Comments

### 2026-11-24 — umgesetzt, Prüfung ausstehend

- `NavigationPanel.tsx`: `handleFieldClick` ruft `handleFly`, Sperre bei laufendem Flug; Warnkasten, `navTarget`-State und Ziel-Hilfswerte entfernt.
- Tests: `NavigationPanel.spec.tsx` (direkter Flug, diagonal, Doppelklick – ohne Sperre rot geprüft), Kampfbericht-Test und `tutorial-targets.spec.tsx` ohne „Flug starten“. Vitest `components/spacecraft` + `spacecraft-detail` + `tutorial-targets` grün; `nx typecheck frontend` ✓.
- Modell: Claude Opus 5.5 direkt.

- 2026-11-24 – **Prüfung bestanden, resolved.** Gesammelter Verifikationslauf auf `83bca5c5`: Lint 0 Fehler (geänderte Dateien ohne neue Warnung), `nx typecheck` und `nx build` alle Projekte grün, Unit Backend 2739/2739, Frontend 1003/1004 (Ausreißer `research.spec.tsx` einzeln 15/15 grün, nicht berührt), PostgreSQL-Integration 1081/1081. Diff-Review ohne Befund (Flottenbefehle nur über eignergeprüfte Einzelschiff-Endpunkte, Doppelklick-Sperre, Stationsregel nur fürs eigene Profil). Modell: Opus 5.5 direkt.
