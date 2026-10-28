# Forschungsbaum: EXCLUDE- und REQUIRE_SOME-Kanten unterscheiden

**Status:** needs-info
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

- [ ] REQUIRE-, REQUIRE_SOME- und EXCLUDE-Kanten haben unterschiedliche Farben bzw. Strichart mit Legende.
- [ ] Gesperrte (ausgeschlossene) Forschungen sind im Baum als ausgeschlossen erkennbar.
- [ ] Frontend-Test: die drei Kantentypen werden unterschiedlich gerendert.

## Comments

- 2026-10-28: Implementierung und fokussierte Backend-/Frontend-Tests sind grün; `npx nx run-many --targets=build` ist grün. Der verpflichtende Lauf `npx nx affected -t lint typecheck test --base=HEAD` scheitert nach zwei ernsthaften Versuchen am bereits vorhandenen globalen Frontend-Typecheck (u. a. `database.tsx:1015` Faction-Typfehler sowie zahlreiche TS6305-Ausgabedateifehler außerhalb dieses Issues). Soll der Lauf trotz dieses bekannten Baseline-Blockers abgeschlossen werden, oder soll zuerst der globale Frontend-Typecheck repariert werden?
