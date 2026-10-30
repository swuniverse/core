# EPS-Transfer Schiff zu Schiff

**Status:** resolved
**Priority:** P2
**Size:** S
**Blocked by:** sc-WP-ENG-2c

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

- [x] `POST :id/nearby/:targetId/eps-transfer` mit Menge; Regeln wie STU (Quell-EPS abzüglich Transferkosten, Ziel-EPS bis Maximum, Kürzung mit Meldung „X von Y“).
- [x] Erlaubnis über den Dienst aus sc-WP-ENG-2c inkl. Haltungsprüfung für fremde Ziele.
- [x] Fremder Empfänger erhält eine Systemnachricht.
- [x] NBS-Liste zeigt das STU-Icon (`e_trans2.png`) und öffnet einen Mengendialog.
- [x] Backend-Tests (Erfolg, Kürzung, Ablehnung), Frontend-Test.
- [x] `lint`, `typecheck`, `test` und `build` sind grün.

## Comments

Umgesetzt: `EpsTransferService` (`apps/backend/src/modules/spacecraft/eps-transfer.service.ts`), Route `POST :id/nearby/:targetId/eps-transfer` mit `{ amount }`. Quelle zahlt 3 EPS je Batterieeinheit (STU), Ziel-Batterie bis `batteryMax`, Kürzung mit Meldung „X von Y“. Regeln über `checkInteraction` (Position, Crew, Schilde, Hyperraum; bei fremden Zielen zusätzlich Urlaub + Haltung). Fremder Empfänger erhält Systemnachricht im Ordner TRADE. NBS: `energyTransfer` folgt `TRANSFER`-Regeln, Icon `e_trans2.png` öffnet `EpsTransferDialog`. Tests: `eps-transfer.service.spec.ts`, `NearbySensorPanel.spec.tsx`.
Offen: Schiffe ohne Batterie (`batteryMax` 0) werden mit „bereits voll“ abgelehnt (STU: „kein Energiesystem“); NPC-Handelslog (`logIfNpcInvolved`) nicht umgesetzt.
