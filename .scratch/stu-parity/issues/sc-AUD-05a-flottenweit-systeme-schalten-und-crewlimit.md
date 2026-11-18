# Flottenkontrolle Backend: Systeme flottenweit schalten, 100 Crew je Flotte

**Status:** ready-for-agent
**Priority:** P2
**Size:** M
**Blocked by:** —

## Ziel

SWU kann Systeme nur je Schiff schalten (`PATCH :id/systems/:systemKey`); in großen Flotten muss vor einem Kampf jedes Schiff einzeln geschaltet werden. STU schaltet vom Führungsschiff aus NBS, Schilde, Strahlenwaffen, Torpedos, Tarnung und Warp flottenweit (`isfleet`) mit Meldung je Schiff. Außerdem fehlt die STU-Regel „höchstens 100 Crew je Flotte“ (`GameEnum::CREW_PER_FLEET`).

## STU-Quellen

- `src/Module/Spacecraft/Action/ActivateSystem/ActivateSystem.php` (Z. ~27, `isfleet`), `DeactivateSystem/`
- `src/Component/Spacecraft/System/Control/ActivatorDeactivatorHelper.php` (`activateFleet`, `deactivateFleet`, Z. ~48–130)
- `src/Module/Ship/Action/JoinFleet/AbstractJoinFleet.php` (Z. ~73, Crewsumme gegen `GameEnum::CREW_PER_FLEET`)
- `src/Component/Game/GameEnum.php` (`CREW_PER_FLEET = 100`), `src/Module/Maintenance/CorruptFleetDeletion.php`

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/spacecraft.controller.ts` (Flottenendpunkte `fleets/:fleetId/*`)
- `apps/backend/src/modules/spacecraft/spacecraft.service.ts` (`toggleSystem`, `joinFleet` Z. ~3374, `createFleet`; parallel in Arbeit, Zeilen auf HEAD)
- `apps/backend/src/modules/spacecraft/fleet-lock.ts`, `fleet-leadership.ts`
- `packages/shared/src/lib/spacecraft/index.ts` (Ergebnis-DTO je Schiff)

## Akzeptanzkriterien

- [ ] Neuer Endpunkt `PATCH fleets/:fleetId/systems/:systemKey` (nur Führungsschiff-Eigner) schaltet NBS, Schilde, Strahlenwaffen, Torpedobank, Tarnung und Hyperantrieb für alle Mitglieder schiffsweise wie STU: jedes Schiff einzeln mit eigenen Kosten/Prüfungen, Teilergebnis mit Meldung je Schiff, keine Gesamtablehnung.
- [ ] `joinFleet` (und Flottenerstellung) lehnt ab, wenn die Bauplan-Crewsumme der Flotte 100 übersteigen würde, mit STU-Meldung „maximal 100 Crew pro Flotte“.
- [ ] Bestandsflotten über dem Limit: Umgang festlegen (STU löscht korrupte Flotten in Maintenance) und umsetzen.
- [ ] Flotten-DTO liefert Crewsumme und Limit für die Anzeige (sc-AUD-05b, sc-AUD-16).
- [ ] Backend-Tests: Teilergebnis bei EPS-Mangel einzelner Schiffe, Rechteprüfung, Crewlimit beim Beitritt.

## Herkunft

- Audit 2026-11-17: [README.md](../audit-2026-11-17/README.md) Abschnitt B5 und E („Flottenkontrolle“); [spacecraft.md](../audit-2026-11-17/spacecraft.md) große Abweichung 5 und kleine Abweichungen (Crewzähler, `CREW_PER_FLEET`).
- PO-Linie 2026-11-17 „wie STU“ (README G–N). Kein bisheriges Ticket deckt das ab.

## Comments
