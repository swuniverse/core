# 02: Auflösung für Spielerparteien

**What to build:** Die zentrale Freund-/Feind-Auflösung behandelt einen allianzlosen Spieler als eigene Partei und wertet Beziehungen jeder Parteikombination aus (Siedler↔Siedler, Siedler↔Allianz, Allianz↔Siedler). Ohne UI über den Resolver verifizierbar.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Aktiver Krieg → Feind; „Als Freund behandeln“ → Freund; sonst Neutral, gemäß unveränderter Prioritätsreihenfolge (Fraktion, gleiche Allianz, Krieg, Freigabe, Kontakt-No-Op)
- [ ] Mitgliedschaftswechsel werden bei jeder Anfrage neu berücksichtigt; Fehler fallen geschlossen auf Neutral
- [ ] „Live-Kartenpositionen teilen“ wirkt nur im aktiven Bündnis; Kandidatenpfad der Sternenkarte liefert Siedlerpartner und Mitglieder von Allianzpartnern
- [ ] Historische Koloniescans bleiben an die aktuelle Allianz gebunden
- [ ] Resolver-Tests mit direkt geseedeten Beziehungen decken alle Kombinationen ab
