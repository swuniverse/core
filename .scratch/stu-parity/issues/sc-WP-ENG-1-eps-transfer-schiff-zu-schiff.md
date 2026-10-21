# EPS-Transfer Schiff zu Schiff

**Status:** ready-for-agent
**Priority:** P2
**Size:** S
**Blocked by:** sc-WP-ENG-2

## Ziel

Wie in STU kann ein Schiff Energie an ein anderes Schiff am selben Feld übertragen. Das NBS-Flag `energyTransfer` ist bereits vorbereitet.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Spacecraft/Action/EpsTransfer`, `Module/Spacecraft/View/ShowEpsTransfer`, `html/ship/showshipetransfer.twig`

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/spacecraft-engineering.service.ts`, `spacecraft.controller.ts`
- `apps/backend/src/modules/spacecraft/spacecraft.service.ts` (`getNearby`, `energyTransfer: false`)
- `packages/shared/src/lib/spacecraft/index.ts`
- `apps/frontend/src/components/spacecraft/NearbySensorPanel.tsx`, `TransferDialog.tsx`

## Akzeptanzkriterien

- [ ] `POST :id/nearby/:targetId/eps-transfer` mit Menge; Regeln wie STU (Quell-EPS abzüglich Transferkosten, Ziel-EPS bis Maximum, Kürzung mit Meldung „X von Y“).
- [ ] Erlaubnis über den Dienst aus sc-WP-ENG-2 inkl. Haltungsprüfung für fremde Ziele.
- [ ] Fremder Empfänger erhält eine Systemnachricht.
- [ ] NBS-Liste zeigt das STU-Icon (`e_trans2.png`) und öffnet einen Mengendialog.
- [ ] Backend-Tests (Erfolg, Kürzung, Ablehnung), Frontend-Test.
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Comments
