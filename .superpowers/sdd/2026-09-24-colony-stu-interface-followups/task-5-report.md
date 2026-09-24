# Task 5 Report

## Status

Implemented the dense STU storage rows, the accessible on-demand commodity
locations dialog, and warehouse-only Müllverbrennung access. The discard
endpoint remains unchanged and no station role is inferred in the frontend.

## TDD

### RED

Command:

```text
npx nx test frontend --run src/pages/colonies/components/SupplyDock.spec.tsx src/pages/colonies/components/CommodityLocationsDialog.spec.tsx src/pages/colonies/colony-navigation.spec.ts src/pages/colonies/components/ColonyFieldDialog.spec.tsx
```

Result: 4 test files failed with 6 expected behavior failures and 18 passing
tests. The failures covered the missing icon-only location trigger, missing
dense row contract, missing dialog, and missing function 23 warehouse action.

A subsequent completed-building guard test failed with 1 expected failure and
15 passing tests because function 23 was still offered while the warehouse was
under construction. The implementation now suppresses that action until the
field is complete.

### GREEN

- Storage rows render exactly icon, amount, visible full name, and signed delta.
- Only the icon is interactive and passes both commodity ID and exact trigger.
- The location dialog loads on demand and provides grouped colony/spacecraft
  links, loading, error, empty, focus-trap, Escape/backdrop/button close, and
  exact focus restoration behavior.
- Dialog and page request sequences reject stale responses during rapid
  commodity changes, close, and colony changes.
- Function 23 maps to `Müllverbrennung`; completed inactive warehouses remain
  enabled when `detail.waste.canDiscard` is true, while server denial and its
  reason remain authoritative.
- The storage waste button is removed and all production user strings use
  `Müllverbrennung`; the existing discard endpoint is unchanged.

## Verification

Focused tests:

```text
npx nx test frontend --run src/pages/colonies/components/SupplyDock.spec.tsx src/pages/colonies/components/CommodityLocationsDialog.spec.tsx src/pages/colonies/colony-navigation.spec.ts src/pages/colonies/components/ColonyFieldDialog.spec.tsx src/app/app.spec.tsx
```

Result: 5 files passed, 60 tests passed. Existing React `act(...)` warnings in
legacy app tests remain; the new dialog tests emit no warning.

Full frontend suite, uncached:

```text
npx nx test frontend --skip-nx-cache
```

Result: 43 files passed, 190 tests passed. Existing React `act(...)` warnings
and the existing HoloNet `strokeDashoffset` warning remain.

Production declaration check:

```text
npx tsc --build apps/frontend/tsconfig.app.json --emitDeclarationOnly --force
```

Result: passed with no output.

Production build, uncached:

```text
npx nx build frontend --skip-nx-cache
```

Result: passed. The existing large-chunk warning remains.

Aggregate frontend typecheck, uncached:

```text
npx nx typecheck frontend --skip-nx-cache
```

Result: retained exactly the accepted six diagnostics: five in
`colonies/utils.spec.ts` and one in `dashboard/DashboardColonies.spec.tsx`.
No Task 5 file has a diagnostic.

Formatting and whitespace:

```text
npx prettier --check <Task 5 files>
git diff --check
```

Result: passed after formatting.

## Concerns

- No blocking concerns.
- Browser viewport checks were not part of this implementation task; responsive
  behavior is covered structurally by the two-column-to-single-column storage
  grid and viewport-bounded scrolling dialog.
