# 05: Baue den nicht-taktischen Datenbank-Systemeintrag

**What to build:** Ein Spieler kann einen persönlich entdeckten Systemeintrag in der Datenbank öffnen und dort die aktuelle Struktur des Sternensystems untersuchen. Die Ansicht ist reine Information, bietet einen Sprung zur Sternenkarte und erlaubt unter der STU-artigen Besitzbedingung eine vorbefüllte Schnellnachricht an aktuelle fremde Koloniebesitzer.

**Blocked by:** 03: Führe tickbasierte Astrometrie ein; 04: Stelle einen geschützten Systemkatalog bereit.

**Status:** ready-for-agent

- [ ] Ein entdeckter Systemeintrag zeigt aktuelle Systemmetadaten, Himmelskörper, Felder und Koloniebelegung aus einem serverseitig berechtigten Detailvertrag.
- [ ] Ein zugänglicher Raster-Inspektor erlaubt ausschließlich Auswahl und Untersuchung von Feldern oder Objekten; Bewegungs-, Kampf-, Navigations- und Scanaktionen sind nicht verfügbar.
- [ ] Der Systemeintrag verlinkt mit den passenden Außenkoordinaten zur bestehenden Sternenkarte.
- [ ] Besitzt der Betrachter mindestens eine aktuelle Kolonie im dargestellten System, sieht er an aktuell fremden Kolonien eine Schnellnachricht zum aktuellen Besitzer.
- [ ] Ohne eigene Kolonie im System erscheint keine Schnellnachricht; historische Scanbesitzer werden niemals als Empfänger verwendet.
- [ ] Die Nachrichtenkomposition übernimmt die vorbefüllte aktuelle Empfänger-ID und den Namen, ohne das bestehende Senden von Nachrichten zu verändern.
- [ ] Integration- und Komponententests prüfen Detailberechtigung, aktuelle Darstellung, inspect-only Interaktion, Kartenlink und die Schnellnachrichtenbedingung.
