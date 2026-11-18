# Beamen zwischen Station und angedocktem Schiff ohne EPS und im Ionensturm

**Status:** ready-for-agent
**Priority:** P2
**Size:** S
**Blocked by:** —

## Ziel

SWU verlangt beim Beamen zwischen Station und angedocktem Schiff immer Transferenergie. STU behandelt das als Dock-Transfer: Er kostet kein EPS und ist der einzige Warentransfer, der im Ionensturm erlaubt bleibt. Außerdem fehlt im Dock-Kasten der Station ein Schiffsselektor für das Beamen zum gewählten angedockten Schiff; Beamen geht bisher nur über das NBS.

## STU-Quellen

- `src/Lib/Transfer/CommodityTransfer.php` (Z. ~79 `$epsUsage = $isDockTransfer ? 0 : …`, `isDockTransfer` Z. ~95–101)
- `src/Lib/Interaction/Member/SpacecraftMember.php` (Z. ~62–76, `EXPECT_TARGET_DOCKED_OR_NO_ION_STORM`)
- `src/html/spacecraft/spacecraft.twig` (Dock-Kasten, Z. ~215–260), `src/html/station/dockControl.twig`

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/transfer.service.ts` (`chargeEnergy`, Z. ~438 HEAD / ~464 Arbeitsbaum)
- `apps/backend/src/modules/spacecraft/ship-colony-context.service.ts` (Z. ~91–98)
- `apps/backend/src/modules/spacecraft/nearby-interaction.ts` (`INTERACTION_HOOKS` leer, Kontext `sourceDocked`/`targetDocked`)
- `apps/backend/src/modules/anomaly/ion-storm-effects.ts`
- `apps/frontend/src/components/spacecraft/DockingPanel.tsx`, `TransferDialog.tsx`

## Akzeptanzkriterien

- [ ] Transfer von Waren (und Torpedos, soweit STU dort ebenfalls den Dock-Fall kennt) zwischen Station und einem an ihr angedockten Schiff in beide Richtungen kostet 0 EPS; die Meldung nennt „Energieverbrauch: 0“.
- [ ] Im Ionensturm sind Transfers blockiert, außer Dock-Transfers zwischen Station und an ihr angedocktem Schiff.
- [ ] Der Dock-Kasten der Station bietet je angedocktem Schiff „Beamen“, das den `TransferDialog` mit diesem Ziel öffnet.
- [ ] Backend-Tests für EPS 0 im Dock, EPS > 0 ohne Dock, Ionensturm mit/ohne Dock; Frontend-Test für den Einstieg im Dock-Kasten.

## Herkunft

- Audit 2026-11-17: [README.md](../audit-2026-11-17/README.md) Abschnitt H („Beamen zwischen Station und angedocktem Schiff kostet in SWU EPS“); [spacecraft.md](../audit-2026-11-17/spacecraft.md) kleine Abweichungen (DockingPanel, Beamen) und Unsicherheiten „Beamen der Station zu angedockten Schiffen“.
- PO-Linie „wie STU“ vom 2026-11-17. Der Ionensturm-Hook-Kontext aus [sc-WP-STAT-3a](sc-WP-STAT-3a-andocken-und-abdocken.md) ist vorhanden, aber ungenutzt.

## Comments

- `transfer.service.ts` wurde zuletzt parallel für SPEC-3/4 geändert; vor Beginn `git status` prüfen und auf dem aktuellen Stand aufsetzen.
