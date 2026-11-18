# Datenbank: Rumpf- und Stationsrumpfdetail wie STU shiprump.twig

**Status:** ready-for-agent
**Priority:** P2
**Size:** M
**Blocked by:** —

## Ziel

Die Rumpfkategorien der Datenbank sind in STU ein Nachschlagewerk: Jeder entdeckte Rumpf ist klickbar und zeigt seine Werte. In SWU listen `ShipClasses` und die Stationsrumpf-Liste nur Name und Datum, ohne Bild und ohne Link. Die Backend-Endpunkte `GET database/ship-classes/:key` und `GET database/station-classes/:key` existieren, liefern aber die rohe Entity und haben keinen Aufrufer.

Dieses Ticket baut:

- Einen typisierten Detailvertrag statt der rohen Entity, mit den STU-Feldern soweit in SWU vorhanden: Fraktion, Kategorie/Rolle, Modullevel-Spannen je Modultyp, Flugkosten, Lagerraum, Beamfaktor, Masse, Traktortraglast, Waffensalven, Torpedolevel/-salven/-kapazität, Sensorreichweite, min./max. Crew, EPS-Kapazität, Baukosten, Bauzeit; für Stationen zusätzlich benötigte Workbees. Werte, die SWU nicht kennt, werden weggelassen und im Ticket-Kommentar aufgezählt (keine erfundenen Werte).
- Detailseiten `/database/ship-classes/:key` und `/database/station-classes/:key` mit Rumpfbild und Wertetabelle.
- Rumpfbilder und Links in beiden Listen (nicht entdeckt: `???`, kein Link, wie STU).

## STU-Quellen

- `src/Module/Database/View/DatabaseEntry/ShowDatabaseEntry.php` (Rumpfzweig, `PLAN`, `MODS`, `EPS`, `SENSORRANGE`, `RUMP`)
- `src/html/database/shiprump.twig` (Schiffs- und Stationsvariante), `src/html/database/databaseEntry.twig`
- `src/html/database/databasecategory.twig` (`category_rumptypes`, Rumpfbilder)

## SWU-Pfade

- `apps/backend/src/modules/database/database.controller.ts` (`ship-classes/:key` Z. ~178, `station-classes/:key`)
- `apps/backend/src/modules/database/database.service.ts` (`getShipClasses` Z. 679, `getShipClassDetail` Z. 712, `getStationClasses` Z. 727, `getStationClassDetail` Z. 770)
- `apps/backend/src/modules/spacecraft/entities/ship-class-def.entity.ts`, `ship-class-discovery.entity.ts`, `station-class-discovery.entity.ts`
- `apps/backend/src/modules/game-data/game-data.service.ts` (`getShipClassDefs`, Modul-/Layoutdaten)
- `packages/shared/src/lib/database/index.ts` (neuer DTO)
- `apps/frontend/src/pages/database.tsx` (`ShipClasses` Z. 1222, Routen/`View`), `apps/frontend/src/lib/assets.ts` (`shipImage`)
- Referenz für bereits vorhandene Basiswerte: `apps/frontend/src/pages/colonies/components/PanelShipyard.tsx` (Z. 658–720)
- Tests: `apps/backend/src/modules/database/database.service.spec.ts`, `apps/frontend/src/pages/database.spec.tsx`

## Akzeptanzkriterien

- [ ] `GET database/ship-classes/:key` und `GET database/station-classes/:key` liefern einen typisierten DTO aus `@swuniverse/shared` statt der Entity; nur für entdeckte Rümpfe (sonst 404 wie bisher).
- [ ] Detailseiten zeigen Rumpfbild und alle verfügbaren Werte; Seitentitel/Breadcrumb „Datenbank / Schiffsrümpfe / Name“.
- [ ] Listen zeigen Rumpfbild und verlinken entdeckte Rümpfe; nicht entdeckte bleiben `???` ohne Link.
- [ ] Backend-Tests: DTO-Felder, 404 für nicht entdeckte bzw. NPC-Rümpfe, Stationsvariante mit Workbees. Frontend-Tests: Liste mit Bild und Link, Detailseite rendert Werte.

## Herkunft

- Audit: [README.md](../audit-2026-11-17/README.md) Abschnitt A „Rumpf-/Stationsrumpf-Detail in der Datenbank“ (tmw-D6b), Abschnitt H „Widerlegt/korrigiert: Rumpfdetails“; [trade-map-world.md](../audit-2026-11-17/trade-map-world.md) „Große Abweichungen 3“ und „Rumpfdetails an anderer Stelle“.
- tmw-D6b ist `resolved` mit „Frontend-Test: Kategorie und Detail“, im Frontend gibt es aber keine Detailansicht.

## Comments
