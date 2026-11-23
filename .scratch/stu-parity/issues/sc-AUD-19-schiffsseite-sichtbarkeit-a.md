# Schiffsseite: Einträge nur bei vorhandener Voraussetzung (Paket A, Frontend)

> Umbenannt am 2026-11-23: zuerst versehentlich als `sc-AUD-15` angelegt (Nummer war schon vergeben). Commit-Nachrichten dieses Tickets nennen noch `sc-AUD-15`.

**Status:** resolved
**Priority:** P2
**Size:** M
**Blocked by:** —

## Ziel

STU zeigt Funktionen der Schiffsseite nur, wenn das Schiff die Voraussetzung hat (installiertes System, Batteriekapazität). SWU zeigte viele Einträge immer. Paket A umfasst alle Einträge, deren STU-Bedingung sich aus Daten ergibt, die die Seite schon hat. Quelle der Prüfliste: `.scratch/stu-parity/inventory/schiffsseite-vollabdeckung.md`, Teil 4.

## STU-Quellen

- `src/html/spacecraft/spacecraft.twig` (Alarm mit `hasComputer`, Warp mit `hasWarpdrive`, LSS-Filter mit `hasLss`, NBS mit `hasNbs`, Systemsymbole für alle installierten Systeme)
- `src/html/spacecraft/control/control_nav.twig` (`hasLss`, `canMove`)
- `src/html/spacecraft/control/control_right.twig` (Reaktor-Block, Warp-Block `hasWarpDrive`, Ersatzbatterie `getMaxBattery > 0`)

## Akzeptanzkriterien

- [x] Kopf: Hyperantrieb nur mit `WARPDRIVE`, Batterie nur bei `batteryMax > 0`, Alarmstufe nur mit `COMPUTER`, Schnellaktion „Sensoren“ (LSS-Filter) nur mit `LONG_RANGE_SENSORS`.
- [x] Kopf: Systemsymbole für alle 28 SWU-Systeme (vorher 18), Symbole nach STU-Systemnummer; Ablenkschirm, Matrix und Uplink zeigten vorher das EPS-Symbol.
- [x] Navigation: LSS-Umschalter nur mit `LONG_RANGE_SENSORS`; Blindflugraster und Richtungssteuerung nur mit `WARPDRIVE` oder `SUBLIGHT_DRIVE`.
- [x] NBS-Block nur mit `SHORT_RANGE_SENSORS`.
- [x] Reaktor-Panel: Reaktorzeile nur mit `REACTOR`, Warp-Verteilung und Hyperantrieb-Schalter nur mit `WARPDRIVE`, Ersatzbatterie nur bei `batteryMax > 0`; ganz ausgeblendet, wenn nichts davon zutrifft.
- [x] Frontend-Tests für jedes Ausblenden.

## Nicht in Paket A

- Paket B (braucht Backend-Flags): Reparatur (`canBeRepaired`), Karte (Layer bekannt), Boje setzen (`hasStoredBuoy`), Selbstzerstörung bei Konstrukt.
- Paket C: Shuttle-Leerzustand, „System verlassen“ nur wenn verlassbar, Kartographie-Bedingung.
- Handel (Standort statt Andocken): Modellentscheidung offen.

## Comments

### 2026-11-23 — umgesetzt, Prüfung ausstehend

Commit: `feat(spacecraft): show ship page entries only with their STU prerequisite (stu-parity sc-AUD-15, jetzt sc-AUD-19)`

- Bestehende Fixtures ergänzt, die Systeme stillschweigend voraussetzten (Navigation: Warp/Impuls; Kopf: Warp, Computer; Tutorial-Ziele: Computer).
- Checks: Vitest `components/spacecraft`, `spacecraft-detail`, `tutorial-targets` 262/262 (4 neue Tests); `nx typecheck frontend` ✓; `nx lint frontend` 127 Warnungen vorher wie nachher.
- Modell: Claude Opus 5.5 direkt.
- Ausstehend: gesammelter Verifikationslauf.

- 2026-11-23 – **Prüfung bestanden, resolved.** Gesammelter Verifikationslauf auf `afa856fb`: Lint 0 Fehler (in den geänderten Dateien keine Warnung), `nx typecheck` und `nx build` alle Projekte grün, Unit Backend 2739/2739, Frontend 990/991 (Ausreißer `settings-tutorial.spec.tsx` einzeln 23/23 grün, nicht berührt), PostgreSQL-Integration 1076/1076. Diff-Review gegen Akzeptanzkriterien ohne Befund (Rechte: Kolonie-Eigentum, Orbit, Tarnung; Flottenendpunkte prüfen den Eigner). Modell: Opus 5.5 direkt.
