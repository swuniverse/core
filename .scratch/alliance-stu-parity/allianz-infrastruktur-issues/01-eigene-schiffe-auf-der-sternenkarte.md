# 01: Eigene Schiffe auf der Sternenkarte (Tracer Bullet)

**What to build:** Ein Spieler sieht auf der Sternenkarte seine eigenen Schiffe der angezeigten Kartenebene. Der Sternenkarten-Sichtbarkeitsdienst entsteht als Erweiterung der vorhandenen Live-Positions-Sichtbarkeit und ist die einzige Stelle, die Kartenkontakte bestimmt. Die neue Allianz-Infrastruktur-Fähigkeit existiert, ist aber deaktiviert; in diesem Ticket liefert der Dienst ausschließlich eigene Schiffe.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

**Triage label:** ready-for-agent
**Tracker:** local Markdown issue tracker (`.scratch/alliance-stu-parity/allianz-infrastruktur-issues/01-eigene-schiffe-auf-der-sternenkarte.md`)
**Spec:** `.scratch/alliance-stu-parity/allianz-infrastruktur-spec.md`

- [ ] Die Kartenkontakt-DTOs, Sichtbarkeitsgründe (`OWN`, `ALLIANCE`, `SHARED_LIVE_POSITION`), Haltungen und der optionale Verwaltungsdetailblock liegen in `packages/shared`.
- [ ] Eine authentifizierte Route im Spacecraft-Modul liefert die Kartenkontakte des Betrachters für eine Pflicht-Kartenebene; eine unbekannte Ebene ergibt Not Found. Die Antwort enthält ein Flag, ob Allianz- und Partnerkontakte aktiv sind.
- [ ] Eine ausdrückliche Allianz-Infrastruktur-Fähigkeit ist standardmäßig deaktiviert, analog zur Fähigkeit des Diplomatie-Kerns; deaktiviert meldet das Flag inaktiv.
- [ ] Eigene Schiffe erscheinen mit Grund `OWN`, ohne Haltung und mit Verwaltungsdetails (Status, Alarmstufe, Hülle/max., Crew/max.).
- [ ] Zerstörte Schiffe, Schiffe ohne auflösbare Position und Schiffe anderer Kartenebenen fehlen.
- [ ] Die Sternenkarten-Seite rendert Schiffsmarker als testbares DOM-/SVG-Overlay über dem Kartencanvas, nach dem Muster des Hyperraumrouten-Overlays; Kontakte derselben Galaxiezelle werden zu einem Marker mit Anzahl gebündelt. Schiffe in einem System erscheinen an der Systemzelle.
- [ ] Ein Auswahlpanel zeigt die gelieferten Daten des gewählten Markers beziehungsweise Bündels; eigene Schiffe verlinken auf die Schiffsansicht.
- [ ] Die Seite lädt die Kontakte beim Öffnen, beim Ebenenwechsel, alle 30 Sekunden bei sichtbarer Seite und bei den vorhandenen Socket-Ereignissen für eigene Schiffsbewegungen; es entstehen keine neuen Websocket-Kanäle oder Ereignistypen.
- [ ] Das Kontrollpanel erhält einen Schalter für die Schiffsebene.
- [ ] Die bestehende Route für geteilte Live-Positionen und ihre Tests bleiben unverändert grün.
- [ ] Dienst-Verhaltenstests (eigene Schiffe, zerstört, ohne Position, andere Ebene, unbekannte Ebene) und Seitentests mit gemockter API (Marker, Bündelung, Auswahlpanel, Link, Schalter, Neuladen beim Ebenenwechsel) decken das Verhalten ab.
