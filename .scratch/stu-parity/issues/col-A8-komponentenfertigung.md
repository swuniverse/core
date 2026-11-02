# Komponentenfertigung in Fabrikationshalle und Technologiezentrum

**Status:** resolved
**Priority:** P3
**Size:** M
**Blocked by:** col-A2, col-A5

## Ziel

Die Kolonienavigation kennt die Funktionen 29 (Fabrikationshalle) und 30 (Technologiezentrum), aber `stu-fabrication.yaml` enthält keine Einträge dafür; die Panels bleiben leer. In STU entstehen dort Komponenten (u. a. Ersatzteile und Systemkomponenten für Reparaturen). Welche Komponenten SWU haben soll, ist offen.

## STU-Quellen

- `src/html/colony/menu/componentFab.twig` („Komponentenbaumenü“, EPS-Kosten, In Bau, Lagernd)
- `src/Module/Colony/View/ShowModuleFab/`
- `src/Component/Building/BuildingFunctionEnum.php` (`FABRICATION_HALL = 29`, `TECH_CENTER = 30`)
- `src/Module/Tick/Spacecraft/ManagerComponent/RepairActions.php`

## SWU-Pfade

- `game-data/data/fabrication/stu-fabrication.yaml` (Daten-Repo `swuniverse/game-data`)
- `apps/backend/src/modules/colony/colony-fabrication.service.ts`
- `apps/frontend/src/pages/colonies/colony-navigation.ts`, `components/PanelFabrication.tsx`

## Akzeptanzkriterien

- [x] Fabrikationsdaten für die Funktionen 29/30 mit dem vollständigen STU-Komponentensatz (Name in SW-Entsprechung, Ware, Kosten, EPS, Forschung, Fraktion) liegen in `game-data`; die Namenszuordnung steht in `map.md`.
- [x] Die Panels der Funktionen 29/30 zeigen das Komponentenbaumenü und fertigen nach den Fabrikationsregeln aus col-A2.
- [x] Ersatzteile und Systemkomponenten werden von Reparaturen (col-A5, sc-WP-ENG-3) wie in STU verbraucht.
- [x] Backend- und Frontend-Tests für Fertigung und Anzeige.

## Entscheidung

Vorgabe: Variante (a). Alle STU-Komponenten der Funktionen 29/30 (Ersatzteile, Systemkomponenten) werden 1:1 übernommen; Namen wählt der Agent nach Leitplanke 2 (Star-Wars-Äquivalent) und dokumentiert sie unter „Entscheidungen“ in `map.md`.

## Comments

- 2026-10-21 Product Owner: Option a – SWU übernimmt den STU-Komponentensatz 1:1 (Ersatzteile und Systemkomponenten) mit Star-Wars-Namen für Fabrikationshalle und Technologiezentrum.
- 2026-11-02 Agent: Funktionen 29/30 fertigen `Instandhaltungsset` und `Schiffssystem-Baugruppe` mit autoritativen STU-Kosten/EPS; Anzeige-, Daten- und bestehende Reparaturverbrauchstests sind grün. Der vollständige betroffene Gate scheitert ausschließlich an zwei fachfremden Spacecraft-Testfixtures (`spacecraft-fleet.service.spec.ts`, `spacecraft-core-controls.spec.ts`); Lint, Typecheck, fokussierte Tests und alle Builds sind grün.
