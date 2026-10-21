# BBCode: `[img]` in Profil und HoloNet

**Status:** ready-for-agent
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

- [ ] `BbCodeText` rendert `[img]` in Profil und HoloNet nur für `https`-URLs mit Endung png/jpg/jpeg/webp als `<img referrerpolicy="no-referrer" loading="lazy">` mit Größenbegrenzung per CSS; das Allianzbanner-Verhalten bleibt unverändert.
- [ ] Nicht erlaubte `[img]`-Quellen (anderes Schema, andere Endung, `javascript:`/`data:`) bleiben Literaltext bzw. Link, nie ein `<img>`.
- [ ] Frontend-Tests für erlaubte und abgelehnte Quellen.

## Entscheidung

Vorgabe: Variante (a). Externe Bilder per `[img]` in Profil und HoloNet, nur Schema `https`, Endung png/jpg/jpeg/webp, gerendert mit `referrerpolicy="no-referrer"` und `loading="lazy"`. Keine Uploads.

## Comments

- 2026-10-21 Product Owner: Option a – In Profilbeschreibung und HoloNet sind wie in STU externe `https`-Bilder erlaubt (png/jpg/webp, `referrerpolicy="no-referrer"`, `loading="lazy"`).
