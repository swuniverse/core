# Admin-Ansicht der Flugsignaturen

**Status:** resolved
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

- [x] Admin-Endpunkt liefert je Feld eines Ausschnitts die aggregierten Richtungen der Signaturen, gefiltert nach Schiff, Spieler, Allianz oder alle; nur mit Admin-Recht (Backend-Test 403).
- [x] Die Admin-Karte zeichnet die Spuren als Linien je Richtung (Overlay).
- [x] Frontend-Test für Filterwechsel.
- [x] `lint`, `typecheck`, `test` und `build` sind grün.

## Comments

- 2026-10-29: Blockiert durch die verpflichtende Gesamtprüfung: Zwei ernsthafte Implementierungs-/Prüfversuche scheiterten an bereits auf dem sauberen Claim-Stand vorhandenen Frontend-Typecheck-Fehlern (`apps/frontend/src/pages/database.tsx:1015`, `Faction`-Typkonflikt) sowie zahlreichen TS6305-Fehlern zu fehlenden Declaration-Ausgaben. Backend-Service- und Frontend-Filter-Fokustests waren grün, der Frontend-Build ebenfalls; da `npx nx affected -t lint typecheck test --base=HEAD` nicht vollständig grün werden kann, wurden alle Produktcodeänderungen gemäß Abbruchregel verworfen. Bitte den Baseline-Typecheck reparieren oder bestätigen, dass diese bekannten Fehler für diesen Durchlauf ausgenommen werden dürfen.
- 2026-11-09: Die integrierte Baseline 14b86081/c8e14f1c beseitigt den zuletzt dokumentierten fachfremden Blocker (Frontend-Faction-/TS6305-Gate); reguläre Nx-Lint-/Typecheck-/Build-Gates und vollständige Tests sind laut Baseline-Review grün, lokale Test-Spieldaten waren dafür vorhanden. Status ready-for-agent; vorhandene Issue-Abhängigkeiten bleiben verbindlich. Dies belegt keine Feature-Fertigstellung: verworfene Änderungen müssen neu umgesetzt und die aktuellen Issue-Tests und Pflicht-Gates erneut ausgeführt werden; keine Ausnahme.


## Answer

- `GET /starmap/admin/layers/:layerId/flight-signatures` mit validiertem Ausschnitt (`xStart`, `xEnd`, `yStart`, `yEnd`), Filter `ALL`, `SPACECRAFT`, `USER` oder `ALLIANCE` und erforderlicher `targetId` bei gezielten Filtern. Authentifizierung und `AdminGuard` schützen den Endpunkt; reine Karteneditor-Rechte reichen nicht aus.
- Eine SQL-Aggregation liefert je belegtem Galaxiefeld die Anzahl unterschiedlicher Schiffe für Nord/Ost/Süd/West. Mehrfach überflogene Felder zählen dasselbe Schiff je Richtung einmal. Zeitfenster folgt der 48-h-Aufbewahrung, inklusive getarnter Admin-Spuren; künftige Signaturen und fremde Ebenen/Ausschnitte werden ausgeschlossen. Spielerfilter nutzt den Signatur-Eigentümer, Allianzfilter die aktuelle Mitgliedschaft, Schiffssnapshots bleiben nach Schiffslöschung auswertbar.
- Der bestehende Vollkarteneditor enthält ein nur für Admins sichtbares Filterpanel und ein Pixi-Linienoverlay. Linienstärken folgen den STU-Dichteklassen. Pan, Zoom, Größenänderung und Filterwechsel laden den sichtbaren Ausschnitt mit Debounce; alte Antworten werden verworfen. Ausschalten und Ebenenwechsel entfernen die Spuren. Manuelles Aktualisieren und Fehleranzeige sind vorhanden.
- Der Zeichenhelfer nutzt eine kleine strukturelle Schnittstelle, sodass seine Deklarationen keine Pixi-/WebGPU-Typen in andere Frontendtests einbringen.

## Validation

- `npx nx run backend:test --runInBand --testPathPatterns=admin-flight-signature.controller`: 9 Tests grün, einschließlich echter HTTP-403-Antworten für Spieler und Karteneditoren sowie Query-Validierung.
- `npx nx run backend:test-integration --runInBand --testPathPatterns=admin-flight-signature`: 4 PostgreSQL-Tests grün für Richtungsaggregation, Duplikate, Zeit-/Ausschnittsgrenzen, alle Filter und geänderte Allianzmitgliedschaft.
- Frontendtests prüfen Filterwechsel, alte Antworten, Pan, Fehler, fehlende Adminrechte, Ausschnittsberechnung, Linien und Dichtestärken sowie Zeichnen nach asynchroner Canvas-Initialisierung.
- `npx nx affected -t lint typecheck test --base=HEAD --parallel=2`: grün; Backend 233 Suites / 2235 Tests, Frontend 113 Dateien / 807 Tests. Bestehende Lintwarnungen, keine Fehler.
- `npx nx run-many --targets=build`: alle drei Projekte grün. Backend-Deklarationen anschließend erneut erzeugt.
