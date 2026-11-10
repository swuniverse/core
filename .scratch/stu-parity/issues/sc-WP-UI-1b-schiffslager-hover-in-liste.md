# Lager-Hover am Schiffbild in der Schiffsliste

**Status:** resolved
**Priority:** P2
**Size:** S
**Blocked by:** —

## Ziel

Wie in STU zeigt ein Hover über dem Schiffsbild in der Schiffsliste den Lagerinhalt (Waren mit Icon und Menge, Belegung/Kapazität). Umgesetzt mit der gemeinsamen Tooltip-Komponente aus sh-AP-11, ohne Ad-hoc-Hover-Panel.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Spacecraft/View/ShowSpacecraftStorage`, `html/spacecraft/spacecraftStorage.twig`
- `html/shiplistmacros.twig` (Bild mit Lager-Hover)

## SWU-Pfade

- `apps/frontend/src/pages/spacecraft.tsx`
- `apps/frontend/src/components/spacecraft/ShipStoragePanel.tsx`, `ShipSymbol.tsx`
- `apps/backend/src/modules/spacecraft/spacecraft.controller.ts` (`GET :id/cargo`)
- Tooltip-Komponente aus sh-AP-11

## Akzeptanzkriterien

- [x] Hover (Desktop) bzw. Tap (Touch) auf das Schiffsbild zeigt sofort einen Tooltip mit Tabelle: Titel „Lager“, Waren mit Icon (`/assets/commodities/<id>.png`) und Menge, darunter Belegung/Kapazität.
- [x] Cargo-Mengen und Belegung/Kapazität werden mit deutscher Tausendertrennung dargestellt.
- [x] Das Lager wird erst beim ersten Hover geladen (lazy) und je Schiff gecacht; leeres Lager zeigt „Leer“.
- [x] Frontend-Test: Hover löst genau einen Ladevorgang aus und rendert Ware und Menge.
- [x] Frontend-Test: Mengen 1234 und Kapazität 10000 werden im produktiven Tooltip als „1.234“ bzw. „10.000“ gerendert.
- [x] `lint`, `typecheck`, `test` und `build` sind grün.

## Comments

- 2026-10-23: Umsetzung und fokussierter Frontend-Test sind grün; Build ist grün. Der vorgeschriebene Gesamt-Testlauf scheitert nach zwei Versuchen reproduzierbar an dem unabhängigen bestehenden Test `apps/frontend/src/pages/research.spec.tsx:648` (Button `/eine von/` fehlt). Produktcode gemäß Abbruchregel verworfen; bitte den Forschungs-Test/Stand reparieren oder bestätigen, dass dieser externe Fehler für den Abschluss ignoriert werden darf.
- 2026-10-27: Erneuter test-first Versuch: fokussierter Frontend-Test grün (6/6), `nx run-many --targets=build` grün. `npx nx affected -t lint typecheck test --base=HEAD` scheitert erneut in zwei ernsthaften Versuchen, diesmal im Frontend-Typecheck mit zahlreichen bestehenden `TS6305`-Fehlern zu fehlenden `apps/frontend/dist/**/*.d.ts`-Ausgaben (zusätzlich bestehende Folgefehler in Tests). Produktcode gemäß Abbruchregel verworfen. Bitte den Frontend-Typecheck/Build-Referenzzustand reparieren oder bestätigen, wie dieser externe Fehler behandelt werden soll.
- 2026-10-30 Product Owner: Option 1. Das Issue wird gegen den aktuellen Repository-Stand erneut freigegeben. Die historischen Fehler in `research.spec.tsx:648` und der durch `sh-AP-21` behobene TS6305-/Typecheck-Fehler gelten weder automatisch als fortbestehende Blocker noch als dauerhafte Ausnahme. Fokussierte Tests sowie die aktuellen Lint-, Typecheck-, Test- und Build-Gates bleiben vorgeschrieben; nur frisch reproduzierte Fehler werden nach der bestehenden Abbruchregel behandelt.
- 2026-10-30: Dritter test-first Versuch: fokussierter Frontend-Test grün (8/8), Frontend-Typecheck nach Build grün und `nx run-many --targets=build` grün. Der vorgeschriebene `npx nx affected -t lint typecheck test --base=HEAD` scheitert nach zwei ernsthaften Versuchen an gleichzeitig vorhandenen, fachfremden Änderungen: `tutorial.service.spec.ts:22` kompiliert nicht (`TS2554`, Service-Signatur passt nicht zur Fixture) und `spacecraft-core-controls.spec.ts` scheitert mit `this.shipRepo.findOneBy is not a function`. Produktcode gemäß Abbruchregel verworfen. Bitte diese aktuelle Testbaseline reparieren bzw. die konkurrierenden Änderungen abschließen und das Issue danach erneut freigeben.
- 2026-11-09: Die integrierte Baseline 14b86081/c8e14f1c beseitigt den zuletzt dokumentierten fachfremden Blocker (Tutorial-Konstruktor- und Spacecraft-Repository-Fixtures); reguläre Nx-Lint-/Typecheck-/Build-Gates und vollständige Tests sind laut Baseline-Review grün, lokale Test-Spieldaten waren dafür vorhanden. Status ready-for-agent; vorhandene Issue-Abhängigkeiten bleiben verbindlich. Dies belegt keine Feature-Fertigstellung: verworfene Änderungen müssen neu umgesetzt und die aktuellen Issue-Tests und Pflicht-Gates erneut ausgeführt werden; keine Ausnahme.
- 2026-11-10: Implementiert im Frontend mit der gemeinsamen Tooltip-Komponente: Cargo lädt beim ersten Öffnen (Hover, Fokus oder Touch), pro Schiff werden erfolgreiche Anfragen gecacht und fehlgeschlagene Anfragen können erneut versucht werden. Tooltip zeigt Warenicon/-menge, Belegung/Kapazität bzw. „Leer“; öffentliche Schiffsliste-Tests decken Lazy Load, Cache, verschiedene Schiffe und Touch ab. Verifikation: `ui1b-red-fleet-hover-v2` war vor Implementierung rot (beide neuen Schiffslager-Verhaltenstests scheiterten am fehlenden Tooltip-Auslöser); `ui1b-green-hover-second` und `ui1b-focused-after-guard` grün. Finale direkte Gates grün: `ui1b-frontend-test-final` 93 Dateien/666 Tests, keine Skips; `ui1b-lint-final`; `ui1b-typecheck-final` (erzwungener spec-inklusiver Build); `ui1b-build-final`. Build meldet vorhandene CSS-@import-Reihenfolge- und Chunkgrößen-Warnungen; Lint meldet bestehende projektweite Warnungen. Gate-Logs/Receipts sind unter `.workmux/gates/`.
- 2026-11-10 Standards-Korrektur: Unabhängiges Standards-Review meldete zwei Abweichungen (Shared-DTO-Feld außerhalb des kanonischen List-DTO; nicht lokalisierte Cargo-Zahlen). Der ursprüngliche Implementierungs- und Gate-Verlauf oben bleibt unverändert. Die zwei Findings wurden gezielt behoben: `SpacecraftListDto` enthält nun `cargoMax`, Frontend verwendet nur den Shared-Typ ohne optionales Duplikat/Fallback; Tooltip-Mengen, Belegung und Kapazität verwenden `formatNumber`. Produktions-Schiffsliste-Regression mit 1234/10000 zeigte vor Fix die erwarteten Werte nicht (`ui1b-correction-format-red`, Exit 1) und ist danach grün (`ui1b-correction-format-green`). Frische direkte Gates: shared build, Frontend- und Backend-spec-inklusive erzwungene TypeScript-Builds, Frontend lint, kompletter Frontend-Testlauf (93 Dateien/667 Tests, keine Skips) und Frontend build; alle Exit 0. Keine Backend-Laufzeitdatei geändert und keine Backend-Suite ausgeführt. Korrekturbericht: `.workmux/sc-WP-UI-1b-correction-report-20261110.md`. Kandidat und Akzeptanz sind vollständig, die unabhängige enge Re-Review steht noch aus; nicht integriert.
