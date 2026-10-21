# Sektor-Scan der Kolonie mit Flugsignaturen

**Status:** ready-for-agent
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

- [ ] Neuer Endpunkt bzw. Erweiterung liefert die Signaturen fremder Spieler am Kolonie-Feld nach denselben Sichtbarkeitsregeln wie der Schiffs-Sektor-Scan (gemeinsame Funktion, keine Kopie).
- [ ] Der Umgebungsscan füllt `fadedSignatures` aus echten Signaturen.
- [ ] Die Kolonieansicht zeigt „Sektor-Scan“ mit Signaturtabelle; nur für den Kolonieeigentümer.
- [ ] Backend-Test (Fremdzugriff, Sichtbarkeit) und Frontend-Test.
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Comments
