# 03: Allianzschiffe mit Basisdaten

**What to build:** Bei aktivierter Allianz-Infrastruktur-Fähigkeit sieht jedes Allianzmitglied auf der Sternenkarte alle Schiffe aller aktuellen Mitglieder seiner Allianz mit Basisdaten, unabhängig von der eigenen Sensorreichweite. Marker tragen die Allianzfarbe und zeigen die Haltung nicht nur farblich.

**Blocked by:** 01: Eigene Schiffe auf der Sternenkarte (Tracer Bullet)

**Status:** ready-for-agent

**Triage label:** ready-for-agent
**Tracker:** local Markdown issue tracker (`.scratch/alliance-stu-parity/allianz-infrastruktur-issues/03-allianzschiffe-mit-basisdaten.md`)
**Spec:** `.scratch/alliance-stu-parity/allianz-infrastruktur-spec.md`

- [ ] Die zentrale Beziehungsauflösung erhält eine Fähigkeit für die Allianz-Kartensicht, die ausschließlich für aktuelle Mitglieder derselben Allianz erteilt wird, analog zu `mayShareHistoricalScans`. Der Sichtbarkeitsdienst prüft die Mitgliedschaft nicht selbst.
- [ ] Die Haltung aller Besitzer wird pro Anfrage gebündelt über die zentrale Auflösung ermittelt, nicht je Schiff und nicht lokal rekonstruiert.
- [ ] Allianzkontakte tragen Grund `ALLIANCE`, Haltung, Allianzreferenz mit ID, Name und Farbe sowie nur Basisdaten (Schiff, Klasse, Besitzer, Position).
- [ ] Eigene Schiffe behalten Grund `OWN`; kein Schiff erscheint doppelt.
- [ ] Bei deaktivierter Fähigkeit liefert die Route nur eigene Schiffe; aktiviert meldet das Flag aktiv.
- [ ] Beitritt, Austritt, Rauswurf und Auflösung wirken mit der nächsten Anfrage ohne Bereinigungsschritt; es werden keine Sichtbarkeitsrechte persistiert.
- [ ] Ein Resolverfehler oder fehlende Parteien liefern nur eigene Schiffe.
- [ ] Spieler der anderen Fraktion und allianzlose Spieler erscheinen nie als Allianzkontakt.
- [ ] Allianzmarker verwenden die Allianzfarbe oder, ohne gesetzte Farbe, eine einheitliche Standardfarbe; die Haltung ist zusätzlich per Symbol oder Beschriftung erkennbar.
- [ ] Das Kontrollpanel zeigt einen Schalter für Allianzschiffe nur, wenn der Server Allianz- und Partnerkontakte als aktiv meldet.
- [ ] Fremde Kontakte bieten im Auswahlpanel keine Steuerungs-, Scan- oder Kampfaktionen.
- [ ] Resolver- und Dienst-Verhaltenstests sowie Seitentests decken Mitglied, allianzlosen Spieler, Mitgliedswechsel, Auflösung, Fraktionsgrenze, Fehlerfall, Farbe, Standardfarbe, Haltungskennzeichnung und Schalter ab.
