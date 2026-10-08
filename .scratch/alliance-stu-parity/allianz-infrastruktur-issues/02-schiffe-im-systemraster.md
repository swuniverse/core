# 02: Schiffe im geöffneten Systemraster

**What to build:** Schiffe innerhalb eines Sternsystems erscheinen zusätzlich zur Systemzelle auf der Galaxiekarte an ihrer Systemposition, sobald das Systemraster auf der Sternenkarte geöffnet ist.

**Blocked by:** 01: Eigene Schiffe auf der Sternenkarte (Tracer Bullet)

**Status:** resolved

**Triage label:** ready-for-agent
**Tracker:** local Markdown issue tracker (`.scratch/alliance-stu-parity/allianz-infrastruktur-issues/02-schiffe-im-systemraster.md`)
**Spec:** `.scratch/alliance-stu-parity/allianz-infrastruktur-spec.md`

- [x] Kontakte mit Systemposition werden im geöffneten Systemraster an ihren Systemkoordinaten angezeigt.
- [x] Auf der Galaxiekarte bleiben dieselben Kontakte an der Systemzelle gebündelt.
- [x] Kontakte derselben Systemzelle werden im Raster mit Anzahl gebündelt.
- [x] Auswahlpanel und Schalter verhalten sich im Systemraster wie auf der Galaxiekarte.
- [x] Der Server liefert für Systempositionen ausreichende Koordinaten im vorhandenen Positionsmodell; das Frontend berechnet keine Sichtbarkeit.
- [x] Seitentests mit gemockter API prüfen die Darstellung auf beiden Ebenen.

## Answer

- No backend change: `StarmapContactDto.location` already carries `scope: 'SYSTEM'`, `systemId` and system `x|y`; `galaxyCell` carries the system cell.
- `bundleStarmapContacts(contacts, openSystems)` (`apps/frontend/src/components/starmap/StarmapShipOverlay.tsx`) bundles SYSTEM contacts per system field at the position computed with `getInlineSystemPlacement` when their system is in `openSystems`; otherwise per galaxy cell. Bundles now expose `key`, `label` (`40|41` or `Kessel 12|13`), `left`/`top` in world pixels.
- The page passes only the opened systems with a loaded grid, and only while the zoom shows the inline grids: `StarmapCanvas` reports this via the new `onInlineSystemsVisibleChange` prop (threshold `INLINE_SYSTEM_SCALE`).
- Marker labels: `Schiff X bei Kessel 12|13` / `N Schiffe bei Kessel 12|13`; panel title `Schiffe auf Feld <label>`. Same panel and `Schiffe` switch on both levels.
- Tests: `apps/frontend/src/pages/starmap.spec.tsx`, `describe('in the opened system grid')` (the canvas mock exposes test buttons to toggle grid visibility).
