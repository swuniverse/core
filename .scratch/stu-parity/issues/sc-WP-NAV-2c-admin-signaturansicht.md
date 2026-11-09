# Admin-Ansicht der Flugsignaturen

**Status:** ready-for-agent
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

- 2026-10-29: Blockiert durch die verpflichtende Gesamtprüfung: Zwei ernsthafte Implementierungs-/Prüfversuche scheiterten an bereits auf dem sauberen Claim-Stand vorhandenen Frontend-Typecheck-Fehlern (`apps/frontend/src/pages/database.tsx:1015`, `Faction`-Typkonflikt) sowie zahlreichen TS6305-Fehlern zu fehlenden Declaration-Ausgaben. Backend-Service- und Frontend-Filter-Fokustests waren grün, der Frontend-Build ebenfalls; da `npx nx affected -t lint typecheck test --base=HEAD` nicht vollständig grün werden kann, wurden alle Produktcodeänderungen gemäß Abbruchregel verworfen. Bitte den Baseline-Typecheck reparieren oder bestätigen, dass diese bekannten Fehler für diesen Durchlauf ausgenommen werden dürfen.
- 2026-11-09: Die integrierte Baseline 14b86081/c8e14f1c beseitigt den zuletzt dokumentierten fachfremden Blocker (Frontend-Faction-/TS6305-Gate); reguläre Nx-Lint-/Typecheck-/Build-Gates und vollständige Tests sind laut Baseline-Review grün, lokale Test-Spieldaten waren dafür vorhanden. Status ready-for-agent; vorhandene Issue-Abhängigkeiten bleiben verbindlich. Dies belegt keine Feature-Fertigstellung: verworfene Änderungen müssen neu umgesetzt und die aktuellen Issue-Tests und Pflicht-Gates erneut ausgeführt werden; keine Ausnahme.
