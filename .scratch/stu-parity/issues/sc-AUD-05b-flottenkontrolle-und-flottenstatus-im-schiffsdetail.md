# Flottenkontrolle UI: Flottenschalter, Flottenstatus und Alarmstufe im Schiffsdetail

**Status:** resolved
**Priority:** P2
**Size:** M
**Blocked by:** sc-AUD-05a

## Ziel

Im Schiffsdetail fehlt die STU-Box „Flottenkontrolle“ auf dem Führungsschiff (flottenweit Systeme an/aus, Flotten-Alarmstufe) und der „Flottenstatus“ mit Hülle, Schild und EPS jedes Mitglieds samt Link „zum Führungsschiff wechseln“. Die Flotten-Alarmstufe gibt es in SWU nur in der Schiffsliste.

## STU-Quellen

- `src/html/spacecraft/control/control_mid.twig` (Z. ~105–135, Makros `fleetActivate`/`fleetDeactivate`/`fleetAction` Z. ~481–495)
- `src/html/spacecraft/control/control_right.twig` (Makro `fleetInfo`, Z. ~275–300)
- `src/Module/Ship/Action/FleetAlertGreen/`, `FleetAlertYellow/`, `FleetAlertRed/`

## SWU-Pfade

- `apps/frontend/src/components/spacecraft/ShipControlCenter.tsx` (neue Box Flottenkontrolle)
- `apps/frontend/src/components/spacecraft/ShipHeaderTable.tsx` (`FleetActions`, Z. ~448–546)
- `apps/frontend/src/pages/spacecraft.tsx` (bestehende Flotten-Alarmstufe Z. ~164–180 als Vorlage)
- `apps/backend/src/modules/spacecraft/spacecraft.controller.ts` (`fleets/:fleetId/alert-state`, Flottenstatus im Detail-DTO)
- `packages/shared/src/lib/spacecraft/index.ts` (Mitgliederwerte im Detail-DTO)

## Akzeptanzkriterien

- [x] Auf dem Führungsschiff zeigt das Schiffsdetail eine Box „Flottenkontrolle“ mit Aktivieren/Deaktivieren für NBS, Schilde, Strahlenwaffen, Torpedos, Tarnung (nur wenn verfügbar) und Hyperantrieb sowie den drei Flotten-Alarmstufen; Ergebnis je Schiff wird angezeigt.
- [x] Jedes Flottenmitglied zeigt „Flottenstatus“: je Mitglied Name, Hülle, Schild, EPS als Balken/Werte; Link zum Führungsschiff.
- [x] Detail-DTO liefert die Mitgliederwerte ohne Zusatzabfrage je Mitglied.
- [x] Frontend-Tests für Box auf Leader vs. Mitglied, Schaltaufruf und Flottenstatus; Backend-Test für das erweiterte DTO.

## Herkunft

- Audit 2026-11-17: [README.md](../audit-2026-11-17/README.md) Abschnitt B5, E; [spacecraft.md](../audit-2026-11-17/spacecraft.md) große Abweichung 5, Seitenabgleich „Schiffskontrolle“ und „Flottenstatus“.
- [sc-WP-FLEET-2b](sc-WP-FLEET-2b-flotten-alarmstufe.md) (resolved) bietet die Flotten-Alarmstufe nur in der Liste, nicht im Schiffsdetail wie STU.

## Comments

- 2026-11-24 – **Durch sc-AUD-23/sc-AUD-24 erledigt, resolved ohne eigene Änderung.** Flottenkontrolle-Box (`FleetControlPanel`, Systeme an/aus inkl. Tarnung/Hyperantrieb, drei Alarmstufen, Fehlschläge je Schiff) und Flottenstatus (`FleetStatusPanel`, Hülle/Schilde/EPS/Hyperantrieb je Mitglied) sind umgesetzt und im gesammelten Verifikationslauf auf `83bca5c5` geprüft (Tests `FleetControlPanel.spec.tsx`, `FleetStatusPanel.spec.tsx`). Abweichung vom Tickettext, bewusst wie STU `fleetInfo`: Den Statusblock sieht nur das Führungsschiff, Mitglieder zeigen „zum Führungsschiff wechseln“. Mitgliederwerte kommen aus einer einzigen `/spacecraft`-Abfrage statt aus dem Detail-DTO (keine Abfrage je Mitglied); kein Backend-DTO-Test nötig. Modell: Opus 5.5 direkt.
