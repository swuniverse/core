# Flottenverwaltung: Backend vervollständigen und Aktionen am Schiff

**Status:** resolved
**Priority:** P1
**Size:** M
**Blocked by:** —

## Ziel

Spieler können Flotten wie in STU vollständig verwalten: vom Schiff aus erstellen, aus der NBS-Liste beitreten, verlassen, auflösen, umbenennen und den Leader wechseln. Das Backend hat heute nur erstellen, beitreten und verlassen, ohne Frontend-Nutzung. Die gruppierte Schiffsliste folgt in sc-WP-FLEET-1b.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Ship/Action/{CreateFleet,JoinFleet,LeaveFleet,DeleteFleet,RenameFleet,ChangeFleetFleader}`
- `html/spacecraft/nbsListBody.twig` (`B_JOIN_FLEET_NBS`), `html/spacecraft/spacecraft.twig` (Flottenstatus im Kopf)
- `Orm/Entity/Fleet.php`

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/entities/fleet.entity.ts`
- `apps/backend/src/modules/spacecraft/spacecraft.service.ts` (`createFleet`, `joinFleet`, Verlassen, `getUserFleets`)
- `apps/backend/src/modules/spacecraft/spacecraft.controller.ts` (`fleets/all`, `fleets/create`, `fleets/:fleetId/join`, `:id/leave-fleet`)
- `packages/shared/src/lib/spacecraft/index.ts`
- `apps/frontend/src/components/spacecraft/ShipHeaderTable.tsx`, `NearbySensorPanel.tsx`, `ShipQuickActions.tsx`

## Akzeptanzkriterien

- [x] Neue Endpunkte: Flotte auflösen (`DELETE fleets/:fleetId`), umbenennen (`PATCH fleets/:fleetId`, Namensvalidierung wie Schiffsname), Leader wechseln (`PATCH fleets/:fleetId/leader`, neues Mitglied muss in der Flotte sein).
- [x] Verlässt der Leader die Flotte, wird sie wie in STU aufgelöst (alle Mitglieder flottenlos); verlässt ein Mitglied, bleibt sie bestehen.
- [x] Beitritt nur für eigene Schiffe auf demselben Feld wie der Leader, nicht im Hyperraumflug, nicht zerstört; Fehlermeldungen auf Deutsch.
- [x] Nur der Eigentümer darf seine Flotten ändern (Backend-Test mit Fremdzugriff).
- [x] Schiffskopf zeigt Flottenname und Leader-Markierung; Aktionen „Flotte erstellen“ (mit Namensdialog), „Flotte verlassen“, bei Leader zusätzlich „Auflösen“, „Umbenennen“, „Leader wechseln“.
- [x] Die NBS-Liste zeigt bei eigenen Flotten-Leadern am Feld „Flotte beitreten“ (STU-Icon).
- [x] Backend-Tests für alle Regeln, Frontend-Tests für Schiffskopf-Aktionen und NBS-Beitritt.
- [x] `lint`, `typecheck`, `test` und `build` sind grün.

## Comments

Backend-Flottenregeln und Eigentümerprüfung in `spacecraft.service.ts`/Controller vervollständigt; Schiffskopf und NBS-Flottenbeitritt samt Shared-DTOs und Tests ergänzt. Die gruppierte Schiffsliste bleibt wie vorgesehen in sc-WP-FLEET-1b.
- 2026-11-14: Überholt durch Maintainer-Entscheidung (sc-WP-FLEET-4, 3ccad0b7): Der Leader kann die Flotte wie in STU nicht mehr verlassen; statt Auflösung beim Verlassen bleiben ihm Auflösen und Leader wechseln.
