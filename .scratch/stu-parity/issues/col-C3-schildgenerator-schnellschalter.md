# Schildgenerator-Schnellschalter im Verteidigungspanel

**Status:** resolved
**Priority:** P3
**Size:** S
**Blocked by:** —

## Ziel

In STU lassen sich die Kolonieschilde im Verteidigungsmenü direkt aktivieren und deaktivieren. In SWU geht das nur über das Feld des Schildgenerators. Der Schnellschalter nutzt die bestehende Gebäudeschaltung und damit die Schildkappung aus col-A1b.

## STU-Quellen

- `src/Module/Colony/Action/ActivateShields/`, `src/Module/Colony/Action/DeactivateShields/`
- `src/html/colony/component/colonyShields.twig`

## SWU-Pfade

- `apps/frontend/src/pages/colonies/components/PanelDefense.tsx`
- `apps/backend/src/modules/colony/colony-construction.service.ts` (`toggleBuilding`) bzw. ein schlanker Endpunkt in `colony.controller.ts`
- `apps/backend/src/modules/colony/colony-defense.service.ts`

## Akzeptanzkriterien

- [x] Das Verteidigungspanel zeigt den Zustand des Schildgenerators (aktiv/inaktiv) und einen Knopf zum Umschalten.
- [x] Das Umschalten verwendet dieselben Regeln wie die Feldschaltung (Energie, Schaden, Blockade, Hook aus col-A1a/b); beim Deaktivieren fallen die Schilde auf 0.
- [x] Der Schnellschalter ist nur bei genau einem Schildgenerator verfügbar; bei keinem oder mehreren wird er nicht angeboten, wie in STU.
- [x] Backend-Test (falls neuer Endpunkt) und Frontend-Test für beide Richtungen.

## Comments

- 2026-11-06: Maintainer bestätigt `PanelDefense` als öffentliche Frontend-Test-Seam. Der Test prüft den angezeigten Zustand und beide Umschaltrichtungen über die Komponenten-Callbacks; serverseitige Gebäuderegeln sind davon nicht umfasst.
- 2026-11-06: Maintainer bestätigt das STU-Verhalten bei mehreren Generatoren: Schnellschalter nur bei genau einem Schildgenerator, andernfalls nicht anbieten. Status auf `ready-for-agent` gesetzt.
- 2026-11-07: Umsetzung in `7e7143d8` integriert. `PanelDefense`-Frontendtests bestanden (3); decken beide Umschaltrichtungen, keinen/mehrere Generatoren und Generator im Bau ab. Unabhängige Review ohne Findings; `git diff --check` bestanden. Schnellschalter verwendet den bestehenden Feld-Umschaltpfad. Status auf `resolved` gesetzt.
