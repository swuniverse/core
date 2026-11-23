# Flotten nur in der Schiffsliste wie STU

**Status:** claimed
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

## Offen

- Flotte fixieren und Flottenführer wechseln gibt es jetzt nirgends mehr. STU hat beides im Block „Flottenstatus“ rechts in der Schiffsansicht des Führers (`control_right.twig`, Makro `fleetInfo`).

## Comments

### 2026-11-23 — umgesetzt, Prüfung ausstehend

- Tests: `spacecraft.spec.tsx` (Flottenaktionen pro Zeile statt Formular; Zählung im Sichtbarkeitstest von 2 auf 1, die zweite Fundstelle war die Option im entfernten Formular); `ShipHeaderTable.spec.tsx` drei Flottentests durch „keine Flottenleiste“ ersetzt. Vitest `pages` + `components/spacecraft` 792/792; `nx typecheck frontend` ✓.
- Modell: Claude Opus 5.5 direkt.
