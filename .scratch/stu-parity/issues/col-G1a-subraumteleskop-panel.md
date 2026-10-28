# Subraumteleskop: Funktion und Kartenansicht

**Status:** claimed
**Priority:** P3
**Size:** M
**Blocked by:** —

## Ziel

Das Gebäude „Hyperraum-Teleskop“ (100060100) ist baubar, hat aber keine Funktion und keine Oberfläche. In STU öffnet das Subraumteleskop (Funktion 31) ein Kontextmenü mit einem navigierbaren Ausschnitt der Sternenkarte um das System der Kolonie und einer Energieanzeige für den Scan. Dieses Issue liefert Funktion, Panel und Kostenvorschau; was der Scan preisgibt, klärt col-G1b.

## STU-Quellen

- `src/Module/Colony/View/ShowSubspaceTelescope/ShowSubspaceTelescope.php`
- `src/html/colony/menu/telescope.twig`, `src/html/colony/telescopeNavigation.twig`, `src/html/colony/telescopeSectionTable.twig`
- `src/Module/Colony/View/ShowSubspaceTelescopeScan/ShowSubspaceTelescopeScan.php::calculateScanCost` (20 + Diagonalabstand / maximaler Diagonale × 180, gerundet)
- `src/Component/Building/BuildingFunctionEnum.php` (`SUBSPACE_TELESCOPE = 31`)

## SWU-Pfade

- `game-data/data/buildings/stu-buildings.yaml` (Gebäude 100060100 → Funktion 31)
- `apps/frontend/src/pages/colonies/colony-navigation.ts` (`getBuildingContextActions`), `ColonyContextPanel.tsx`, neues `PanelTelescope.tsx`
- `apps/backend/src/modules/colony/colony.controller.ts`, neuer Service (z. B. `colony-telescope.service.ts`)
- `apps/backend/src/modules/starmap/starmap-query.service.ts` (Kartenausschnitt mit derselben Sichtbarkeit wie die eigene Sternenkarte)

## Akzeptanzkriterien

- [ ] Das Hyperraum-Teleskop trägt Funktion 31; bei vorhandenem Gebäude erscheint ein Kontextmenü „Subraumteleskop“.
- [ ] Das Panel zeigt einen Kartenausschnitt um das Koloniesystem mit Navigation (Pfeile/Verschieben), nur mit Informationen, die der Spieler auf seiner Sternenkarte ohnehin sieht.
- [ ] Bei Auswahl eines Felds zeigt das Panel „Energie verfügbar / benötigt“ nach der STU-Kostenformel (Backend-Endpunkt liefert die Kosten).
- [ ] Der Scan-Knopf ist sichtbar, aber deaktiviert mit Hinweis, bis col-G1b umgesetzt ist.
- [ ] Backend-Tests: Funktion 31 nötig (sonst 403/400), Kostenformel an Rand- und Mittelpunkten.
- [ ] Frontend-Tests: Kontextmenü erscheint nur mit Gebäude, Kostenanzeige.

## Comments
