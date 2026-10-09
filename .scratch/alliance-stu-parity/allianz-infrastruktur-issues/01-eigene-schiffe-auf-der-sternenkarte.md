# 01: Eigene Schiffe auf der Sternenkarte (Tracer Bullet)

**What to build:** Ein Spieler sieht auf der Sternenkarte seine eigenen Schiffe der angezeigten Kartenebene. Der Sternenkarten-Sichtbarkeitsdienst entsteht als Erweiterung der vorhandenen Live-Positions-Sichtbarkeit und ist die einzige Stelle, die Kartenkontakte bestimmt. Die neue Allianz-Infrastruktur-Fähigkeit existiert, ist aber deaktiviert; in diesem Ticket liefert der Dienst ausschließlich eigene Schiffe.

**Blocked by:** None (can start immediately)

**Status:** resolved

**Triage label:** ready-for-agent
**Tracker:** local Markdown issue tracker (`.scratch/alliance-stu-parity/allianz-infrastruktur-issues/01-eigene-schiffe-auf-der-sternenkarte.md`)
**Spec:** `.scratch/alliance-stu-parity/allianz-infrastruktur-spec.md`

- [x] Die Kartenkontakt-DTOs, Sichtbarkeitsgründe (`OWN`, `ALLIANCE`, `SHARED_LIVE_POSITION`), Haltungen und der optionale Verwaltungsdetailblock liegen in `packages/shared`.
- [x] Eine authentifizierte Route im Spacecraft-Modul liefert die Kartenkontakte des Betrachters für eine Pflicht-Kartenebene; eine unbekannte Ebene ergibt Not Found. Die Antwort enthält ein Flag, ob Allianz- und Partnerkontakte aktiv sind.
- [x] Eine ausdrückliche Allianz-Infrastruktur-Fähigkeit ist standardmäßig deaktiviert, analog zur Fähigkeit des Diplomatie-Kerns; deaktiviert meldet das Flag inaktiv.
- [x] Eigene Schiffe erscheinen mit Grund `OWN`, ohne Haltung und mit Verwaltungsdetails (Status, Alarmstufe, Hülle/max., Crew/max.).
- [x] Zerstörte Schiffe, Schiffe ohne auflösbare Position und Schiffe anderer Kartenebenen fehlen.
- [x] Die Sternenkarten-Seite rendert Schiffsmarker als testbares DOM-/SVG-Overlay über dem Kartencanvas, nach dem Muster des Hyperraumrouten-Overlays; Kontakte derselben Galaxiezelle werden zu einem Marker mit Anzahl gebündelt. Schiffe in einem System erscheinen an der Systemzelle.
- [x] Ein Auswahlpanel zeigt die gelieferten Daten des gewählten Markers beziehungsweise Bündels; eigene Schiffe verlinken auf die Schiffsansicht.
- [x] Die Seite lädt die Kontakte beim Öffnen, beim Ebenenwechsel, alle 30 Sekunden bei sichtbarer Seite und bei den vorhandenen Socket-Ereignissen für eigene Schiffsbewegungen; es entstehen keine neuen Websocket-Kanäle oder Ereignistypen.
- [x] Das Kontrollpanel erhält einen Schalter für die Schiffsebene.
- [x] Die bestehende Route für geteilte Live-Positionen und ihre Tests bleiben unverändert grün.
- [x] Dienst-Verhaltenstests (eigene Schiffe, zerstört, ohne Position, andere Ebene, unbekannte Ebene) und Seitentests mit gemockter API (Marker, Bündelung, Auswahlpanel, Link, Schalter, Neuladen beim Ebenenwechsel) decken das Verhalten ab.

## Answer

- Service: `StarmapVisibilityService` (`apps/backend/src/modules/spacecraft/starmap-visibility.service.ts`), renamed from `LivePositionVisibilityService`. `listContacts(viewerId, layerId)` returns `StarmapContactsDto`; `listSharedLivePositions(viewerId)` keeps serving the old route. Reasons are assigned per owner in `contactReasonsByOwner` (OWN only for now); tickets 02/05 add ALLIANCE and SHARED_LIVE_POSITION there and the management block rule in `toContact`.
- Route: `GET /api/spacecraft/starmap-contacts?layerId=<id>` (JWT; unknown layer -> 404). `GET /api/spacecraft/shared-live-positions` is unchanged; its test assertions are untouched, only the service construction gained the two new collaborators.
- Capability: `AllianceInfrastructureCapabilityService` (alliance module, exported), env var `ALLIANCE_INFRASTRUCTURE_ENABLED` (only `"true"` enables; default off). Feeds `allianceContactsActive`.
- Shared DTOs (`packages/shared/src/lib/spacecraft`): `StarmapContactsDto`, `StarmapContactDto` (incl. `galaxyCell` = system cell for ships in a system), `StarmapContactReason`, `StarmapContactStance`, `StarmapContactAllianceDto`, `StarmapContactManagementDto`.
- Frontend: `StarmapShipOverlay` (DOM markers in world coordinates via the new `worldOverlay` slot of `StarmapCanvas`, bundled per galaxy cell), `StarmapContactPanel` (selection panel), `Schiffe` switch in `StarmapControlPanel`, reload on open, layer change, 30 s while visible and `SHIP_MOVED`/`SPACECRAFT_EVENT`. Tests in `apps/frontend/src/pages/starmap.spec.tsx`. Also fixed: the page stayed on "Lade Karte..." after a layer change.
