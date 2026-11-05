# Award-Auslöser: Ebene vollständig erkundet (Kartenzyklus)

**Status:** ready-for-agent
**Priority:** P3
**Size:** S
**Blocked by:** soc-G1, tmw-K5

## Ziel

STU vergibt im Kartenzyklus (`MapCycle`) den Award der Ebene, sobald ein Spieler eine Ebene vollständig kartiert hat. In SWU entsteht der Kartenzyklus mit tmw-K5 (Ebenen-Kenntnis und Kartenzyklus). Dieses Issue hängt die Award-Vergabe an dessen Ereignis „Ebene vollständig erkundet“.

## STU-Quellen

- `src/Module/Maintenance/MapCycle.php` (`$userLayer->getLayer()->getAward()` → `createAwardForUser`)
- `src/Orm/Entity/Layer.php` (`award`)

## SWU-Pfade

- Kartenzyklus/Ebenenstatus aus tmw-K5 (voraussichtlich `apps/backend/src/modules/starmap/*`)
- Ebenen-Konfiguration (Award-Key je Ebene, optional)
- `apps/backend/src/modules/awards/*`

## Akzeptanzkriterien

- [x] Ebenen können optional einen `awardKey` tragen.
- [x] Wechselt eine Ebene für einen Spieler in den Status „explored“, wird der Award vergeben; bei wiederholtem Zyklus mit `incrementExisting` (Anzahl steigt), wie STU über die Count-Logik.
- [x] Fehler bei der Vergabe brechen den Zyklus nicht ab.
- [x] Backend-Tests: Vergabe bei Erkundung, keine Vergabe ohne `awardKey`, Wiederholung.

## Comments

Implemented optional persisted layer `awardKey` configuration and grant through `AwardService` after each successful explored transition, using `incrementExisting: true`; grant errors are logged without affecting the map cycle. The integration scenario now checks count 2 after two distinct qualifying layer transitions for the same user, then checks that a further map cycle is a no-op.

Verification on 2026-11-05: `npx jest --config apps/backend/jest.config.cts --runInBand --runTestsByPath apps/backend/src/modules/starmap/layer-map-cycle.service.spec.ts apps/backend/src/modules/starmap/starmap-admin.service.spec.ts apps/backend/src/database/migrations/20261105130000-add-layer-award-key.spec.ts` passed (3 suites, 16 tests); `npx tsc --build apps/backend/tsconfig.app.json --pretty false` passed; focused ESLint completed with 0 errors and 9 existing warnings in `starmap-admin.service.ts`; `git diff --check` passed.

PostgreSQL verification on the integrated sh-AP-24 harness: the focused command `npx jest --config apps/backend/jest.integration.config.cts --runInBand --runTestsByPath apps/backend/src/modules/starmap/layer-map-cycle.int-spec.ts` passed (1 suite, 1 test) against the harness's migrated disposable PostgreSQL 16 Testcontainer; it verified count 2 across two qualifying layer transitions. The focused test uses `connectIntegrationDatabase()` / `resetDatabase()` and the shared integration datasource now registers `Award` and `UserAward` entities. The complete backend PostgreSQL integration suite, `npx jest --config apps/backend/jest.integration.config.cts --runInBand`, passed on the final entity-registration tree (36 suites, 289 tests).

Verification after rebase on `stu-parity` (2026-11-06): the soc-G2b focused unit/migration command passed (3 suites, 16 tests); focused PostgreSQL count-2 integration passed (1 suite, 1 test); full PostgreSQL integration passed on the final tree (36 suites, 289 tests); `npx tsc --build apps/backend/tsconfig.app.json --pretty false` passed; focused ESLint passed with no errors; `git diff --check` passed. PostgreSQL mode was the harness-managed disposable PostgreSQL 16 Testcontainer with migrations applied; no shared schema was used.

The required backend build gate is blocked: `npx nx run backend:build` fails during Nx graph processing because `node_modules/.modules.yaml` is missing, and direct `webpack-cli build` cannot load the Nx cached project graph. The issue remains `ready-for-agent` pending a successful backend build.
