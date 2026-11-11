# Erkundete Ebene: vollständige Darstellung und ADR

**Status:** ready-for-agent
**Priority:** P2
**Size:** S
**Blocked by:** tmw-K5b, tmw-K5d

## Ziel

Eine Spieler-Ebene im Status `EXPLORED` wird nach dem Löschen ihrer persönlichen Nebeldaten dauerhaft vollständig dargestellt. Frontend, Tests und Architekturdokumentation verwenden dieselbe Semantik.

## STU-Quellen

- `src/Lib/Trait/LayerExplorationTrait.php#hasExplored`
- `src/Module/Starmap/View/ShowUserStarmapData/*`
- `src/Module/Starmap/View/ShowUserStarmapImage/*`
- `src/Module/Maintenance/MapCycle.php`

## SWU-Pfade

- Kartenabfragen unter `apps/backend/src/modules/starmap/`
- `apps/frontend/src/pages/starmap.tsx`
- `docs/adr/`
- `CONTEXT.md`

## Akzeptanzkriterien

- [ ] Für `EXPLORED` liefern alle Kartenabfragen sämtliche Felder der Ebene, obwohl keine persönlichen Felderkundungszeilen mehr existieren.
- [ ] Für `KNOWN` bleibt die persönliche Nebel- und Felderkundungssemantik erhalten.
- [ ] Persönliche Systementdeckung wird durch `EXPLORED` nicht ersetzt: geschützte Systemdetails bleiben von der bestehenden Systemkenntnis abhängig.
- [ ] Kartographiepläne und ihre Abschlusslogik gemäß ADR-0002/0003 bleiben unverändert.
- [ ] Das Frontend zeigt vollständig erkundete Ebenen ohne Nebellücken und wechselt nach aktualisiertem Status ohne erforderliche Neuanlage von Felderkundungsdaten.
- [ ] Eine ADR `docs/adr/<nächste freie Nummer>-ebenenkenntnis-und-kartenzyklus.md` beschreibt `KNOWN`, `EXPLORED`, Bekanntwerden, Zugriff, Zyklus, Ereignis und das Verhältnis zu ADR-0002/0003.
- [ ] `CONTEXT.md` definiert die Begriffe „bekannte Ebene“ und „erkundete Ebene“ konsistent mit der ADR.
- [ ] Backend- und Frontend-Tests decken vollständige Darstellung nach Nebellöschung sowie unveränderte Systementdeckung ab.

## Entscheidung

`EXPLORED` ist eine Darstellungseigenschaft der Ebene, keine pauschale Entdeckung aller darin enthaltenen Sternensysteme.

## Comments

### 2026-11-11 — K5e candidate evidence

- Candidate base: `1c59e45de662b1eae9f3ce098f57661e37b384dc`; candidate tree: `652a10a23763843cd29804cdc4d2c3f5543c78f4` before tracker/report metadata; working changes are limited to the K5e map-query behavior, production HTTP and rendered-page tests, `CONTEXT.md`, and ADR-0008.
- Production HTTP acceptance gate `tmw-k5e-http-green-final-20261111-12`: exit 0, 1 suite / 52 tests passed. It ran authenticated production `AppModule` HTTP over migration-backed PostgreSQL, the real cycle, confirmed all 25 map fields after fog deletion and an empty exploration endpoint, retained partial `KNOWN` field visibility, and kept undiscovered system detail/grid at 404.
- Focused service tests `tmw-k5e-backend-unit-final-20261111-02`: exit 0, 3 suites / 12 tests passed. Export integration `tmw-k5e-export-int-final-20261111-02`: exit 0. Rendered page `tmw-k5e-frontend-final-20261111-02`: exit 0, 1 file / 38 tests passed. ESLint `tmw-k5e-eslint-final-20261111-02` on the three modified code files: exit 0. Verified passing receipt hashes against current source with `verify-evidence-fast-20261110.py` at 10:18:41 UTC.
- Backend and frontend application-only `tsc --noEmit` gates did not pass: project-reference outputs for `packages/shared/dist/index.d.ts` were missing (TS6305), along with baseline diagnostics; no tracked or excluded build/config artifacts were created.
- Earlier HTTP fixture iterations exposed and corrected test-only assumptions (sector bounds, DTO ordering, full 25-cell sector). The passing gate is the final current test-source checkpoint. Timed gate logs and JSON receipts are in `.workmux/gates/`.
- UTC final gates: HTTP 10:07:39–10:08:29; backend unit 10:11:08–10:11:11; frontend 10:11:16–10:11:21. Independent Standards/Security and Spec reviews remain outstanding; this is candidate evidence, not resolution.

### 2026-11-11 — final stable-source receipt update

- Final stable-source candidate commit: `1542519` (`fix(starmap): display explored layers after map cycle`), tree `6c7c87da07044e1dc0fb82373e54462f9d4d0bf2` before tracker/report-only metadata. This commit contains the K5e code/docs but not this ticket comment; the tracker evidence is recorded in a separate K5e-only commit.
- Final gated source remained unchanged at the requested base HEAD/tree during execution. Production HTTP gate `tmw-k5e-http-final-stable-20261111-13` passed 52/52; focused backend units `tmw-k5e-backend-unit-final-stable-20261111-03` passed 12/12; export integration `tmw-k5e-export-int-final-stable-20261111-03` passed 4/4; frontend rendered page `tmw-k5e-frontend-final-stable-20261111-03` passed 38/38; ESLint passed. Receipt identity verification completed 10:28:41 UTC.
- The requested compact report is `.workmux/tmw-K5e-fast-report-20261111.md` (24 lines). Backend/frontend application typechecks remain blocked by missing shared project-reference output and baseline TS diagnostics. No full-suite claim. Status remains `ready-for-agent`; all review boxes remain unchecked pending independent Standards/Security and Spec reviews.
