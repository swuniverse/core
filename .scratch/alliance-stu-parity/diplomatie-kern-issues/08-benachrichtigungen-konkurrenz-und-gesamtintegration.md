# 08: Benachrichtigungen, Konkurrenz und Gesamtintegration härten

**What to build:** Der vollständige Diplomatie-Kern liefert Systemnachrichten nachweisbar zuverlässig nach dem Commit, bleibt unter allen spezifizierten Konkurrenzfällen konsistent und ist als geschlossene Etappe aktivierbar, ohne die noch nicht implementierten Beziehungswirkungen vorzutäuschen.

**Blocked by:** 06 (Diplomatieverwaltung), 07 (Diplomatie-Chronik und Beziehungsplatzhalter)

**Status:** resolved

- [ ] Jeder erfolgreiche diplomatische Übergang erzeugt genau die vorgesehenen allianceweiten Benachrichtigungsaufträge für die Gegenpartei; ein Transaktionsrollback erzeugt keinen zustellbaren Auftrag.
- [ ] Die Zustellung erfolgt erst nach Commit über einen zuverlässig wiederholbaren Mechanismus; ein Messaging-Fehler lässt den diplomatischen Zustand bestehen und kann ohne erneute Mutation nachgeholt werden.
- [ ] Wiederholte Zustellversuche duplizieren weder den diplomatischen Übergang noch bereits erfolgreich zugestellte Systemnachrichten.
- [ ] Nachrichtentexte benennen Akteur, handelnde Allianz, Gegenpartei und Ausgang, veröffentlichen aber niemals einen vertraulichen Vertragsentwurf.
- [ ] Serverseitige Ratenbegrenzung schützt insbesondere Kriegserklärung und Vorschlagserstellung, ohne Cooldowns, Ablaufzeiten oder Mindestlaufzeiten einzuführen.
- [ ] Echte PostgreSQL-Rennen prüfen gleichzeitig angelegte Vorschläge, zwei Antworten auf denselben Vorschlag, Krieg gegen Annahme sowie zwei Änderungen derselben Beziehung; jeder Lauf endet in genau einem zulässigen Zustand.
- [ ] Constraint-Verletzungen und veraltete Aktionen werden in stabile fachliche Fehler übersetzt und geben keine rohen Datenbankdetails aus.
- [ ] Öffentliche Allianzseite, Diplomatieverwaltung, Diplomatie-Chronik und Beschreibungsplatzhalter zeigen nach jeder Aktion denselben autoritativen Zustand und verlieren keine Vertraulichkeitsgrenze.
- [ ] Die Etappe kann durch eine ausdrückliche Fähigkeit aktiviert werden, nachdem ihre rückwärtskompatiblen Migrationen ausgerollt wurden.
- [ ] Die aktivierte Etappe macht kenntlich, dass Beziehungsfreigaben gespeichert, aber noch nicht auf Kampf, Karte, Scan, Transfer oder Zugang angewandt werden; kein solcher Pfad wird teilweise umgestellt.
- [ ] Build, Lint, normale Backend- und Frontendtests sowie die PostgreSQL-Integrationssuite bestehen gemeinsam.
- [ ] Eine abschließende Anforderungsmatrix ordnet alle 88 User Stories der Spezifikation mindestens einem automatisierten Test oder einer nachweisbaren Akzeptanzprüfung zu.

## Answer

Implementiert in 9f27e0ae65e1d7ccba53cc0715cc21f5a70ea349; integriert als 01d25a1.
