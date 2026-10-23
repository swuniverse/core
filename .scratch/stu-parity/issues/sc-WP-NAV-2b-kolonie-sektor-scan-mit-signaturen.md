# Sektor-Scan der Kolonie mit Flugsignaturen

**Status:** resolved
**Priority:** P2
**Size:** S
**Blocked by:** sc-WP-NAV-2a

## Ziel

Übernimmt col-G2 (laut map.md entfällt dort): Die Kolonie erhält wie in STU einen Sektor-Scan ihres Feldes mit den Flugsignaturen fremder Schiffe. Der bestehende Umgebungsscan füllt `fadedSignatures` aus echten Daten statt aus `0`.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Colony/View/ShowSectorScan/ShowSectorScan.php`, `html/colony/component/sectorscan.twig`
- `Module/Colony/Lib/Gui/ColonyScanPanel.php` (Subraum-Ebene nur mit Subraumteleskop)

## SWU-Pfade

- `apps/backend/src/modules/colony/colony-environment-scan.service.ts` (`fadedSignatures: { uncloaked: 0, cloaked: 0 }`), `colony-environment-scan.service.spec.ts`
- `apps/backend/src/modules/colony/colony.controller.ts`
- `apps/frontend/src/pages/colonies/components/PanelInfo.tsx` („Umgebungsscan“)
- Signatur-Repository aus sc-WP-NAV-2a

## Akzeptanzkriterien

- [x] Neuer Endpunkt bzw. Erweiterung liefert die Signaturen fremder Spieler am Kolonie-Feld nach denselben Sichtbarkeitsregeln wie der Schiffs-Sektor-Scan (gemeinsame Funktion, keine Kopie).
- [x] Der Umgebungsscan füllt `fadedSignatures` aus echten Signaturen.
- [x] Die Kolonieansicht zeigt „Sektor-Scan“ mit Signaturtabelle; nur für den Kolonieeigentümer.
- [x] Backend-Test (Fremdzugriff, Sichtbarkeit) und Frontend-Test.
- [x] `lint`, `typecheck`, `test` und `build` sind grün.

## Comments

- Der eigentümergeschützte Umgebungsscan verwendet jetzt `FlightSignatureService.getVisibleAt` für dieselben Sichtbarkeitsfenster wie der Schiffs-Sektor-Scan und liefert sichtbare sowie verblasste Signaturen an die neue kompakte Signaturtabelle in `PanelInfo`. Backend-, Frontend- und Shared-Vertragstests ergänzt. Keine offenen Folgepunkte.
