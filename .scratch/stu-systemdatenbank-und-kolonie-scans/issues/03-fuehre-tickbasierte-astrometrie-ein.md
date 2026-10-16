# 03: Führe tickbasierte Astrometrie ein

**What to build:** Ein Spieler kann mit einem eigenen einsatzbereiten Schiff im aktuellen Sternensystem einen sichtbaren Astrometrieauftrag starten. Der Auftrag bindet das Schiff bis zum vorgesehenen Haupttick, entdeckt bei Erfolg ausschließlich dieses System für den Spieler und endet bei Verlust seiner Voraussetzungen ohne Rückerstattung.

**Blocked by:** 02: Entkopple Systembetreten von Datenbankentdeckung.

**Status:** ready-for-agent

- [ ] Ein persistenter Auftrag erlaubt höchstens eine aktive Astrometrie pro Schiff und hält Besitzer, gebundenes System, Status, Start-/Abschlusszeit oder Ziel-Tick sowie Abbruchgrund nachvollziehbar fest.
- [ ] Der Start prüft Besitz, aktuelle Systemposition, Schiffszustand, ausreichend Crew und Energie sowie aktive, intakte Langstreckensensoren; bei Verstoß erhält der Spieler eine fachliche Fehlermeldung.
- [ ] Bereits entdeckte Systeme und Schiffe mit laufendem Auftrag können keine weitere Astrometrie starten; konfliktierende Aktionen bleiben während des Auftrags gesperrt oder werden fachlich abgelehnt.
- [ ] Der Auftrag wird im bestehenden Haupttick nach Bewegungs- und Ressourcenverarbeitung abgeschlossen und entdeckt bei weiterhin gültigen Voraussetzungen genau das zu Beginn gebundene System für den Besitzer.
- [ ] Zerstörung, Bereitschaft, Abflug, Positionsverlust oder Verlust betriebsbereiter Voraussetzungen brechen den Auftrag ohne Entdeckung und ohne Erstattung ab; wiederholte Tickverarbeitung bleibt idempotent.
- [ ] Die Schiffsoberfläche zeigt Startmöglichkeit, laufenden Status, Abschlusszeit beziehungsweise verbleibende Dauer sowie Erfolg oder fachlichen Fehler.
- [ ] Migrations-, Service-, Tick- und Frontendtests prüfen die beobachtbaren Start-, Erfolgs-, Konflikt- und Abbruchpfade.
