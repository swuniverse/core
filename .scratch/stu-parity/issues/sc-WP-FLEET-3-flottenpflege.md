# Flottenpflege: ausblenden, priorisieren, Sichtbarkeit

**Status:** resolved
**Priority:** P3
**Size:** S
**Blocked by:** sc-WP-FLEET-1b

## Ziel

Spieler mit vielen Flotten können wie in STU Flotten in der Schiffsliste einklappen bzw. ausblenden, ihre Reihenfolge festlegen und die Sichtbarkeit umschalten.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Ship/Action/{HideFleet,ShowFleet,PriorizeFleet,ToggleFleetVisibility}`
- `html/view/shiplist.twig`

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/entities/fleet.entity.ts` (Spalten `sort`, `isHidden`)
- `apps/backend/src/modules/spacecraft/spacecraft.controller.ts`, `spacecraft.service.ts`
- `apps/frontend/src/pages/spacecraft.tsx`

## Akzeptanzkriterien

- [x] Flotten haben eine persistente Sortierung; „nach oben“ verschiebt eine Flotte an die erste Stelle (STU `PriorizeFleet`).
- [x] Ausgeblendete Flotten zeigen nur die Kopfzeile; der Zustand bleibt nach Neuladen erhalten.
- [x] Migration nach `docs/typeorm-migrations.md`; Backend-Tests für Sortierung und Ausblenden; Frontend-Test für Einklappen.
- [x] `lint`, `typecheck`, `test` und `build` sind grün.

## Comments

- 2026-10-29: Umsetzung und issue-spezifische Backend-/Frontend-Tests waren grün, ebenso `nx run-many --targets=build`. Die vorgeschriebene Gesamtabnahme scheitert jedoch nach zwei ernsthaften Versuchen an bestehenden, issue-fremden Fehlern: `frontend:typecheck` meldet zahlreiche TS6305-Fehler wegen fehlender `apps/frontend/dist/**/*.d.ts`-Buildartefakte sowie bestehende TS7006-Fehler; `frontend:test` scheitert in `src/pages/research.spec.tsx` (`button` mit Name `/eine von/` fehlt). Produktcode wurde gemäß Abbruchregel verworfen. Bitte die Baseline-Prüfungen reparieren oder bestätigen, dass diese bekannten Fehler für den Durchlauf ausgenommen werden dürfen.
- 2026-11-09: Die integrierte Baseline 14b86081/c8e14f1c beseitigt den zuletzt dokumentierten fachfremden Blocker (Frontend-Typecheck und Research-Test); reguläre Nx-Lint-/Typecheck-/Build-Gates und vollständige Tests sind laut Baseline-Review grün, lokale Test-Spieldaten waren dafür vorhanden. Status ready-for-agent; vorhandene Issue-Abhängigkeiten bleiben verbindlich. Dies belegt keine Feature-Fertigstellung: verworfene Änderungen müssen neu umgesetzt und die aktuellen Issue-Tests und Pflicht-Gates erneut ausgeführt werden; keine Ausnahme.


## Answer

- Migration `20261116133000-add-fleet-list-preferences.ts` ergänzt `fleets.sort` (Standard 0) und `fleets.isHidden` (Standard false). Bestehende Flotten bleiben eingeblendet; gleiche Prioritäten werden deterministisch nach Flotten-ID sortiert.
- Eigentümergeschützte API: `PATCH /spacecraft/fleets/:fleetId/visibility` mit `{ isHidden }` und `POST /spacecraft/fleets/:fleetId/prioritize`. Sichtbarkeit und Sortierung werden transaktional geändert, ohne Mitgliedschaft, Führung oder andere Flotteneigenschaften zu überschreiben.
- „Nach oben“ setzt die gewählte Flotte an die erste Stelle und erhält die relative Reihenfolge aller übrigen eigenen Flotten. Stabile Sperrreihenfolge und begrenzte Ränge sichern gleichzeitige Priorisierungen ab. `fleets/all` und die Schiffsliste verwenden die gespeicherte Reihenfolge.
- Flottenköpfe bieten „Ausblenden“/„Einblenden“ und „Nach oben“. Ausgeblendete Flotten zeigen ausschließlich den Kopf mit Bedienung und Schiffsanzahl; der Zustand überlebt Neuladen. API-Fehler werden angezeigt, laufende Pflegeaktionen sperren weitere Pflegeaktionen.
- Sichtbarkeit bezieht sich auf die eigene Schiffsliste, entsprechend den STU-Session-Schaltern; `isHidden` fasst diese Darstellung als dauerhafte Einstellung zusammen.

## Validation

- `npx nx run backend:test --runInBand --testPathPatterns=spacecraft-fleet.service`: 16 Tests grün.
- `npx nx run frontend:test --run --testNamePattern=SpacecraftPage`: 13 Tests grün, einschließlich Einklappen über erneutes Mounten, Einblenden, Priorisierung und Fehlerbehandlung.
- `npx nx run backend:test-integration --runInBand --testPathPatterns=fleet-concurrency`: 27 PostgreSQL-Tests grün. Neue Fälle prüfen Persistenz, Eigentümerschutz, parallele Priorisierung, Änderungen während Flottenverlegung sowie Migration/Rollback mit vorhandenen Flotten.
- `npx nx affected -t lint typecheck test --base=HEAD --parallel=2`: grün; Backend 232 Suites / 2226 Tests, Frontend 110 Dateien / 799 Tests. Bestehende Lintwarnungen, keine Fehler.
- `npx nx run-many --targets=build`: alle drei Projekte grün. Backend-Deklarationen anschließend erneut erzeugt.
