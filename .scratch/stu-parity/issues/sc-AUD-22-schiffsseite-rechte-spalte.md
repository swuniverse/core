# Schiffsseite: Warp-Signatur und Traktorstrahl in der rechten Spalte wie STU

**Status:** resolved
**Priority:** P3
**Size:** S
**Blocked by:** —

## Ziel

Rechte Spalte der Schiffsseite nach STU `src/html/spacecraft/control/control_right.twig`.

## Akzeptanzkriterien

- [x] „Hyperantrieb-Signatur fälschen“ (Rumpfauswahl + Knopf) als Zeile im Block „Reaktor + Antrieb“ direkt unter dem Hyperantrieb-Schalter, nur bei `isWarpPossible` (Warpantrieb vorhanden, außerhalb eines Systems). Aktive Signatur mit Restzeit darunter. Der bisherige Knopf „Signatur“ mit Dialog in den Schnellaktionen entfällt.
- [x] Block „Traktorstrahl“ nur bei aktivem Strahl: „Gerichtet auf: X“ mit Schiffsbild und „deaktivieren“ (Station zusätzlich Andock-Icon) bzw. „Gehalten von: X“ mit „Fluchtversuch“ nur bei funktionsfähigem Deflektor (`isDeflectorHealthy`, SWU: Schilde-Integrität > 0). Die Banner oben auf der Seite entfallen.
- [x] `tractor.holding/heldBy` liefern `shipClassId` und `shipClassKey` für das Bild.

## Comments

### 2026-11-23 — umgesetzt, Prüfung ausstehend

- Tests: neu `TractorBeamPanel.spec.tsx` (4), `SignatureMaskRow.spec.tsx` (3, ersetzt `SignatureMaskButton.spec.tsx`); `spacecraft-detail.spec.tsx` auf neue Texte angepasst. Vitest `components/spacecraft` + `spacecraft-detail` 259/259; Jest `modules/spacecraft` 819/819; `nx typecheck` backend und frontend ✓.
- Abweichung: Fehlende Energie für den Fluchtversuch meldet das Backend beim Klick (STU prüft im Template nur den Deflektor). Aktive Signatur hat in SWU zusätzlich „beenden“.
- Modell: Claude Opus 5.5 direkt.

- 2026-11-23 – **Prüfung bestanden, resolved.** Gesammelter Verifikationslauf auf `afa856fb`: Lint 0 Fehler (in den geänderten Dateien keine Warnung), `nx typecheck` und `nx build` alle Projekte grün, Unit Backend 2739/2739, Frontend 990/991 (Ausreißer `settings-tutorial.spec.tsx` einzeln 23/23 grün, nicht berührt), PostgreSQL-Integration 1076/1076. Diff-Review gegen Akzeptanzkriterien ohne Befund (Rechte: Kolonie-Eigentum, Orbit, Tarnung; Flottenendpunkte prüfen den Eigner). Modell: Opus 5.5 direkt.
