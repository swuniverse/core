# Schildgenerator-Schnellschalter im Verteidigungspanel

**Status:** claimed
**Priority:** P3
**Size:** S
**Blocked by:** col-A1b

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

- [ ] Das Verteidigungspanel zeigt den Zustand des Schildgenerators (aktiv/inaktiv) und einen Knopf zum Umschalten.
- [ ] Das Umschalten verwendet dieselben Regeln wie die Feldschaltung (Energie, Schaden, Blockade, Hook aus col-A1a/b); beim Deaktivieren fallen die Schilde auf 0.
- [ ] Gibt es mehrere Schildgeneratoren, schaltet der Knopf alle bzw. ist nach STU-Vorbild nur bei genau einem verfügbar – Verhalten im Comment dokumentieren.
- [ ] Backend-Test (falls neuer Endpunkt) und Frontend-Test für beide Richtungen.

## Comments
