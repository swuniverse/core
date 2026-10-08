# 02: Schiffe im geöffneten Systemraster

**What to build:** Schiffe innerhalb eines Sternsystems erscheinen zusätzlich zur Systemzelle auf der Galaxiekarte an ihrer Systemposition, sobald das Systemraster auf der Sternenkarte geöffnet ist.

**Blocked by:** 01: Eigene Schiffe auf der Sternenkarte (Tracer Bullet)

**Status:** ready-for-agent

**Triage label:** ready-for-agent
**Tracker:** local Markdown issue tracker (`.scratch/alliance-stu-parity/allianz-infrastruktur-issues/02-schiffe-im-systemraster.md`)
**Spec:** `.scratch/alliance-stu-parity/allianz-infrastruktur-spec.md`

- [ ] Kontakte mit Systemposition werden im geöffneten Systemraster an ihren Systemkoordinaten angezeigt.
- [ ] Auf der Galaxiekarte bleiben dieselben Kontakte an der Systemzelle gebündelt.
- [ ] Kontakte derselben Systemzelle werden im Raster mit Anzahl gebündelt.
- [ ] Auswahlpanel und Schalter verhalten sich im Systemraster wie auf der Galaxiekarte.
- [ ] Der Server liefert für Systempositionen ausreichende Koordinaten im vorhandenen Positionsmodell; das Frontend berechnet keine Sichtbarkeit.
- [ ] Seitentests mit gemockter API prüfen die Darstellung auf beiden Ebenen.
