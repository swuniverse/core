# Admin-Ansicht der Flugsignaturen

**Status:** claimed
**Priority:** P3
**Size:** S
**Blocked by:** sc-WP-NAV-2a

## Ziel

Übernimmt den Admin-Teil von tmw-K9: Admins sehen Subraumspuren auf der Karte gefiltert nach Schiff, Spieler, Allianz oder allen Signaturen (STU `ShowSignatures`). Die Spieleransicht der Spuren im LSS hängt am Subraumsensor und folgt in sc-WP-SENS-2a.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Admin/View/ShowSignatures/SignaturePanel.php`
- `Lib/Map/VisualPanel/Layer/DataProvider/Subspace/*` (`SubspaceLayerTypeEnum`: ALL, IGNORE_USER, SPACECRAFT_ONLY, USER_ONLY, ALLIANCE_ONLY)
- `Lib/Map/VisualPanel/Layer/Render/SubspaceLayerRenderer.php`

## SWU-Pfade

- `apps/frontend/src/pages/admin.tsx`, `starmap-admin-fullmap.tsx`
- `apps/backend/src/modules/starmap/starmap-admin.service.ts` bzw. Signatur-Service aus sc-WP-NAV-2a

## Akzeptanzkriterien

- [ ] Admin-Endpunkt liefert je Feld eines Ausschnitts die aggregierten Richtungen der Signaturen, gefiltert nach Schiff, Spieler, Allianz oder alle; nur mit Admin-Recht (Backend-Test 403).
- [ ] Die Admin-Karte zeichnet die Spuren als Linien je Richtung (Overlay).
- [ ] Frontend-Test für Filterwechsel.
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Comments
