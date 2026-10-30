# Wurmloch betreten und verlassen

**Status:** claimed
**Priority:** P2
**Size:** M
**Blocked by:** tmw-K1a

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

- [ ] `POST spacecraft/:id/wormhole/enter` (optional mit `wormholeId`, falls mehrere) bewegt ein Schiff vom Eingangsfeld zum Ausgang. Abgelehnt wird mit klarer Meldung, wenn das Schiff im Hyperraum bzw. `IN_FLIGHT` ist, im Kampf, zerstört oder im Standby, wenn es kein aktives Wurmloch am Feld gibt oder wenn Crew bzw. Energie fehlt (Kosten wie ein Flugschritt).
- [ ] Ein bidirektionales Wurmloch kann vom Ausgang zurück betreten werden. Bei `isRandomExit` wird ein zufälliges passierbares Feld der Zielebene gewählt (deterministisch testbar).
- [ ] Nach dem Sprung laufen Positionswechsel, Erkundung um das Schiff, Pipeline-Folgen am Zielfeld, Flottenschiffe nach bestehender Flottenlogik und ein Ereignis bzw. Logeintrag „Wurmloch durchflogen“. Falls tmw-K5 umgesetzt ist, wird die Zielebene bekannt.
- [ ] Die Zugriffsprüfung läuft über eine Schnittstelle `WormholeAccessPolicy`, deren Standardimplementierung alles erlaubt. tmw-K7b ersetzt sie.
- [ ] Frontend: Feldkontext bzw. Schnellaktionen zeigen auf einem Wurmlochfeld „Wurmloch betreten“ mit Name und Zielebene. Nach dem Sprung aktualisieren sich Schiffsdetail und Karte.
- [ ] Backend-Tests: Erfolgsfall, Rückrichtung, zufälliger Ausgang, alle Ablehnungsfälle, Flotte. Frontend-Test: Die Aktion erscheint nur auf Wurmlochfeldern und ruft die API auf.

## Comments

- 2026-10-28: Blockiert durch eine fehlende Produktentscheidung: Das Akzeptanzkriterium verlangt „Kosten wie ein Flugschritt“, aber SWU hat zwei unterschiedliche Flugressourcen (Systemflug verbraucht rumpfabhängige EPS, Galaxieflug verbraucht Warpdrive). Bitte festlegen, ob eine Wurmlochpassage rumpfabhängige EPS, Warpdrive oder eine andere feste Ressource kostet. Zusätzlich bitte festlegen, ob der Kostenbegriff für jedes Flottenmitglied separat gilt.
- 2026-10-30 Product Owner: Option 1. Wurmlochpassagen folgen der aktuellen STU-Laufzeitsemantik statt der ungenauen Formulierung „Kosten wie ein Flugschritt“. Beim Eintritt muss jedes bewegte Schiff einen funktionsfähigen Sublight-/Impulsantrieb besitzen; nur wenn dieser inaktiv ist, fällt für dieses Schiff dessen normale Aktivierungs-EPS an. Die Passage selbst verbraucht weder rumpfabhängige Flug-EPS noch Warpdrive. Beim Austritt fällt keine Antriebs- oder Streckenressource an. Flotten werden in SWU vollständig vorab und atomar validiert; jedes Mitglied muss seine eigene gegebenenfalls anfallende Aktivierungs-EPS tragen, Teilresultate wie in STU werden nicht übernommen. `isRandomExit` bleibt eine SWU-Funktion und wählt über einen injizierbaren RNG deterministisch testbar ein passierbares Feld der Zielebene. Ankunft führt Zielfeld-Pipeline, Erkundung, Ebenenkenntnis aus `tmw-K5c`, Signatur/Log und Reparaturabbruch in derselben erfolgreichen Operation aus. Das Issue ist `ready-for-agent`.
