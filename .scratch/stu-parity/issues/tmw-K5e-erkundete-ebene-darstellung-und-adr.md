# Erkundete Ebene: vollständige Darstellung und ADR

**Status:** resolved
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

- [x] Für `EXPLORED` liefern alle Kartenabfragen sämtliche Felder der Ebene, obwohl keine persönlichen Felderkundungszeilen mehr existieren.
- [x] Für `KNOWN` bleibt die persönliche Nebel- und Felderkundungssemantik erhalten.
- [x] Persönliche Systementdeckung wird durch `EXPLORED` nicht ersetzt: geschützte Systemdetails bleiben von der bestehenden Systemkenntnis abhängig.
- [x] Kartographiepläne und ihre Abschlusslogik gemäß ADR-0002/0003 bleiben unverändert.
- [x] Das Frontend zeigt vollständig erkundete Ebenen ohne Nebellücken und wechselt nach aktualisiertem Status ohne erforderliche Neuanlage von Felderkundungsdaten.
- [x] Eine ADR `docs/adr/<nächste freie Nummer>-ebenenkenntnis-und-kartenzyklus.md` beschreibt `KNOWN`, `EXPLORED`, Bekanntwerden, Zugriff, Zyklus, Ereignis und das Verhältnis zu ADR-0002/0003.
- [x] `CONTEXT.md` definiert die Begriffe „bekannte Ebene“ und „erkundete Ebene“ konsistent mit der ADR.
- [x] Backend- und Frontend-Tests decken vollständige Darstellung nach Nebellöschung sowie unveränderte Systementdeckung ab.

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

### 2026-11-11 — independent review and bounded correction

- Preserved original independent review record: `.workmux/local-inputs/k5e-fast-spec-review-20261111.md`. Spec verdict: **BLOCKED, one confirmed P2**—ADR-0008 did not describe how an unknown layer becomes `KNOWN`, as required by criterion 33. Standards/security verdict received from the independent reviewer: **PASS0** for the original candidate; that review does not dispose of the Spec finding and is unchanged by this doc-only correction.
- Corrected only `docs/adr/0008-ebenenkenntnis-und-kartenzyklus.md`: added “Bekanntwerden einer Ebene,” bounded to existing `claimHomeworld` and owned-ship arrival call sites plus actual wormhole-entry transaction behavior. No production source or gameplay behavior changed. Exact claim and movement transaction distinctions follow source; `markKnown` itself uses the regular repository path unless given a manager, is idempotent, and does not downgrade `EXPLORED`.
- Documentation RED/GREEN gate `tmw-k5e-docs-final-20261111-02`: exit 0. Against original implementation commit `15425192e03bdc9407cf031247f8a8b855d23312`, both required acquisition markers were missing (RED); against the correction, six targeted semantic assertions passed and Prettier Markdown check passed (GREEN). Gate elapsed 0.605s; receipt/log retained under `.workmux/gates/`.
- No backend, frontend, PostgreSQL, typecheck or application gates rerun: executable source is unchanged from the previously recorded candidate; prior backend/frontend `tsc --noEmit` exit 2 limitations remain explicit and unaltered. No full-build or resolution claim.
- Original review record, prior candidate commits, earlier issue comments, gate logs and reports were preserved. Current K5e candidate parent chain is implementation `15425192e03bdc9407cf031247f8a8b855d23312` → tracker `db399f4d6283122b0119fa1b1751c387810ef61d`; correction commit and final tree will follow in this round. Status stays `ready-for-agent`, all eight criteria unchecked. Stop for independent Spec correction re-review; do not resolve or integrate.
- Append-only metadata clarification: the earlier receipt-update line's implementation tree `6c7c87da07044e1dc0fb82373e54462f9d4d0bf2` does not match the exact implementation commit object, whose tree is `a6f9132e4cc44a943b617206346dd398cc008a84`; the tracker commit object is `db399f4d6283122b0119fa1b1751c387810ef61d`, tree `4291403d4a54473157cd97aa6863b1e513705f37`. The historical text is retained as written. Likewise the compact report's earlier “No commit” statement is stale relative to these subsequently created commits. Its recorded 24-line count is retained; the report currently has 25 lines. The correction report records these discrepancies without rewriting prior evidence.
- The docs-only RED/GREEN gate ran 2026-11-11 11:03:47.936931–11:03:48.541984 UTC (0.605s), exit 0, source unchanged at HEAD `db399f4d6283122b0119fa1b1751c387810ef61d`, tree `4291403d4a54473157cd97aa6863b1e513705f37`; receipt and log are preserved under `.workmux/gates/`.

### 2026-11-11 — independent acceptance and tracker bookkeeping

- Coordinator-authorized independent correction verdicts: Standards/security **PASS0** at corrected final `1010af03703836c965cf09825b722e4fbffc57fc`, tree `5b7c4565852bc2ce3b035b448a5d66ad0c3ce7dc`, report `.workmux/k5e-fast-standards-correction-review-20261111.md`; Spec **PASS0** at the same exact pin, report `.workmux/k5e-fast-spec-correction-review-20261111.md`. Together these close the original Spec P2 through the ADR-only acquisition clarification. Both report paths were absent in this worker checkout when inspected; verdicts/pins above are recorded as supplied in the coordinator authorization, not as reports re-opened here. Original review/checkpoint records remain untouched.
- Final accepted pins: base `1c59e45de662b1eae9f3ce098f57661e37b384dc` / tree `652a10a23763843cd29804cdc4d2c3f5543c78f4`; implementation `15425192e03bdc9407cf031247f8a8b855d23312` / tree `a6f9132e4cc44a943b617206346dd398cc008a84`; ADR correction `1010af03703836c965cf09825b722e4fbffc57fc` / tree `5b7c4565852bc2ce3b035b448a5d66ad0c3ce7dc`. Parent chain remains base → implementation → tracker evidence `db399f4d6283122b0119fa1b1751c387810ef61d` → ADR correction.
- Checked all eight criteria based on the accepted source, tests, ADR/CONTEXT, and the two independent PASS0 verdicts. Tracker guidance maps issue Status to the five canonical triage roles; `resolved` is documented only for Wayfinder child tickets, so this task retains `ready-for-agent` rather than inventing a resolved role. Technical acceptance is recorded; separate serial integration remains pending and is not claimed.
- Scope verification at bookkeeping start: executable implementation and corrected ADR are byte-identical to accepted commit `1010af0`; only this issue file is changed in the new tracker delta. No product/source changes or tests were made.
- Validation limitations remain: backend and frontend `tsc --noEmit` both failed, exit 2; no successful full typecheck, build, or full-suite claim. ESLint exited 0 with 5 warnings (0 errors). Runtime evidence transfers on exact unchanged executable bytes. Docs gate took 0.605s and passed its two assertion phases plus Prettier; no tests rerun.
- Historical ticket comments, report inaccuracies, failed checkpoints, and earlier evidence remain preserved. Exact metadata corrections are in the appended correction report and prior append-only clarification; no historical lines were rewritten in this bookkeeping update.

### 2026-11-15 — Abschluss

- Implementierung (`15425192`) und ADR-Korrektur (`1010af03`) sind auf `stu-parity` integriert. Auf dem aktuellen Stand erneut geprüft: `layer-access-http.int-spec.ts` 52/52, `starmap.spec.tsx` 38/38. Versioniert ist ADR-0008; eine lokale, nicht versionierte `0007-ebenenkenntnis-und-kartenzyklus.md` ist ein Überbleibsel. Status `resolved`.
