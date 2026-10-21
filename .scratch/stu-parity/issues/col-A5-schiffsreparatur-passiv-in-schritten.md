# Schiffsreparatur in der Werft passiv in Schritten

**Status:** ready-for-agent
**Priority:** P2
**Size:** M
**Blocked by:** col-A1a, sc-WP-ENG-3

## Ziel

SWU zahlt die Reparaturkosten beim Einreihen vorab und repariert in einem einzigen Abschluss. STU repariert passiv in Schritten je Tick, verbraucht dabei Ersatzteile bzw. Systemkomponenten, hat Slots je Werftfeld (zwei mit Reparaturstation), benachrichtigt den Schiffseigner und kennt Abbruch und Reaktivierung. Die Vorabzahlung ist eine undokumentierte Abweichung (Leitplanke 1).

## STU-Quellen

- `src/Module/Colony/Action/RepairShip/`, `CancelShipRepair/`, `ReactivateShipRepair/`
- `src/Module/Tick/Process/FinishPassiveShipRepairJobs.php`, `src/Module/Tick/Process/RepairTaskJobs.php`
- `src/Module/Building/Action/Shipyard.php` (Slot-Logik `refreshRepairQueuesOnColony`, `REPAIR_SHIPYARD` → 2 Slots)
- `src/Component/Spacecraft/Repair/RepairUtil.php` (`getPassiveRepairStepDuration`)

## SWU-Pfade

- `apps/backend/src/modules/colony/colony-shipyard.service.ts` (`queueShipRepair`, `finishShipRepairQueue`, `cancelShipyardQueue`, `reactivateShipyardQueue`, `getActiveRepairSlotCount`)
- `apps/backend/src/modules/colony/entities/colony-ship-build-queue.entity.ts` (`ColonyShipRepairSnapshot`)
- `apps/frontend/src/pages/colonies/components/PanelShipyard.tsx`
- Ersatzteile: Ware 10001 (siehe `inventory/spacecraft.md`, WP-ENG-3)

## Akzeptanzkriterien

- [ ] Reparatur erfolgt je Tick in Schritten (Hülle und Systeme), Kosten je Schritt aus Ersatzteilen bzw. Komponenten; fehlen sie, pausiert der Auftrag.
- [ ] Slots je Werftfeld: 1, mit aktiver Reparaturstation 2; weitere Aufträge warten.
- [ ] Der Schiffseigner (auch fremd) erhält eine Nachricht im Ordner „Schiffe“ bei Start und Abschluss.
- [ ] Abbruch und Reaktivierung entsprechen STU; kein Vorab-Materialabzug mehr. Laufende Altaufträge mit Vorabzahlung werden per Migration abgeschlossen oder erstattet (keine Doppelbelastung).
- [ ] Backend- und Frontend-Tests für Schrittfortschritt, Slotbegrenzung, Ersatzteilmangel, Eignernachricht, Abbruch.

## Entscheidung

Vorgabe: Variante (b), STU-Modell. Passive Reparatur in Schritten je Tick mit Verbrauch von Ersatzteilen bzw. Systemkomponenten, Slots je Werftfeld (1, mit Reparaturstation 2), Eignernachricht, Abbruch und Reaktivierung wie STU. Vorabzahlung und Einmal-Abschluss entfallen; keine ADR.

## Comments

- 2026-10-21 Product Owner: Option b – Die Werftreparatur wird auf das STU-Modell umgebaut: passive Schritte je Tick mit Ersatzteil- bzw. Komponentenverbrauch, Slots je Werftfeld, Eignernachricht, Abbruch und Reaktivierung; die Vorabzahlung entfällt.
