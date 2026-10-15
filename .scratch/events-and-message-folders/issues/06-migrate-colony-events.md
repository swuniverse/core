# 06: Kolonieereignisse idempotent in Kolonie-Nachrichten migrieren

**What to build:** Vorhandene Kolonieereignisse erscheinen genau einmal als Nachrichten im Ordner Kolonien. Sie bewahren Empfänger, Betreff, Inhalt, ursprünglichen Zeitstempel und Gelesen-Status und enthalten maschinenlesbare Herkunftsmetadaten für Kolonieereignis, Ereignistyp, Schweregrad, Kolonie und Ursprung.

**Blocked by:** 04: Nachrichtenordner als serverseitigen Vertrag einführen.

**Status:** resolved

- [ ] Die Datenmigration überträgt gelesene und ungelesene Kolonieereignisse in den Ordner Kolonien ohne Informationsverlust.
- [ ] Jede migrierte Nachricht trägt `COLONY_EVENT` und die vereinbarten strukturierten Herkunftsmetadaten.
- [ ] Ein eindeutiger Herkunfts- beziehungsweise Delivery-Key verhindert Dubletten auch bei wiederholter Ausführung.
- [ ] Ein migrationsnaher Datenbanktest prüft mehrere Nutzer, Zeitstempel, Gelesen-Status, Metadaten und idempotente Wiederholung.

## Comments

- Resolved on integration/events-and-message-folders.
