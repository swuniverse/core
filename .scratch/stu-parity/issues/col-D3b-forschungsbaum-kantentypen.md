# Forschungsbaum: EXCLUDE- und REQUIRE_SOME-Kanten unterscheiden

**Status:** resolved
**Priority:** P3
**Size:** S
**Blocked by:** —

## Ziel

Der SWU-Forschungsbaum zeichnet alle Abhängigkeiten gleich. Der STU-Admin-Baum unterscheidet EXCLUDE (rot) und REQUIRE_SOME (blau) von REQUIRE. Spieler sollen so erkennen, welche Forschungen sich gegenseitig ausschließen und wo eine von mehreren Voraussetzungen genügt.

## STU-Quellen

- `src/Module/Admin/View/ResearchTree/`

## SWU-Pfade

- `apps/frontend/src/pages/research-tree.tsx`
- `apps/backend/src/modules/research/research.service.ts` (Abhängigkeitsdaten im Baum-Payload)

## Akzeptanzkriterien

- [x] REQUIRE-, REQUIRE_SOME- und EXCLUDE-Kanten haben unterschiedliche Farben bzw. Strichart mit Legende.
- [x] Gesperrte (ausgeschlossene) Forschungen sind im Baum als ausgeschlossen erkennbar.
- [x] Frontend-Test: die drei Kantentypen werden unterschiedlich gerendert.

## Comments

- 2026-10-28: Implementierung und fokussierte Backend-/Frontend-Tests sind grün; `npx nx run-many --targets=build` ist grün. Der verpflichtende Lauf `npx nx affected -t lint typecheck test --base=HEAD` scheiterte damals am globalen Frontend-Typecheck. Die zuvor dokumentierte Baseline-Ausnahme ist durch die Fertigstellung von `sh-AP-21` am 2026-10-30 überholt. Das Issue ist mit den regulären Gates erneut auszuführen; keine Baseline-Ausnahme gilt.
- 2026-11-09: Implementierung und unabhängige Review ohne Findings integriert bei `c8e14f1c`: rebasiertes `b46988ff` (Verhalten), `67e8d36e` (Produktionsrenderer-Tests) und `c8e14f1c` (typisierte Adapter). Frischer fokussierter Frontend-Lauf 15/15; gemeldeter vollständiger Frontend-Lauf 92 Dateien/655 Tests (Shared-Build aus Cache). Frischer unabhängiger Backend-Lauf 211/211 Suites, 1981/1981 Tests ohne Skips, darunter Research-Service 28/28. Reguläre Lint-, Typecheck- und Build-Gates bestanden laut Bericht; Cache-Nutzung bei Types/Builds, diese Gates hier nicht frisch wiederholt. SVG-, Label- und Marker-Mutationen sowie typisierte Adapter wurden geprüft. Renderer-Tests nutzen Produktionskomponenten und BaseEdge, aber mocken ReactFlow-Wrapper, ELK, Geometrie und Marker-URLs: kein Nachweis für reales Browser-Layout oder tatsächliche Pfeilspitzen. Kein forschungsspezifischer PostgreSQL-Test gefunden; unveränderte Baseline 36 Suites/290 Integrationstests nicht erneut ausgeführt. Status `resolved`.
