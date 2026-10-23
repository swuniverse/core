# Flotten-Alarmstufe

**Status:** claimed
**Priority:** P2
**Size:** S
**Blocked by:** sc-WP-FLEET-1b

## Ziel

Wie in STU setzt der Spieler im Flottenkopf die Alarmstufe Grün, Gelb oder Rot für alle Schiffe der Flotte auf einmal. Die Systemkopplung jedes Schiffs folgt der vorhandenen Einzelschiff-Logik.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Ship/Action/{FleetAlertGreen,FleetAlertYellow,FleetAlertRed}`
- `html/shiplistFleetform.twig`

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/spacecraft-alert.service.ts`
- `apps/backend/src/modules/spacecraft/spacecraft.controller.ts`
- `apps/frontend/src/pages/spacecraft.tsx`

## Akzeptanzkriterien

- [ ] `PATCH fleets/:fleetId/alert-state` setzt die Stufe für jedes Mitglied über `spacecraft-alert.service.ts`; Schiffe, bei denen das scheitert, werden mit Grund gemeldet, die übrigen werden umgestellt.
- [ ] Flottenkopf zeigt drei Alarm-Icons (STU-Assets) mit aktiver Stufe.
- [ ] Backend-Test (gemischtes Ergebnis) und Frontend-Test.
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Comments
