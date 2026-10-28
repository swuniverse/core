# Schiffsmülleimer: Waren entsorgen

**Status:** claimed
**Priority:** P3
**Size:** S
**Blocked by:** —

## Ziel

Wie in STU kann der Spieler Waren aus dem Schiffslager vernichten, um Platz zu schaffen.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Spacecraft/Action/RemoveWaste`, `Module/Spacecraft/View/ShowWasteMenu`, `html/spacecraft/waste.twig`

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/spacecraft.controller.ts`, `entities/cargo-item.entity.ts`
- `apps/frontend/src/components/spacecraft/ShipStoragePanel.tsx`, `CargoPanel.tsx`
- Vorbild Kolonie: `apps/frontend/src/pages/colonies/components/PanelWaste.tsx`

## Akzeptanzkriterien

- [ ] `POST :id/cargo/dispose` mit Liste `{commodityId, amount}`; Mengen werden auf den Bestand gekürzt, Meldung je Ware.
- [ ] Nur der Eigentümer, nicht im Hyperraumflug.
- [ ] Dialog im Lagerbereich mit Mengenfeldern je Ware und „alles“.
- [ ] Backend- und Frontend-Test.
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Comments
