# Stationswerft: Schiffe an Werftstationen bauen

**Status:** ready-for-agent
**Priority:** P3
**Size:** M
**Blocked by:** sc-WP-STAT-2

## Ziel

Wie in STU baut eine Werftstation Schiffe aus Bauplänen, mit dem Modulbildschirm der Kolonie-Werft und Ressourcen aus dem Stationslager.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Station/Action/BuildShipyardShip`, `html/station/shipyardOptions.twig`
- `Lib/ModuleScreen/*`

## SWU-Pfade

- `apps/backend/src/modules/colony/colony-shipyard.service.ts` (`validateModuleSelections`, Bauqueue; Logik für Quelle Station wiederverwenden)
- `apps/frontend/src/pages/colonies/components/PanelShipyard.tsx` (`ShipHullDesigner`)

## Akzeptanzkriterien

- [ ] Ein quellneutraler Schiffbau-Anwendungskern besitzt gemeinsame Bauplan-/Modulvalidierung, Kostenberechnung, Queue-Erzeugung und Fertigstellungs-/Spawn-Primitiven. Kolonie und Raumwerft verwenden dünne Adapter; es gibt keine kopierte Stations-Baulogik.
- [ ] Die generalisierte Queue identifiziert genau einen Bauursprung `COLONY` oder `STATION` mit genau einer gültigen Quellreferenz. Migration und bestehende Kolonieaufträge bewahren die Semantik aus `col-A3b`.
- [ ] Werftstationen bieten Bauoptionen gemäß Rolle; Bau verbraucht Module/Waren atomar aus dem Stationslager und läuft über den gemeinsamen Queue- und Fertigstellungsprozess.
- [ ] Das fertige Schiff gehört dem Spieler und erscheint angedockt an der Raumwerft; die Dockkapazität wird autoritativ geprüft und ein nicht erfüllbarer Abschluss bleibt konsistent wiederholbar statt Ressourcen oder Auftrag zu verlieren.
- [ ] `SpacecraftModule` injiziert nicht `ColonyShipyardService` in den `SpacecraftController`; zusätzliche `forwardRef`-, `ModuleRef`- oder Lazy-Service-Workarounds sind kein zulässiger Ersatz für die quellneutrale Grenze.
- [ ] Regeln aus col-A3a (Crew, Spezialmodule) gelten auch hier.
- [ ] Backend-Tests, Frontend-Test.
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

> **Offene Umsetzung:** Der aktuelle `ShipbuildingCoreService` wird nur von der Stationswerft verwendet und teilt lediglich Vorbereitung und Modulerzeugung. Kolonie und Station besitzen weiterhin getrennte Queue-Erzeugungs- und Fertigstellungspfade. Vor Auflösung müssen beide Quellen denselben quellneutralen Workflow verwenden; außerdem fehlen belastbare Architektur-/Migrationstests und die Station verwendet noch keine gespeicherten Baupläne.

## Entscheidung

Kolonie und Raumwerft teilen einen autoritativen, quellneutralen Schiffbau-Workflow samt generalisiertem Queue- und Fertigstellungsprozess. Die Queue modelliert genau einen Ursprung `COLONY` oder `STATION`; die jeweiligen Endpunkte adaptieren Lager, Slots und Ursprung in dünnen Adaptern. `ColonyShipyardService` ist nicht Eigentümer des gemeinsamen Workflows und wird nicht in den `SpacecraftController` injiziert. Neue `forwardRef`-, `ModuleRef`- oder Lazy-Auflösungen zur Umgehung des Modulzyklus sind ausgeschlossen.

## Comments

- 2026-10-29: Nach zwei ernsthaften Verifikationsversuchen abgebrochen. Der neue Stationswerft-Service löste beim Laden über `spacecraft.controller.ts` in bestehenden Controller-Tests eine TypeORM-Zirkularabhängigkeit in `@InjectRepository()` aus; zusätzlich blieben die vorgeschriebenen `nx affected`-Prüfungen für Backend-Test sowie Frontend-Test/Typecheck rot. Der vorgeschriebene Build war grün. Der Produktcode wurde gemäß Ralph-Abbruchregel vollständig verworfen. Vor einer erneuten Umsetzung muss geklärt werden, wie die Werftlogik ohne diese Modul-/Entity-Zirkularabhängigkeit über den Spacecraft-Controller eingebunden und zugleich die vorhandene Kolonie-Bauqueue-Logik ohne Kopie wiederverwendet werden soll.
- 2026-10-30 Product Owner: Option 1. Schiffbau wird in einen quellneutralen Anwendungskern mit gemeinsamer Validierung, Kostenberechnung, Queue-Erzeugung und Fertigstellung extrahiert. Queue-Persistenz besitzt genau einen Ursprung `COLONY` oder `STATION`; Kolonie und Raumwerft verwenden dünne Adapter. Die `col-A3b`-Semantik bleibt bei Migration und Kolonieadapter erhalten. Eine direkte Injection von `ColonyShipyardService` in den Spacecraft-Controller oder ein zusätzlicher `forwardRef`-/Lazy-Service-Workaround ist ausgeschlossen.
- 2026-11-03 Audit: Stationsrolle, atomare Lagerentnahme, kanonische Module, Crew-/Stat-/Runtime-Initialisierung, Dockkapazitäts-Retry sowie Backend- und Frontend-Tests wurden repariert. Vollständige Backend-Tests (200 Suites/1.896 Tests), vollständige Frontend-Tests (88 Dateien/585 Tests), Typechecks und Ralph-Tests sind grün. Das Issue wurde dennoch auf `ready-for-agent` zurückgesetzt: `ColonyShipyardService` verwendet den gemeinsamen Core nicht, Queue-Erzeugung und Fertigstellung sind weiterhin quellenspezifisch dupliziert, und Stationsaufträge persistieren keine echten Baupläne. Diese offenen Architektur-Kriterien dürfen nicht als erledigt markiert werden.
