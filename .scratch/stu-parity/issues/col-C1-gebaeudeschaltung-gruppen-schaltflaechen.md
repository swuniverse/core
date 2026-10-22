# Gebäudeschaltung: Gruppen-Schaltflächen

**Status:** claimed
**Priority:** P2
**Size:** S
**Blocked by:** —

## Ziel

Das Backend beherrscht alle sieben STU-Massenmodi, die Oberfläche nutzt aber nur Modus 2 (Auswahl). STU bietet in der Gebäudeschaltung Gruppen-Schaltflächen zum Aktivieren und Deaktivieren von Energieverbrauchern, Energieerzeugern, Arbeitgebern, Wohngebäuden sowie Verbrauchern und Erzeugern einer gewählten Ware. Diese Bedienung wird in `PanelBuildingManagement.tsx` nachgebaut.

## STU-Quellen

- `src/html/colony/menu/buildingManagement.twig` (Block `buildinggroups`, je Gruppe Aktivieren/Deaktivieren)
- `src/Module/Colony/Lib/BuildingMassActionConfiguration.php` (Modi 1 EPS-Verbraucher, 2 Auswahl, 3 EPS-Erzeuger, 4 Industrie/Arbeitgeber, 5 Wohngebäude, 6 Warenverbraucher, 7 Warenerzeuger)
- `src/Module/Colony/Action/ActivateBuildings/`, `DeactivateBuildings/`

## SWU-Pfade

- `apps/frontend/src/pages/colonies/components/PanelBuildingManagement.tsx` (+ `.spec.tsx`)
- `apps/frontend/src/pages/colonies/api.ts`
- `apps/backend/src/modules/colony/colony-building-management.service.ts`, `colony-building-management.types.ts` (`BuildingMassActionMode`)

## Akzeptanzkriterien

- [ ] Neben der Auswahlliste gibt es eine kompakte Gruppenleiste mit je einem Aktivieren- und Deaktivieren-Icon für: Energieverbraucher (1), Energieerzeuger (3), Arbeitgeber (4), Wohngebäude (5).
- [ ] Für Warenverbraucher (6) und Warenerzeuger (7) wählt der Spieler eine Ware (Icon-Auswahl aus den Waren der Kolonie), dann Aktivieren/Deaktivieren.
- [ ] Nach der Aktion zeigt die UI die Backend-Rückmeldung (geschaltete Gebäude, Fehlschläge) und aktualisiert Karte und Bilanz.
- [ ] Darstellung nach den UI-Konventionen aus `inventory/shell-admin-runtime.md` Abschnitt 3 (Icons mit Tooltip, dichte Zeilen).
- [ ] Frontend-Tests: jede Gruppe sendet den richtigen Modus (und `commodityId` bei 6/7).
- [ ] Backend-Test bestätigt, dass Modi 6/7 die Ware als Parameter verlangen (falls noch nicht abgedeckt).

## Comments
