# Sternenkarte als Bild und Daten exportieren

**Status:** resolved
**Priority:** P3
**Size:** S
**Blocked by:** —

## Ziel

Spieler können ihre persönliche Sternenkarte (erkundete Felder einer Ebene, eigene Kolonien) als PNG-Bild und als Datendatei (JSON) herunterladen, wie in STU. Der Export enthält nur Wissen, das der Spieler ohnehin sieht.

## STU-Quellen

- `src/Module/Starmap/View/ShowUserStarmapImage/*`
- `src/Module/Starmap/View/ShowUserStarmapData/*`

## SWU-Pfade

- `apps/backend/src/modules/starmap/starmap.controller.ts` (`GET layers/:layerId/fields`, `layers/:layerId/exploration`), `exploration.service.ts`
- `apps/frontend/src/pages/starmap.tsx`, `apps/frontend/src/components/starmap/StarmapCanvas.tsx`
- Bestehender Admin-Layer-Export als Vorbild (`starmap-admin.service.ts`)

## Akzeptanzkriterien

- [x] `GET starmap/layers/:layerId/export.json` liefert die erkundeten Felder des Spielers (Koordinaten, Feldtyp, System-ID/-Name bei FULL-Erkundung) und keine unerkundeten Daten. Es gibt eine Ratenbegrenzung (z. B. einmal pro Minute).
- [x] Im Kontrollpanel der Sternenkarte stehen die Knöpfe „Als Bild speichern“ (PNG aus dem Canvas, ganze erkundete Ausdehnung, ohne Overlays von Fremdschiffen) und „Daten exportieren“ (JSON-Download).
- [x] Backend-Test: Der Export enthält nur erkundete Felder, und der Nebel bleibt gewahrt. Frontend-Test: Beide Knöpfe lösen den Download aus (gemockt).

## Comments

### Verification — 2026-11-04

Implemented personal, authenticated `export.json` (explicit field allow-list, FULL-only system identity, own colonies, no admin fog bypass, private/no-store) and both control-panel downloads. PNG uses fresh data-only canvas over the whole explored extent, preserves unknown gaps, excludes ship/sensor overlays, caps canvas size at 4096px/16MP, and cleans up canvases, anchors and deferred object URLs. Both formats share a one-minute snapshot. PostgreSQL atomically limits each user/layer across API instances; deploy the new migration before using the endpoint.

RED observed before implementation: endpoint 404; concurrent exports `[200,200]` instead of `[200,429]`; missing own colonies; missing JSON/PNG buttons; missing PNG renderer; empty/oversized/dense map failures; missing scaled colony marker and private/no-store header. GREEN: 4 HTTP/PostgreSQL tests, 8 backend regressions, 46 frontend tests; production and focused-test TypeScript; changed-file ESLint (0 errors, existing warnings); `git diff --check`. Synthetic PNG rendered and inspected in headless Chrome; no live game/browser download E2E performed.

Direct commands (npm install succeeds; Nx fails on missing pnpm `node_modules/.modules.yaml`, package-manager files unchanged):

```sh
npx jest --config apps/backend/jest.integration.config.cts --testPathPatterns=starmap-export.int-spec.ts --runInBand
npx jest --config apps/backend/jest.config.cts --testPathPatterns='starmap.controller.spec.ts|starmap-query.service.spec.ts|exploration.service.spec.ts' --runInBand
npx vitest run --config apps/frontend/vite.config.mts src/pages/starmap.spec.tsx src/lib/starmap-export.spec.ts src/lib/starmap-render.spec.ts
npx tsc -b packages/shared/tsconfig.lib.json apps/backend/tsconfig.app.json apps/frontend/tsconfig.app.json
npx tsc --noEmit -p apps/backend/tsconfig.app.json
npx tsc --noEmit -p apps/frontend/tsconfig.app.json
npx tsc --noEmit -p packages/shared/tsconfig.lib.json
npx eslint apps/backend/src/modules/starmap/{starmap.controller.ts,starmap-query.service.ts,starmap-export.int-spec.ts} apps/backend/src/database/migrations/20261104120000-add-starmap-export-limits.ts apps/frontend/src/pages/{starmap.tsx,starmap.spec.tsx} apps/frontend/src/components/starmap/StarmapControlPanel.tsx apps/frontend/src/lib/{starmap-export.ts,starmap-export.spec.ts} packages/shared/src/lib/starmap/index.ts
git diff --check
```

Broad `tsc --noEmit -p apps/{backend,frontend}/tsconfig.spec.json` remains blocked by unrelated existing relationship-resolver/tutorial and spacecraft/colony/dashboard/holonet test types. Focused temporary configs extending these spec configs, including only the changed tests and referencing the built app declarations, pass. Nx module-boundary lint is skipped without its graph; existing React act and ts-jest deprecation warnings remain. No other issue, map file, STU reference or `sc-WP-STAT-5` changed.
