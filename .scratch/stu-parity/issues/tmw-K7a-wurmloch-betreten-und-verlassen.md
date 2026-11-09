# Wurmloch betreten und verlassen

**Status:** resolved
**Priority:** P2
**Size:** M
**Blocked by:** —

## Ziel

Ein Schiff auf einem Wurmlocheingang kann das Wurmloch betreten und erscheint am Ausgang, ggf. auf einer anderen Ebene. Bei bidirektionalen Wurmlöchern geht das auch in Gegenrichtung, bei `isRandomExit` endet der Flug an einem zufälligen passierbaren Feld der Zielebene. Dieses Issue ist kanonischer Eigentümer und ersetzt `sc-WP-NAV-4`, ohne die Zugangsbeschränkungen (die stehen in tmw-K7b). Ohne Beschränkungen dürfen alle Schiffe passieren.

## STU-Quellen

- `src/Module/Spacecraft/Action/EnterWormhole/EnterWormhole.php` (Sanity: nicht im Warp, keine Station, Berechtigung), `LeaveWormhole/*`
- `src/Module/Spacecraft/View/ShowWormholeControl/*`
- `src/Component/Ship/Wormhole/*`, `src/Orm/Entity/WormholeEntry.php`
- `src/Module/Spacecraft/Lib/Movement/Route/RandomSystemEntry.php`, `FlightRouteFactory#getRouteForWormholeDestination`

## SWU-Pfade

- `apps/backend/src/modules/starmap/wormhole.service.ts` (`findExitsAt` ~Z. 79, bisher ungenutzt), `entities/wormhole.entity.ts` (`isBidirectional`, `isRandomExit`, `isActive`)
- `apps/backend/src/modules/spacecraft/spacecraft.service.ts` (`setCurrentLocation`, `discoverGalaxyAroundShip`, `getFieldContext`), `spacecraft.controller.ts`
- Flugfolgen-Pipeline aus tmw-K1a (Einflugfolgen am Zielfeld), Ebenenkenntnis aus tmw-K5 (falls umgesetzt: Zielebene wird bekannt)
- `apps/frontend/src/components/spacecraft/FieldContextPanel.tsx`, `ShipQuickActions.tsx`, `ship-action-registry.ts`, `apps/frontend/src/components/starmap/StarmapCanvas.tsx`

## Akzeptanzkriterien

Dieses Parent-Ticket ist ein Tracking-Split; die Ausführung erfolgt in den drei geordneten Child-Issues:

- [x] `tmw-K7a1`: Backend-Kern für Passage, Endpunkt, Zugriffs-Policy und deterministische Ausgangswahl.
- [x] `tmw-K7a2`: atomare Flottenvalidierung sowie Zielfeldfolgen, Erkundung, Signatur/Log und Ebenenkenntnis.
- [ ] `tmw-K7a3`: Shared-/Frontend-Verträge, Feldkontext- und Schnellaktionen sowie Oberflächentests.

## Comments

- 2026-10-28: Blockiert durch eine fehlende Produktentscheidung: Das Akzeptanzkriterium verlangt „Kosten wie ein Flugschritt“, aber SWU hat zwei unterschiedliche Flugressourcen (Systemflug verbraucht rumpfabhängige EPS, Galaxieflug verbraucht Warpdrive). Bitte festlegen, ob eine Wurmlochpassage rumpfabhängige EPS, Warpdrive oder eine andere feste Ressource kostet. Zusätzlich bitte festlegen, ob der Kostenbegriff für jedes Flottenmitglied separat gilt.
- 2026-10-30 Product Owner: Option 1. Wurmlochpassagen folgen der aktuellen STU-Laufzeitsemantik statt der ungenauen Formulierung „Kosten wie ein Flugschritt“. Beim Eintritt muss jedes bewegte Schiff einen funktionsfähigen Sublight-/Impulsantrieb besitzen; nur wenn dieser inaktiv ist, fällt für dieses Schiff dessen normale Aktivierungs-EPS an. Die Passage selbst verbraucht weder rumpfabhängige Flug-EPS noch Warpdrive. Beim Austritt fällt keine Antriebs- oder Streckenressource an. Flotten werden in SWU vollständig vorab und atomar validiert; jedes Mitglied muss seine eigene gegebenenfalls anfallende Aktivierungs-EPS tragen, Teilresultate wie in STU werden nicht übernommen. `isRandomExit` bleibt eine SWU-Funktion und wählt über einen injizierbaren RNG deterministisch testbar ein passierbares Feld der Zielebene. Ankunft führt Zielfeld-Pipeline, Erkundung, Ebenenkenntnis aus `tmw-K5c`, Signatur/Log und Reparaturabbruch in derselben erfolgreichen Operation aus.

- 2026-10-30 Ralph: Abbruch vor Produktcode: Das Issue ist trotz markierter Größe M ein vertikaler Querschnitt über transaktionale/atomare Flottenbewegung, neue Zugangs-Policy, deterministische Zufallsauswahl, Zielfeld-Pipeline, Signaturen/Schiffslog, Reparaturabbruch, Ebenenkenntnis, Shared-DTO, Feldkontext und Frontend-Test. Die bestehende `SpacecraftService`-Flottenlogik ist zudem bei nicht fixierten Flotten bewusst partiell und damit nicht direkt für die geforderte vollständige atomare Vorabvalidierung wiederverwendbar. Entscheidung, in geordnete Backend-Kern-, Integrations-/Flotten- und Frontend-Child-Issues aufzuteilen; Parent `resolved`, Implementierung in `tmw-K7a1` bis `tmw-K7a3`.

- 2026-11-06 Product Owner: Bestätigt die Aufteilung in drei geordnete Child-Issues; Parent bleibt `resolved` als Tracking-Split. `tmw-K7a1` ist der Backend-Kern, `tmw-K7a2` die atomare Flotten-/Ankunftsintegration und `tmw-K7a3` die Shared-/Frontend-Oberfläche.
- 2026-11-09: K7a1/K7a2 gemeinsam implementiert und lokal am vollständigen Backend geprüft; deren Tracking-Checkboxen sind abgeschlossen. Unabhängiger Review und serielle Integration bleiben ausstehend; K7a3 bleibt offen, ohne Shared-/Frontend-Änderung. Evidenz einschließlich finaler Gates und Build-Zeitpunkt: `.workmux/tmw-K7a2-resumed-atomic-report-20261109.md`.
