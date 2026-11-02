# Datenbankkategorie „Regionen“

**Status:** ready-for-agent
**Priority:** P2
**Size:** S
**Blocked by:** tmw-K8a, tmw-K8b2

## Ziel

Der Platzhalter „Regionen – Kartierung wird aufgebaut“ im Datenbank-Hub wird zu einer echten Kategorie. Sie listet alle Kartenregionen mit `???`-Maskierung für noch nicht entdeckte Einträge. Entdeckte Regionen zeigen Name, Beschreibung und Ebene. Offen ist, welches Ereignis einen Regionseintrag erzeugt.

## STU-Quellen

- `src/Component/Database/DatabaseCategoryTypeEnum.php` (`REGION`), `src/Orm/Entity/MapRegion.php` (`database_id`)
- `src/html/database/regioninfo.twig`
- `src/Module/Tick/Spacecraft/Handler/FinishedAstroMappingHandler.php`: In STU entsteht der Regionseintrag beim Abschluss der Kartographie außerhalb eines Systems („der Region …“).
- `src/Module/Ship/View/ShowShip/ShipShowStrategy.php#getDatabaseEntryForShipLocation`

## SWU-Pfade

- `apps/backend/src/modules/starmap/entities/map-region.entity.ts`, Admin-CRUD `admin/regions` in `starmap.controller.ts`
- Entdeckungsmuster: `apps/backend/src/modules/starmap/system-type-discovery.service.ts`, `celestial-class-discovery.service.ts`, `entities/system-type-discovery.entity.ts`
- `apps/backend/src/modules/spacecraft/cartography-plan.service.ts` (ADR-0003)
- `apps/backend/src/modules/prestige/prestige.constants.ts` (`CARTOGRAPHY_REGION: 5`)
- `apps/frontend/src/pages/database.tsx` (Gruppe „Wichtige Orte“)

## Akzeptanzkriterien

- [ ] Die Kategorie liest die persönliche Regionsentdeckung aus tmw-K8b; es gibt keine weitere Entdeckungsquelle (insbesondere kein Betreten). Prestige wird nicht hier, sondern in tmw-K8b vergeben.
- [ ] `GET database/regions?layerId=` liefert alle Regionen der Ebene. Nicht entdeckte Regionen erscheinen als `???`, ohne Beschreibung.
- [ ] Der Hub-Eintrag „Regionen“ ist verlinkt, und die Kategorie folgt dem Muster der Sternensystemtypen (Liste, Zähler „x von y entdeckt“).
- [ ] Backend-Tests: Maskierung, Anzeige entdeckter Regionen (Name, Beschreibung, Ebene). Frontend-Test: Maskierung und Detailanzeige.

## Entscheidung

Vorgabe: Variante (b), wie STU. Der Regionseintrag entsteht ausschließlich durch den Abschluss einer Regionskartographie aus tmw-K8b. Speicherung der Regionsentdeckung und Prestigevergabe gehören zu tmw-K8b; dieses Issue baut die Datenbankkategorie auf der dort angelegten Entdeckung auf. Kein Entdecken durch Betreten.

## Comments

- 2026-10-21 Product Owner: Option b – Der Regions-Datenbankeintrag entsteht wie in STU ausschließlich durch den Abschluss einer Regionskartographie (tmw-K8b); das Issue ist deshalb zusätzlich von tmw-K8b blockiert.
