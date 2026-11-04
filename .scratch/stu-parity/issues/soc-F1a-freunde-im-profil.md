# Profil: Freunde-Box

**Status:** resolved
**Priority:** P3
**Size:** S
**Blocked by:** soc-B1a

## Ziel

Das Spielerprofil zeigt wie STU eine Box „Freunde“ mit den Avataren der Spieler, die mit dem Profilinhaber befreundet sind. STU leitet das aus Allianzmitgliedschaft und Kontakten im Modus Freund ab, die den Profilinhaber eingetragen haben (`getFriendsByUserAndAlliance`). SWU übernimmt diese Semantik mit seinen Begriffen: Mitglieder derselben Allianz und Spieler, die den Profilinhaber als Kontakt im Modus Freund führen (soc-B1a).

## STU-Quellen

- `src/Orm/Repository/UserRepository.php#getFriendsByUserAndAlliance`
- `src/Module/Game/Lib/View/Provider/UserProfileProvider.php` (`FRIENDS`)
- `src/html/view/userprofile.twig` (Box „Freunde“)

## SWU-Pfade

- `apps/backend/src/modules/database/database.service.ts` (`GET database/settlers/:id`) oder eigener Endpunkt `GET database/settlers/:id/friends`
- Kontakte aus soc-B1a, Allianzmitgliedschaft aus `apps/backend/src/modules/alliance/*`
- `apps/frontend/src/pages/player-profile.tsx`, `apps/frontend/src/components/PlayerAvatar.tsx`

## Akzeptanzkriterien

- [x] Endpunkt liefert die Freunde eines Spielers: Mitglieder derselben Allianz (ohne ihn selbst) und Spieler, die ihn als Kontakt im Modus Freund führen; dedupliziert, sortiert nach ID, gedeckelt (z. B. 50).
- [x] Das Profil zeigt die Box „Freunde“ mit Avatar (Link zum Profil, `title` = Name); „Keine“ wenn leer.
- [x] Keine Preisgabe privater Daten: es werden nur ID, Name, Avatar ausgeliefert.
- [x] Backend-Tests: Allianz, Kontakt, Duplikat, eigener Account ausgeschlossen. Frontend-Test: Box rendert.

## Comments

- 2026-11-04: RED confirmed for missing friends projection/box and stale profile navigation; GREEN: focused Jest (25), PostgreSQL HTTP (1), Vitest (18), backend/frontend app TypeScript and `git diff --check`. Nx is blocked by missing pnpm `.modules.yaml`; direct commands:
  - `npx jest --config apps/backend/jest.config.cts --runInBand --runTestsByPath apps/backend/src/modules/database/database.service.spec.ts apps/backend/src/modules/database/database-settler-scans.service.spec.ts apps/backend/src/modules/contacts/contact.service.spec.ts apps/backend/src/modules/database/database-system-catalog.service.spec.ts apps/backend/src/modules/database/database-trade-posts.service.spec.ts apps/backend/src/modules/database/database-ranking.spec.ts`
  - `npx jest --config apps/backend/jest.integration.config.cts --runInBand --runTestsByPath apps/backend/src/modules/database/profile-friends.int-spec.ts`
  - `npx vitest run --config apps/frontend/vite.config.mts apps/frontend/src/pages/player-profile.spec.tsx apps/frontend/src/pages/player-profile-diplomacy.spec.tsx apps/frontend/src/pages/player-profile-scans.spec.tsx`
  - `npx tsc -b packages/shared/tsconfig.lib.json` then `npx tsc --noEmit --composite false --incremental false -p apps/backend/tsconfig.app.json` and `npx tsc --noEmit --composite false --incremental false --emitDeclarationOnly false -p apps/frontend/tsconfig.app.json`.
  - `npx eslint` on changed source/test files: no errors, existing warnings; Nx module-boundary rule skipped without graph. Full test TypeScript configs have existing errors in unrelated specs. Incoming contacts are bounded but have no dedicated recipient/mode index; consider an index if profile query volume warrants a migration.
