# Slice 07 — Visual Panel, lokale Zeit & Intel/Database Views

## Ziel

Niedriger priorisierte STU-Umfeldfeatures modernisieren: Kolonie-Visualisierung, lokale Tageszeit/Rotation, Datenbank-/Profil-/Allianz-Ansichten und fremde Kolonie-Scans.

## STU-Referenz

- `src/Module/Colony/Lib/Gui/ColonyScanPanel.php`
- `src/Module/Colony/Lib/Gui/ColonyScanPanelEntry.php`
- `src/Module/Colony/Lib/Gui/Component/ManagementProvider.php`
- `src/Component/Colony/Trait/ColonyRotationTrait.php`
- `src/Module/Database/View/ShowColonySurface/ShowColonySurface.php`
- `src/Module/Database/View/ColonyWorthRanking/ColonyWorthRanking.php`
- `src/Module/Database/View/ColonyProductionWorthRanking/ColonyProductionWorthRanking.php`
- `src/Module/PlayerProfile/View/ShowColonySurface/ShowColonySurface.php`
- `src/Module/Alliance/View/ShowMemberColonyInfo/ShowMemberColonyInfo.php`
- `src/Module/Spacecraft/View/ShowColonyScan/ShowColonyScan.php`

## SWU-Ausgangslage

- Kolonie-Oberfläche als Field Grid vorhanden.
- `Colony` Entity hat keine offensichtlichen STU-Felder `mask`, `surface_width`, `rotation_factor`.
- Ranking/Intel/Profile Kolonieviews nicht sichtbar.

## Umsetzung

1. Visual parity prüfen:
   - Welche STU-Visual-Elemente sind Gameplay-relevant vs. rein kosmetisch?
   - SWU Grid ggf. um lokale Zeit/Day prefix erweitern, wenn Daten sinnvoll.
2. Rotation/Time:
   - Nur implementieren, wenn SurfaceWidth/Rotation in SWU-Datenmodell sinnvoll ergänzt werden kann.
   - Sonst als bewusst anderes SWU-Design dokumentieren.
3. Database/Intel:
   - Colony worth ranking / production worth als moderne API + Admin/Database UI planen.
   - Fremde Kolonie-Oberfläche nur mit Rechte-/Intel-Prüfung.
   - Alliance member colony info mit Permission-Checks.
4. Scan Panel:
   - DTO für lesbare fremde Kolonie-Infos, keine Geheimdaten leaken.

## Akzeptanzkriterien

- Klare Entscheidung, welche Visual-STU-Features SWU übernimmt.
- Wenn umgesetzt: lokale Zeit/Visual-Daten im Detail DTO und UI.
- Ranking/Intel-Endpoints haben Permission-Tests.
- Keine geheimen Storage/Defense-Daten ohne Scan/Recht.

## Tests

- Permission tests für fremde Kolonieansichten.
- Ranking endpoint deterministic.
- Visual DTO stable.

## Verification

```bash
NX_SOCKET_DIR=/tmp/nx-tmp npx nx test backend --testPathPatterns=colony
NX_SOCKET_DIR=/tmp/nx-tmp npx nx run backend:typecheck
npx nx run frontend:typecheck
```

## Risiken / Ask-before

- Datenschutz/Intel-Leaks: immer fragen, wenn fremde Koloniedaten sichtbar gemacht werden.
