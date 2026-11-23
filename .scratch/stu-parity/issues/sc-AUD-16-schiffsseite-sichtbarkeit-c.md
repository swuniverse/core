# Schiffsseite: Shuttle-Zeile und Systemwechsel wie STU (Paket C)

**Status:** claimed
**Priority:** P3
**Size:** S
**Blocked by:** —

## Ziel

Restpunkte der Schiffsseiten-Angleichung (`.scratch/stu-parity/inventory/schiffsseite-vollabdeckung.md`, Teil 4), ohne Backend-Änderung.

## STU-Quellen

- `src/html/spacecraft/control/control_mid.twig`: Shuttle-Start nur mit Rampe und gelagerten Shuttles; „verlassen“ und „einfliegen“ nur mit Warpantrieb (`hasWarpdrive`), andere Gründe beim Klick; Makro `astroStates`.

## Akzeptanzkriterien

- [x] Shuttle-Panel: kein Leerzustand „Keine Shuttles im Lager.“, Kapazitätszeile nur mit gelagerten Shuttles, ganz ausgeblendet ohne gelagerte oder nahe Shuttles (außer auf einem Shuttle).
- [x] „System verlassen“ und „einfliegen“ nur mit `WARPDRIVE`; übrige Gründe meldet das Backend beim Klick (vorher deaktiviert mit `leaveReason`).
- [ ] Kartographie nach STU-Makro `astroStates` — **zurückgestellt, Produktentscheidung nötig** (siehe unten).

## Offene Entscheidung: Kartographie

STU knüpft Aktionen und Texte an das aktive Astrometrie-Labor (`getAstroState`): „System kartographieren“ bei aktivem Labor, sonst „System nicht kartographiert“; „Verbleibende Messpunkte“ nur bei aktivem Labor, sonst „Kartographierung ist geplant (System)“; „Kartographierung wird finalisiert (noch N Ticks)“; Region ohne Labor zeigt nichts. SWU folgt bewusst anderen Regeln aus `stu-messpunkt-systemkartographie/07` („nur lokal qualifizierte Schiffe erhalten Plan-/Finalisierungsaktionen“) und `tmw-K8b3` („bei nicht erfüllten Voraussetzungen … zeigt den Grund“). Eine Angleichung würde 11 bestehende Tests und diese Entscheidungen umkehren.

## Comments

### 2026-11-23 — umgesetzt (ohne Kartographie), Prüfung ausstehend

Commit: `feat(spacecraft): STU shuttle row and system enter/leave visibility (stu-parity sc-AUD-16)`

- Tests: neu `ShuttleManagementPanel.spec.tsx` (2); `FieldContextPanel.spec.tsx` angepasst („hides system exit without a hyperdrive like STU“, Fixture mit Warpantrieb). Vitest `components/spacecraft`, `spacecraft-detail`, `tutorial-targets` 264/264; `nx typecheck frontend` ✓; `nx lint frontend` 127 Warnungen vorher wie nachher.
- Modell: Claude Opus 5.5 direkt.
- Ausstehend: Entscheidung Kartographie; gesammelter Verifikationslauf.
