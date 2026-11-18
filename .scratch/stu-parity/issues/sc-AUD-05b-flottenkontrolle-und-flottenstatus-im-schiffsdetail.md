# Flottenkontrolle UI: Flottenschalter, Flottenstatus und Alarmstufe im Schiffsdetail

**Status:** ready-for-agent
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

- [ ] Auf dem Führungsschiff zeigt das Schiffsdetail eine Box „Flottenkontrolle“ mit Aktivieren/Deaktivieren für NBS, Schilde, Strahlenwaffen, Torpedos, Tarnung (nur wenn verfügbar) und Hyperantrieb sowie den drei Flotten-Alarmstufen; Ergebnis je Schiff wird angezeigt.
- [ ] Jedes Flottenmitglied zeigt „Flottenstatus“: je Mitglied Name, Hülle, Schild, EPS als Balken/Werte; Link zum Führungsschiff.
- [ ] Detail-DTO liefert die Mitgliederwerte ohne Zusatzabfrage je Mitglied.
- [ ] Frontend-Tests für Box auf Leader vs. Mitglied, Schaltaufruf und Flottenstatus; Backend-Test für das erweiterte DTO.

## Herkunft

- Audit 2026-11-17: [README.md](../audit-2026-11-17/README.md) Abschnitt B5, E; [spacecraft.md](../audit-2026-11-17/spacecraft.md) große Abweichung 5, Seitenabgleich „Schiffskontrolle“ und „Flottenstatus“.
- [sc-WP-FLEET-2b](sc-WP-FLEET-2b-flotten-alarmstufe.md) (resolved) bietet die Flotten-Alarmstufe nur in der Liste, nicht im Schiffsdetail wie STU.

## Comments
