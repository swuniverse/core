# Schiffsmülleimer: Waren entsorgen

**Status:** needs-info
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

- 2026-10-28: Umsetzung und fokussierte Backend-/Frontend-Tests waren erfolgreich, aber die vorgeschriebene Prüfung `npx nx affected -t lint typecheck test --base=HEAD` bleibt nach zwei ernsthaften Versuchen rot. `frontend:typecheck` meldet repo-weit TS6305 für nicht erzeugte `apps/frontend/dist/**/*.d.ts`-Ausgaben (auch nach erfolgreichem `npx nx run-many --targets=build`). Produktcode gemäß Abbruchregel verworfen. Bitte den Frontend-Typecheck-/Declaration-Build reparieren oder bestätigen, wie diese bekannte Infrastrukturblockade im Ralph-Lauf zu behandeln ist.
