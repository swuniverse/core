# Kolonieangriff vom Schiff aus (UI-Einstieg)

**Status:** claimed
**Priority:** P2
**Size:** S
**Blocked by:** —

## Ziel

Der vorhandene Endpunkt `POST /combat/attack-colony` bekommt einen Einstieg im Feldkontext des Schiffs. Offen ist, ob wie in STU ein Gebäude bzw. Feld gezielt angegriffen wird oder der heutige Ganz-Kolonie-Angriff bleibt.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Spacecraft/Action/AttackBuilding` (Angriff auf ein gewähltes Kolonie-Feld)
- `html/spacecraft/control/control_mid.twig`, Kolonie-Oberflächenansicht mit Angriffsziel

## SWU-Pfade

- `apps/backend/src/modules/combat/combat.controller.ts` (`attack-colony`), `combat.service.ts` (`attackColony`)
- `apps/frontend/src/components/spacecraft/FieldContextPanel.tsx`, `ColonyScanDialog.tsx`, `CombatReportDialog.tsx`

## Akzeptanzkriterien

- [ ] Fremde Kolonie im Orbit zeigt einen Knopf „Kolonie angreifen“ (nur bei feindlicher Haltung, sonst deaktiviert mit Grund).
- [ ] Der Knopf öffnet die Kolonieoberfläche zur Feldwahl; der Angriff trifft das Gebäude des gewählten Felds nach STU-Regeln (`AttackBuilding`); der Endpunkt nimmt das Zielfeld entgegen und lehnt Felder ohne Gebäude ab.
- [ ] Der Kampfbericht erscheint im vorhandenen `CombatReportDialog`.
- [ ] Backend- und Frontend-Tests decken Feldwahl, Gebäudeschaden und Ablehnungsfälle ab.
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Entscheidung

Vorgabe: Variante (a), STU-Verhalten. Feldwahl über die Kolonieoberfläche, Schaden am gewählten Gebäude, Endpunkt `attack-colony` um das Zielfeld erweitert. Der Ganz-Kolonie-Angriff entfällt bzw. wird nicht mehr über die UI angeboten.

## Comments

- 2026-10-21 Product Owner: Option a – Der Kolonieangriff folgt STU (`AttackBuilding`): Der Spieler wählt über die Kolonieoberfläche ein Feld und greift gezielt das Gebäude an; der Endpunkt wird entsprechend erweitert.
