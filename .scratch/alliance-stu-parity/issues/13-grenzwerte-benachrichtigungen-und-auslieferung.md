# Grenzwerte, Benachrichtigungen und Auslieferung

Type: grilling
Status: resolved
Blocked by: 01, 02, 08, 09, 10, 11, 12

## Question

Welche übergreifenden Sicherheits-, Benachrichtigungs-, Test- und Auslieferungsregeln müssen alle sechs Etappen-Spezifikationen teilen?

## Answer

Alle fachlichen Mutationen validieren Unicode-Längen nach Trim, autorisieren serverseitig und sind bei mehreren zusammengehörigen Änderungen atomar. Für Foruminhalte und Vertragswerke gelten die in den jeweiligen Entscheidungen festgelegten Grenzen; Banner werden anhand ihres tatsächlichen Inhalts geprüft. Listen und Chroniken sind paginiert. Unbegrenzte Schreibpfade erhalten eine serverseitige Ratenbegrenzung.

Fachliche Systemnachrichten werden erst nach erfolgreichem Commit verschickt. Scheitert eine Nachricht, darf sie den bereits persistierten Zustand nicht zurückrollen; die Implementierung braucht einen zuverlässig wiederholbaren Zustellpfad. Adressaten folgen dem Ereignis: beteiligte Parteien erhalten Diplomatieereignisse, verbleibende Mitglieder interne Lebenszyklusereignisse. Nachrichtentexte geben Akteur, Gegenpartei und fachlichen Ausgang eindeutig wieder, ohne vertrauliche Entwürfe öffentlich zu machen.

Jede Etappe spezifiziert beobachtbare Service- und Autorisierungsfälle, echte Postgres-Tests für Constraints, Transaktionen und Konkurrenzfälle sowie Frontendtests für servergelieferte Fähigkeiten. Quellcodeinterne Aufrufreihenfolgen sind kein Testziel.

Fähigkeiten werden explizit aktiviert. Kein Frontend darf eine Freigabe anbieten, deren Serverwirkung noch fehlt. Die zentrale Beziehungsauflösung muss vor Aktivierung aller Freund-, Feind-, Karten-, Transfer- und Zugangswirkungen von jedem vorhandenen relevanten Serverpfad verwendet werden. Rückwärtskompatible Migrationen werden vor der Aktivierung ausgerollt; jede Etappe kann anschließend separat ausgeliefert werden.
