# Jägerwerft: Rumpf ins Lager

**Status:** resolved
**Priority:** P3
**Size:** S
**Blocked by:** —

## Ziel

In STU baut die Jägerwerft (Funktion 5) Jägerrümpfe als Ware ins Kolonielager, die später etwa über den Hangar gestartet werden. SWU behandelt Funktion 5 als normale Werft mit Bauqueue. Die Frage ist, welches Modell gelten soll (Leitplanke 1).

## STU-Quellen

- `src/Module/Colony/Action/BuildFighterShipyardRump/`
- `src/Module/Colony/View/ShowFighterShipyard/`
- `src/html/colony/menu/fighterShipyard.twig`

## SWU-Pfade

- `apps/backend/src/modules/colony/colony.service.ts` (`buildAirfieldRump`, `startHangarShip` als Vorlage)
- `apps/backend/src/modules/colony/colony-shipyard.service.ts` (Werftgruppe)
- `apps/frontend/src/pages/colonies/colony-navigation.ts`, `components/PanelHangar.tsx`, `PanelShipyard.tsx`

## Akzeptanzkriterien

- [x] Endpunkt und Panel für Funktion 5 bauen Jägerrümpfe gegen Kosten als Ware ins Kolonielager (analog `buildAirfieldRump`).
- [x] Gelagerte Jägerrümpfe lassen sich über den bestehenden Hangar-Startpfad starten.
- [x] Funktion 5 ist nicht mehr Teil der normalen Bauqueue; laufende Altaufträge laufen regulär aus.
- [x] Backend- und Frontend-Tests.

## Entscheidung

Vorgabe: Variante (b), STU-Modell. Funktion 5 baut Jägerrümpfe als Ware ins Kolonielager; der Start erfolgt über den bestehenden Hangar-Startpfad. Funktion 5 ist nicht mehr Teil der normalen Bauqueue.

## Comments

- 2026-10-21 Product Owner: Option b – Die Jägerwerft folgt dem STU-Modell: Jägerrümpfe werden als Ware ins Kolonielager gebaut und über den Hangar gestartet.
- 2026-10-28 Agent: Funktion 5 nutzt nun den bestehenden Hangar-Bau- und Startpfad; neue normale Bauqueue-Aufträge sind ausgeschlossen, Legacy-Aufträge bleiben verarbeitbar. Backend- und Frontend-Tests ergänzt.
