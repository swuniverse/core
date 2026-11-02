# Subraumteleskop: Funktion und Kartenansicht

**Status:** resolved
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

- [x] Das Hyperraum-Teleskop trägt Funktion 31; bei vorhandenem Gebäude erscheint ein Kontextmenü „Subraumteleskop“.
- [x] Das Panel zeigt einen Kartenausschnitt um das Koloniesystem mit Navigation (Pfeile/Verschieben) und verwendet ausschließlich die persönliche dauerhafte Felderkundung über denselben serverseitigen `UNKNOWN`/`TERRAIN`/`FULL`-Redaktionsvertrag wie `getExploredSectorFields`. Aktuelle Sensorabdeckung, Schiffe/Sensorkontakte, Allianz-Livepositionen und andere dynamische Overlays werden nicht eingeblendet.
- [x] Bei Auswahl eines Felds zeigt das Panel „Energie verfügbar / benötigt“ nach der STU-Kostenformel (Backend-Endpunkt liefert die Kosten).
- [x] Der Scan-Knopf ist sichtbar, aber deaktiviert mit Hinweis, bis col-G1b umgesetzt ist.
- [x] Backend-Tests: Funktion 31 nötig (sonst 403/400), Kostenformel an Rand- und Mittelpunkten.
- [x] Frontend-Tests: Kontextmenü erscheint nur mit Gebäude, Kostenanzeige.

## Entscheidung

Die Zielkarte des Hyperraum-Teleskops zeigt ausschließlich die persönliche dauerhafte Felderkundung und verwendet den bestehenden serverseitigen Explored-Sector-Redaktionsvertrag. Sie ist kein zusätzlicher taktischer Sensor- oder Allianzsichtbarkeitskanal. Der momentane Informationsgewinn entsteht ausschließlich durch den EPS-pflichtigen Scan aus `col-G1b`.

## Comments

- 2026-10-28: Blockiert durch fehlende Produktentscheidung zur Karten-Sichtbarkeit. Das Akzeptanzkriterium fordert „dieselbe Sichtbarkeit wie die eigene Sternenkarte“, aber STU lädt den Ausschnitt über den allgemeinen `RefreshSection`-Pfad, während SWU mehrere kontextabhängige Sichtbarkeitsquellen (Erkundung, Sensorabdeckung, Overlays) besitzt. Bitte festlegen, ob das Teleskop (a) ausschließlich dauerhaft erkundete Felder zeigt oder (b) zusätzlich aktuelle Sensorabdeckung/Allianzfreigaben wie die interaktive Sternenkarte übernimmt. Ohne diese Festlegung lässt sich der Backend-Vertrag nicht sicher implementieren.
- 2026-10-30 Product Owner: Option 1. Der Teleskop-Zielselektor verwendet ausschließlich die persönliche dauerhafte Felderkundung mit derselben `UNKNOWN`/`TERRAIN`/`FULL`-Redaktion wie der bestehende Explored-Sector-Pfad. Aktuelle Sensorabdeckung, Kontakte, Schiffe, Allianz-Livepositionen und dynamische Overlays werden nicht eingeblendet. Dies entspricht STU; die zusätzliche momentane Information bleibt dem bezahlten Scan aus `col-G1b` vorbehalten.
- 2026-11-02: Funktion 31 für beide Hyperraum-Teleskopvarianten ergänzt, persönliches redigiertes Sektorfeld-Panel samt Navigation und serverseitiger STU-Kostenvorschau umgesetzt. Der Scan bleibt bis col-G1b sichtbar deaktiviert. Fokus- und Build-Prüfungen sind grün; der vollständige Affected-Testlauf scheitert ausschließlich an zwei bereits vorhandenen Spacecraft-Specs (`spacecraft-fleet.service.spec.ts`, `spacecraft-core-controls.spec.ts`).
