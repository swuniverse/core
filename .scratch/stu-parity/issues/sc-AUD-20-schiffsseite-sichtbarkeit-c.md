# Schiffsseite: Shuttle-Zeile und Systemwechsel wie STU (Paket C)

> Umbenannt am 2026-11-23: zuerst versehentlich als `sc-AUD-16` angelegt (Nummer war schon vergeben). Commit-Nachrichten dieses Tickets nennen noch `sc-AUD-16`.

**Status:** resolved
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
- [x] Kartographie nach STU-Makro `astroStates` (Entscheidung Projektinhaber 2026-11-23, siehe unten).

## Entscheidung: Kartographie nach STU (2026-11-23, Projektinhaber)

STU knüpft Aktionen und Texte an das aktive Astrometrie-Labor (`getAstroState`): „System kartographieren“ bei aktivem Labor, sonst „System nicht kartographiert“; „Verbleibende Messpunkte“ nur bei aktivem Labor, sonst „Kartographierung ist geplant (System)“; „Kartographierung wird finalisiert (noch N Ticks)“; Region ohne Labor zeigt nichts. SWU folgt bewusst anderen Regeln aus `stu-messpunkt-systemkartographie/07` („nur lokal qualifizierte Schiffe erhalten Plan-/Finalisierungsaktionen“) und `tmw-K8b3` („bei nicht erfüllten Voraussetzungen … zeigt den Grund“). Eine Angleichung würde 11 bestehende Tests und diese Entscheidungen umkehren.

## Comments

### 2026-11-23 — umgesetzt (ohne Kartographie), Prüfung ausstehend

Commit: `feat(spacecraft): STU shuttle row and system enter/leave visibility (stu-parity sc-AUD-16, jetzt sc-AUD-20)`

- Tests: neu `ShuttleManagementPanel.spec.tsx` (2); `FieldContextPanel.spec.tsx` angepasst („hides system exit without a hyperdrive like STU“, Fixture mit Warpantrieb). Vitest `components/spacecraft`, `spacecraft-detail`, `tutorial-targets` 264/264; `nx typecheck frontend` ✓; `nx lint frontend` 127 Warnungen vorher wie nachher.
- Modell: Claude Opus 5.5 direkt.
- Ausstehend: Entscheidung Kartographie; gesammelter Verifikationslauf.

### 2026-11-23 — Kartographie nach STU umgesetzt, Prüfung ausstehend

Commit: `feat(spacecraft): STU cartography wording and lab rule (stu-parity sc-AUD-20)`

- Aktionen und Texte folgen dem aktiven Astrometrie-Labor (STU `getAstroState`): „System/Region kartographieren“, „Verbleibende Messpunkte: N“ oder „Kartographierung ist geplant (System|Region)“, „Kartographierung finalisieren (System|Region)“, „Kartographierung wird finalisiert (noch N Ticks)“, „System/Region ist kartographiert“. Region ohne aktives Labor zeigt nichts.
- Ersetzt bewusst die Regeln aus `stu-messpunkt-systemkartographie/07` (Aktionen nur für lokal qualifizierte Schiffe) und `tmw-K8b3` (Grund statt Aktion): Gründe des Backends erscheinen jetzt nach dem Klick im Meldungsdialog. 11 Tests in `FieldContextPanel.spec.tsx` auf die STU-Regel umgeschrieben, 1 neu (Region ohne Labor).
- Checks: Vitest `FieldContextPanel.spec.tsx` 51/51; `components/spacecraft` + `spacecraft-detail` + `tutorial-targets` 259/259; volle Frontend-Suite 980/981 — der Fehlschlag `player-profile.spec.tsx` („groups scanned ship logbooks…“) betrifft keine Datei dieses Tickets (`player-profile.tsx` importiert nichts davon); im Arbeitsbaum liegt zudem eine fremde, nicht committete Änderung an `apps/frontend/src/lib/assets.ts`. `nx typecheck frontend` ✓; `nx lint frontend` 127 Warnungen vorher wie nachher.

- 2026-11-23 – **Prüfung bestanden, resolved.** Gesammelter Verifikationslauf auf `afa856fb`: Lint 0 Fehler (in den geänderten Dateien keine Warnung), `nx typecheck` und `nx build` alle Projekte grün, Unit Backend 2739/2739, Frontend 990/991 (Ausreißer `settings-tutorial.spec.tsx` einzeln 23/23 grün, nicht berührt), PostgreSQL-Integration 1076/1076. Diff-Review gegen Akzeptanzkriterien ohne Befund (Rechte: Kolonie-Eigentum, Orbit, Tarnung; Flottenendpunkte prüfen den Eigner). Modell: Opus 5.5 direkt.
