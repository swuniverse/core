# 04: Nachrichtenordner als serverseitigen Vertrag einführen

**What to build:** Spielende erhalten einen serverseitig gefilterten Nachrichtenvertrag für die immer sichtbaren Ordner Persönlich, Schiffe, Kolonien, Handel, Systemmeldungen, Postausgang und Stationen. Jeder Ordner liefert ungelesene und gesamte Nachrichtenzahl; leere Ordner liefern `0/0`.

**Blocked by:** None (can start immediately).

**Status:** resolved

- [ ] Die Ordner sind zentral definiert und für jede spielende Person vollständig in der Ordnerzusammenfassung enthalten.
- [ ] Persönliche Nachrichten, bestehende Systemnachrichten und der berechnete Postausgang sind korrekt zugeordnet.
- [ ] Das Öffnen eines Ordners filtert serverseitig, unterstützt Pagination und liefert die korrekte Gesamtzahl.
- [ ] Ordnerzähler und Nachrichten sind gegen den Zugriff anderer Spielender geschützt.
- [ ] Vertragstests decken alle Ordner, leere Ordner, Zähler, Pagination, Gelesen-Status und Eigentumsgrenzen ab.

## Comments

- Resolved on integration/events-and-message-folders.
