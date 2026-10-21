# Flugfolgen-Pipeline, Feldeffekt-Katalog und Zielfeldhinweise

**Status:** ready-for-agent
**Priority:** P2
**Size:** M
**Blocked by:** —

## Ziel

SWU bekommt eine erweiterbare Pipeline für Flugfolgen nach dem Vorbild von STU `PostFlight`-Consequences. Sie läuft nach jedem Flugschritt bzw. bei Ankunft. Ein gemeinsamer Feldeffekt-Katalog liefert Beschreibungen und Zielfeldhinweise zu allen STU-Effekten. Schon vor dem Flug zeigen Feldkontext, LSS und Navigation an, welche Effekte am Zielfeld drohen. Dieses Issue liefert die Grundlage für die Feldkosten (tmw-K1b), die Effekt-Handler (tmw-K2, tmw-K3a/b/c) und Anomalien (tmw-K10a). Es ändert selbst noch keine Energie- oder Schadensregel.

## STU-Quellen

- `src/Module/Spacecraft/Lib/Movement/Component/Consequence/PostFlight/*` (u. a. `FieldTypeEffectConsequence.php`, `DeflectorConsequence.php`, `AnomalyConsequence.php`), `.../Consequence/Flight/*`
- `src/Lib/Map/FieldTypeEffectEnum.php` (`getDescription`, `getFlightDestinationInfo`, `isActive`)
- `src/Component/Map/Effects/EffectHandling.php`, `Effects/Type/EffectHandlerInterface.php` (`handleIncomingSpacecraft`, `handleSpacecraftTick`, `addFlightInformation`)
- `src/Module/Spacecraft/Lib/Movement/Route/FlightRoute.php` (Warnung vor gefährlichen Feldern)

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/spacecraft.service.ts` (`navigate` ~Z. 1695, `flyGalaxy` ~Z. 1849, `warp`, `enterSystem`, `processTick` ~Z. 3305)
- `apps/backend/src/modules/starmap/entities/galaxy-field-type.entity.ts` (`effects`, `energyCost`, `damage`), `galaxy-field.entity.ts` (`effectFlags`), `system-field.entity.ts`
- `apps/frontend/src/components/spacecraft/FieldContextPanel.tsx` (heute nur `Effekte: a, b`), `NavigationPanel.tsx`, `LssMap.tsx`
- `apps/frontend/src/components/starmap-admin-fullmap/ValuePanel.tsx` (Effekt-Editor)
- `packages/shared/src/lib/starmap/index.ts` (neuer Effekt-Katalog)

## Akzeptanzkriterien

- [ ] `packages/shared` enthält ein Feldeffekt-Enum mit allen STU-Effekten (`WARPDRIVE_LEAK`, `REACTOR_LEAK`, `EPS_LEAK`, `CLOAK_UNUSEABLE`, `NFS_MALFUNCTION_COOLDOWN`, `LSS_MALFUNCTION`, `LSS_BLOCKADE`, `SHIELD_MALFUNCTION`, `NO_SPACECRAFT_COUNT`, `DUBIOUS_SPACECRAFT_COUNT`, `NO_SUBSPACE_LINES`, `ENERGY_WEAPON_BUFF/NERF`, `REGENERATION_CHANCE`, `HIT_CHANCE_INTERFERENCE`, `EVADE_CHANCE_INTERFERENCE`, `NO_PIRATES`, `NO_ANOMALIES`, `NO_MEASUREPOINT`, `NO_STATION_CONSTRUCTION`). Je Effekt gibt es eine deutsche Beschreibung, einen Zielfeldhinweis und das Flag „aktiv/passiv“. Die STU-Texte werden in SWU-Begriffe übertragen (z. B. „Hyperantrieb“ statt „Warpantrieb“, wo `CONTEXT.md` das verlangt).
- [ ] Der Admin-Effekt-Editor nutzt dieses Enum. Unbekannte Werte in der DB werden beim Lesen ignoriert und geloggt.
- [ ] Backend: Ein `FlightConsequencePipeline`-Dienst mit registrierbaren Consequences (Interface `onEnterField(ship, field, messages)`) wird in `navigate`, `flyGalaxy` (bei Ankunft), `enterSystem`/`leaveSystem` und `warp` für das Zielfeld aufgerufen. Bei feldweiser Bewegung wird er zusätzlich für jedes durchflogene Feld aufgerufen, und zwar genau einmal je Feld. Ein Tick-Hook `onTick(ship, field)` wird in `processTick` aufgerufen.
- [ ] Die Pipeline sammelt Meldungen je Schiff und liefert sie über den bestehenden Ergebnis- bzw. Ereignisweg ans Frontend (Schiffslog bzw. Meldungsleiste).
- [ ] Ein Zerstörungsabbruch ist vorgesehen: Wird ein Schiff in einer Consequence zerstört, laufen die folgenden nicht mehr.
- [ ] Frontend: Feldkontext und LSS-Tooltip zeigen die Effektbeschreibungen. Wählt der Spieler ein Ziel, zeigt die Navigation die Zielfeldhinweise sowie Energie und Schaden des Feldtyps als Warnung („Gefährliches Feld“), noch bevor der Flug startet.
- [ ] Backend-Tests: Die Pipeline wird bei allen Bewegungsarten genau einmal je Feld aufgerufen, der Abbruch nach Zerstörung greift, und der Effekt-Katalog ist vollständig (Snapshot gegen die STU-Liste). Frontend-Tests: `FieldContextPanel` und `NavigationPanel` zeigen Beschreibung und Warnung.

## Comments
