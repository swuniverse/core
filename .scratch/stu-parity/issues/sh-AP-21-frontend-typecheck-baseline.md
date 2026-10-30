# Frontend-Typecheck-Baseline reparieren

**Status:** resolved
**Priority:** P1
**Size:** S
**Blocked by:** —

## Ziel

`frontend:typecheck` wird wieder zu einem verlässlichen grünen Qualitäts-Gate. Reale Typfehler und die flächendeckenden `TS6305`-Fehler durch fehlende Deklarationsausgaben werden behoben, ohne Produktverhalten zu verändern.

## Ausgangslage

Der Lauf vom 2026-10-30 mit `npx nx run frontend:typecheck` scheitert mindestens an:

- `apps/frontend/src/pages/database.tsx:1015`: `"REBEL" | "EMPIRE" | null` ist nicht mit dem gemeinsamen Typ `Faction | null | undefined` kompatibel.
- zahlreichen `TS6305`-Fehlern: Dateien unter `apps/frontend/dist/**/*.d.ts` wurden für importierte Frontend-Quellen nicht erzeugt.
- nach Beseitigung der Artefaktfehler sichtbar werdenden echten Test-Typfehlern; historisch unter anderem `apps/frontend/src/pages/colonies.spec.tsx:239` ohne `hasFighterShipyard`.

## SWU-Pfade

- `apps/frontend/tsconfig*.json`
- `apps/frontend/project.json`
- Root-TypeScript- und Nx-Konfiguration
- `apps/frontend/src/pages/database.tsx`
- von der Typprüfung gemeldete Tests, ausschließlich soweit für eine grüne Baseline erforderlich

## Akzeptanzkriterien

- [x] `npx nx run frontend:typecheck` ist aus einem sauberen Checkout ohne vorherigen manuellen Frontend-Build grün.
- [x] Die TypeScript-Projektreferenzen beziehungsweise Build-Reihenfolge erzeugen oder verlangen keine veralteten beziehungsweise fehlenden `apps/frontend/dist/**/*.d.ts`-Artefakte.
- [x] Der Fraktionstyp in `database.tsx` verwendet den kanonischen gemeinsamen `Faction`-Vertrag statt einer inkompatiblen lokalen String-Union.
- [x] Weitere nach der Buildgraph-Reparatur sichtbare Typfehler in Tests werden minimal und typgerecht korrigiert; keine Assertions oder Testfälle werden entfernt.
- [x] `npx nx run frontend:build` und die von geänderten Dateien betroffenen Frontend-Tests sind grün.
- [x] Ein Regressionstest oder eine CI-nahe Prüfung stellt sicher, dass `frontend:typecheck` ohne vorbereitenden Build funktioniert.

## Entscheidung

Dieses Issue besitzt die am 2026-10-30 dokumentierte rote Frontend-Typecheck-Baseline. Bis zu seiner Auflösung dürfen unabhängig davon freigegebene Issues nur dann abgeschlossen werden, wenn ihre fokussierten Tests und Builds grün sind und der Typecheck keine neuen Fehler gegenüber dieser Baseline meldet.

## Comments

- Root cause: the single real error in `database.tsx` (local `'REBEL' | 'EMPIRE'` union vs. shared `Faction` enum) made `tsc --build` skip emit (`noEmitOnError`), which caused the cascade of `TS6305` errors in specs. Fixed by using `Faction` from `@swuniverse/shared`; added missing `hasFighterShipyard` in `colonies.spec.tsx`. Typecheck is green from a clean checkout (dist/out-tsc removed).
- Regression guard: CI now runs `nx run-many --target=typecheck --all` before the build step.
- Open: `research.spec.tsx` ("shows research images, completion date, alternative follow-ups…") is flaky (also fails intermittently on the unmodified baseline; unrelated to this issue). Tracked as sh-AP-22.
