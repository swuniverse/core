# BBCode: `[img]` in Profil und HoloNet

**Status:** resolved
**Priority:** P3
**Size:** S
**Blocked by:** —

## Ziel

STU erlaubt `[img]` in Profilbeschreibungen und KN-Beiträgen, geprüft auf gültige URL und JPG/PNG. SWU rendert `[img]` nur für Allianzbanner (`allowBannerImages`, `ALLIANCE_BANNER_URL_PATTERN`). Externe Bilder bergen Tracking-, Datenschutz- und Missbrauchsrisiken.

## STU-Quellen

- `src/Lib/StuBbCodeWithImageDefinitionSet.php`
- `src/Lib/StuBbCodeImageValidator.php` (URL-Validator + JPG/PNG)
- `src/Component/Communication/Kn/KnBbCodeDefinitionSet.php`

## SWU-Pfade

- `apps/frontend/src/components/BbCodeText.tsx` (`allowBannerImages`)
- `packages/shared` (`ALLIANCE_BANNER_URL_PATTERN`)
- Asset-Ablage `apps/backend/src/modules/alliance/alliance-asset.port.ts`, `file-system-asset-storage.ts`
- `apps/frontend/src/pages/player-profile.tsx`, `apps/frontend/src/pages/holonet.tsx`

## Akzeptanzkriterien

- [x] `BbCodeText` rendert `[img]` in Profil und HoloNet nur für `https`-URLs mit Endung png/jpg/jpeg/webp als `<img referrerpolicy="no-referrer" loading="lazy">` mit Größenbegrenzung per CSS; das Allianzbanner-Verhalten bleibt unverändert.
- [x] Nicht erlaubte `[img]`-Quellen (anderes Schema, andere Endung, `javascript:`/`data:`) bleiben Literaltext bzw. Link, nie ein `<img>`.
- [x] Frontend-Tests für erlaubte und abgelehnte Quellen.

## Entscheidung

Vorgabe: Variante (a). Externe Bilder per `[img]` in Profil und HoloNet, nur Schema `https`, Endung png/jpg/jpeg/webp, gerendert mit `referrerpolicy="no-referrer"` und `loading="lazy"`. Keine Uploads.

## Comments

- 2026-10-21 Product Owner: Option a – In Profilbeschreibung und HoloNet sind wie in STU externe `https`-Bilder erlaubt (png/jpg/webp, `referrerpolicy="no-referrer"`, `loading="lazy"`).
- 2026-11-04 Verification: Implemented profile/HoloNet image opt-in with HTTPS extension validation, no-referrer/lazy attributes, bounded sizing, and unchanged banner handling. Direct checks: `npx vitest run --config apps/frontend/vite.config.mts` (90 files/621 tests), `npx tsc -p packages/shared/tsconfig.lib.json`, `npx tsc -p apps/frontend/tsconfig.app.json --noEmit --pretty false`, and `npx eslint` on the four changed frontend files passed. Nx is blocked because npm-installed dependencies lack pnpm's `node_modules/.modules.yaml`.
