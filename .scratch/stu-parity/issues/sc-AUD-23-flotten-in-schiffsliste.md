# Flotten nur in der Schiffsliste wie STU

**Status:** resolved
**Priority:** P3
**Size:** S
**Blocked by:** —

## Ziel

STU verwaltet Flotten in der Schiffsliste (`src/html/shiplistmacros.twig` Z. 183–205): die letzte Zelle jeder Zeile erstellt eine Flotte (`B_NEW_FLEET`, Name „Flotte“, `CreateFleet.php` Z. 53), verlässt sie oder löst sie als Führer auf. Die Schiffsansicht hat keine Flottenleiste.

## Akzeptanzkriterien

- [x] Schiffsansicht: Leiste „Keine Flotte / Flotte erstellen / verlassen / fixieren / umbenennen / Leader wechseln / auflösen“ und ihr Dialog entfernt.
- [x] Schiffsliste: Spalte „Flotte“ mit Icon `fl_flag1` (erstellen, Name „Flotte“), `fl_raus1` (verlassen), `fl_flag2` (auflösen, nur Führer).
- [x] Formular „Neue Flotte“ unter der Liste entfernt; Umbenennen bleibt im Flottenkopf.
- [x] Icons `fl_flag1-3`, `fl_raus1-2` aus den STU-Assets übernommen (Submodul `assets`).

- [x] Block „Flottenstatus“ rechts in der Schiffsansicht (STU `control_right.twig`, Makro `fleetInfo`): Mitglied sieht „zum Führungsschiff wechseln“; Führer mit weiteren Schiffen sieht Checkbox „fixiert“ und pro Mitglied Bild, Name, Balken für Hülle/Schilde/Energie/Hyperantrieb und Flagge „Flottenführung wechseln“. Icons `modul_1/2/8/11` aus STU übernommen.

## Comments

### 2026-11-23 — umgesetzt, Prüfung ausstehend

- Tests: `spacecraft.spec.tsx` (Flottenaktionen pro Zeile statt Formular; Zählung im Sichtbarkeitstest von 2 auf 1, die zweite Fundstelle war die Option im entfernten Formular); `ShipHeaderTable.spec.tsx` drei Flottentests durch „keine Flottenleiste“ ersetzt. Vitest `pages` + `components/spacecraft` 792/792; `nx typecheck frontend` ✓.
- Modell: Claude Opus 5.5 direkt.

### 2026-11-23 — Flottenstatus umgesetzt, Prüfung ausstehend

- Daten aus `GET /spacecraft` (Listen-DTO), kein Backend-Umbau; `fleetIsFixed` im Detail-Typ ergänzt.
- Abweichung: STU zeigt zusätzlich Icons beschädigter Systeme je Mitglied; fehlt, weil das Listen-DTO nur vier Systeme kennt.
- Tests: neu `FleetStatusPanel.spec.tsx` (4). Vitest `components/spacecraft` + `pages` 796/796; `nx typecheck frontend` ✓.

### 2026-11-23 — Schiffe zur Flotte hinzufügen, Prüfung ausstehend

- STU `shiplistFleetform.twig` (Icon `fl_join`), `ShowAvailableShips` + `getPossibleFleetMembers` (eigene Schiffe ohne Flotte am Standort des Führers, nicht im Umbau), `JoinFleetInShiplist`.
- SWU: Icon im Flottenkopf der Schiffsliste öffnet „Schiff(e) hinzufügen“ mit Checkboxen; Kandidaten = Einzelschiffe mit Status `IDLE` auf dem Feld des Führers (Backend verlangt `IDLE`). Beitritt je Schiff über `POST /spacecraft/fleets/:id/join`; Ablehnungen pro Schiff als Meldung. Leer: „Keine Schiffe vorhanden“. Icons `fl_join1/2` aus STU.
- Tests: `spacecraft.spec.tsx` +1. Vitest `pages` + `components/spacecraft` grün; `nx typecheck frontend` ✓.

- 2026-11-23 – **Prüfung bestanden, resolved.** Gesammelter Verifikationslauf auf `afa856fb`: Lint 0 Fehler (in den geänderten Dateien keine Warnung), `nx typecheck` und `nx build` alle Projekte grün, Unit Backend 2739/2739, Frontend 990/991 (Ausreißer `settings-tutorial.spec.tsx` einzeln 23/23 grün, nicht berührt), PostgreSQL-Integration 1076/1076. Diff-Review gegen Akzeptanzkriterien ohne Befund (Rechte: Kolonie-Eigentum, Orbit, Tarnung; Flottenendpunkte prüfen den Eigner). Offene Abweichung: Flottenstatus ohne Icons beschädigter Systeme je Mitglied. Modell: Opus 5.5 direkt.
