Status: ready-for-agent

# Grafischer Systemeintrag nach Astrometrie

## Problem Statement

Als Spieler kann ich einen geschützten **Systemeintrag** für eine persönliche **Systementdeckung** bereits in der Datenbank öffnen, aber ich kann die Struktur des kartographierten Sternensystems nicht als vollständige räumliche Karte erfassen. Die heutige Feldliste vermittelt weder die Lage von Sternen, Planeten und Asteroidenfeldern noch die Größe und Verteilung eines Systems in der für einen abgeschlossenen Astrometrie-Vorgang angemessenen Form.

Ich möchte den Datenbankeintrag eines vollständig kartographierten Sternensystems ähnlich der sTU-Vorlage als grafische Rasterkarte lesen können, ohne dabei taktische Informationen oder Fernaktionen zu erhalten.

## Solution

Der bestehende geschützte **Systemeintrag** wird für eine erfolgreiche **Astrometrie** zu einer vollständigen, nicht-taktischen Systemkarte ausgebaut. Der Eintrag zeigt das gesamte reale Koordinatenraster eines Sternensystems mit statischen kartographischen Informationen: Weltraum- und Feldtypen, Sterne, Planeten sowie Asteroidenfelder. Er verwendet die bereits vorhandenen Spielassets und bleibt auf kleineren Bildschirmen scrollbar.

Ein Auswahl- und Detailbereich ergänzt die Rasterkarte. Ohne Auswahl beschreibt er das Sternensystem; nach Auswahl eines Felds oder Himmelskörpers beschreibt er dessen bekannte statische Eigenschaften. Weder die Karte noch der Detailbereich geben dynamische Informationen preis oder erlauben Fernaktionen.

Die vollständige grafische Darstellung ist nur für den Spieler verfügbar, dessen Kartographieplan `DONE` mit erfolgreicher Finalisierung erreicht hat. Eine bloße **Systementdeckung**, ein vermessener Plan oder ein ungültig gewordener Abschluss genügt nicht. Direkte Zugriffe auf einen noch nicht vollständig kartographierten Systemeintrag führen zu einem verständlichen Hinweis ohne Offenlegung der Systemstruktur.

## User Stories

1. As a Spieler, I want to open a completed Astrometrie result from the Sternensysteme database list, so that I can inspect the entire Sternensystem I personally kartographiert habe.
2. As a Spieler, I want the Systemeintrag to render every coordinate of the system's real raster dimensions, so that I can understand the spatial arrangement of its contents.
3. As a Spieler, I want coordinate headers on both axes, so that I can identify the exact position of every displayed field.
4. As a Spieler, I want stars to be visibly distinct in the raster, so that I can recognize the central and secondary stellar structure at a glance.
5. As a Spieler, I want planets to use the game's existing planetary visuals, so that the database view matches the visual language of other map views.
6. As a Spieler, I want asteroid fields to appear as asteroid groups in their raster field, so that dense system structure remains readable without cluttering the map with counters.
7. As a Spieler, I want static field and space visuals to use the existing game assets, so that the Systemeintrag is visually consistent and does not require a separate asset catalogue.
8. As a Spieler, I want to select a field in the map, so that I can read its known static details without leaving the Systemeintrag.
9. As a Spieler, I want to select a celestial object in the map, so that I can see its name, type, and coordinates.
10. As a Spieler, I want the unselected detail area to summarize the Sternensystem's name, type, outer coordinates, and raster size, so that I retain context while inspecting the map.
11. As a Spieler, I want the detail area beside the map on wide screens and below it on narrow screens, so that the view remains usable on desktop and mobile devices.
12. As a Spieler on a small screen, I want the full-size raster to scroll in both directions instead of shrinking its cells, so that symbols and coordinate labels stay legible.
13. As a Spieler, I want the graphical Systemeintrag to be read-only, so that reviewing cartographic knowledge cannot accidentally trigger navigation or other game actions.
14. As a Spieler, I want no foreign ships, ownership, present colony state, or other changing tactical data on the map, so that the entry remains a cartographic knowledge view rather than intelligence or a remote-control surface.
15. As a Spieler, I want the map to show the persistent known structure even when I am not currently located in that Sternensystem, so that my successfully completed Astrometrie remains useful as a permanent personal record.
16. As a Spieler with only a Systementdeckung but no successful finalisierte Astrometrie, I want a clear explanation that the system has not yet been fully kartographiert, so that I understand why its map is unavailable.
17. As a Spieler who opens such a protected detail URL directly, I want no system fields, objects, or other structural data to be exposed, so that the cartographic unlock cannot be bypassed through the URL.
18. As a Spieler whose Kartographieplan was invalidated, I want the graphical map to remain unavailable, so that only a successful Finalisierung grants its permanent reward.
19. As a Spieler, I want a route back to the Sternensysteme overview from the unavailable-map notice, so that I can continue browsing my database knowledge.
20. As a Spieler, I want the existing Systemeintrag's non-tactical purpose preserved, so that cartographic review does not change existing gameplay permissions.

## Implementation Decisions

- The feature extends the existing database **Systemeintrag** and its protected system-detail contract rather than creating a second catalogue or a parallel map endpoint.
- Server-side authorization distinguishes two separate knowledge levels:
  - A personal **Systementdeckung** continues to control whether a system entry can be opened at all, as established by ADR-0002.
  - A graphical full-system map requires a Kartographieplan in `DONE` state with `SUCCESS` completion outcome for the current player. `PLANNED`, `MEASURED`, `FINISHING`, `DONE` with `INVALIDATED`, and missing plans do not qualify.
- For a discovered but not successfully kartographiert system, the system-detail response must be deliberately non-revealing and identify the map as unavailable. It must not include fields, celestial objects, colony information, scans, ownership, or structural metadata beyond what is needed to present the unavailable-state message and return navigation.
- The system-detail contract provides the complete static system layout needed for rendering: system identity and type, outer coordinates, raster bounds, system fields, and static celestial-object data. It excludes current ship positions, ownership, live colony state, alliance-sensitive scan knowledge, and other dynamic game state from the map-specific payload.
- The frontend replaces the current list/grid-like field presentation of a successfully cartographiert Systemeintrag with a reusable, read-only coordinate-raster renderer. It shows all coordinates from the system bounds, retains legible fixed-size cells, and puts the raster inside a two-axis scroll container.
- The renderer reuses the existing space, star, system-type, and planet assets and existing presentation rules wherever they describe a field or celestial object. It does not introduce new visual assets for this feature.
- Celestial objects and field terrain are rendered as map symbols rather than as textual rows. Asteroid fields use an asteroid-group symbol on their field; no quantity badge is shown on the map.
- Selecting a field is local client-side presentation state. The selected detail panel shows stable facts such as coordinate, field type, object identity/type, and other non-dynamic static attributes available from the allowed payload. It has no action controls.
- Before a field is selected, the detail panel shows the system summary: system name, system type, outer coordinates, and dimensions.
- The page uses a responsive layout: map and detail panel are adjacent when space permits and stacked on small screens.
- The existing link from the Sternensysteme catalogue continues to be the way to open a Systemeintrag. The visual map is not made available as an action from the spacecraft navigation UI.
- The feature follows ADR-0003's definition of a completed Astrometrie: only its successful Finalisierung creates the durable personal result. It also preserves ADR-0002's decision that Systementdeckung is personal and the Systemeintrag has no tactical actions.
- No schema migration is expected: the required Kartographieplan status and completion outcome already persist the unlock state.

## Testing Decisions

- Tests validate externally visible authorization and presentation behavior, not private helper calls, component internals, or asset-selection implementation details.
- The highest existing seam is the protected database Systemeintrag contract. Backend service tests cover the visible response for: a successful completed Astrometrie; a merely discovered system; each non-successful or unfinished Kartographieplan state; and the absence of static or dynamic system data in the unavailable response.
- Controller-level coverage preserves authenticated access and verifies that the existing database detail endpoint exposes the service result rather than introducing an unprotected path.
- Frontend page tests, following the existing database page tests, exercise rendered behavior from realistic detail responses: complete coordinate headers and static map symbols, the initial system summary, detail updates after selecting fields/objects, readable unavailable notice with return link, and no tactical controls.
- Responsive structure is tested through semantic layout and scroll-container behavior where feasible; pixel-perfect rendering, image pixels, and browser-specific scrolling physics are not unit-test targets.
- Existing system-detail service tests and database page tests are prior art and should be extended rather than duplicated under a new testing architecture.

## Out of Scope

- Zooming, panning gestures, minimaps, or other map-navigation controls beyond native two-axis scrolling.
- Navigation, flight planning, targeting, colonization, scanning, messaging, repairs, or any other remote action from the Systemeintrag.
- Live display of ships, colonies, colony ownership, alliance membership, current resources, live scans, or tactical sensor information.
- Sharing the graphical map through an Allianz or making another player's completed Astrometrie visible.
- New image production or a separate system-map asset pipeline.
- Changing the Astrometrie state machine, its Messpunkte, its rewards, or the underlying Systementdeckung rules.
- Altering the global scan archive or the existing Kolonie-Scan access model.

## Further Notes

- The canonical term is **Astrometrie** for the personal system-bound cartography process, **Finalisierung** for its final three-tick completion, **Systementdeckung** for the durable personal knowledge produced by a successful finalization, and **Systemeintrag** for the non-tactical protected database view.
- The requested visual reference is the sTU-style full coordinate raster. It guides density, reading direction, and the split between map and context panel, not a requirement to reproduce sTU assets or every sTU interaction.
- The feature deliberately adds a stricter display unlock than the existing Systemeintrag access rule: a player may retain a personally discovered entry while its complete graphical cartography remains locked until the successful Astrometrie outcome exists.
