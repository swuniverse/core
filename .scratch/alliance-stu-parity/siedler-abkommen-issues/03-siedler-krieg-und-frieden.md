# 03: Siedler erklären Krieg und schließen Frieden (Siedler↔Siedler)

**What to build:** Ein allianzloser Spieler öffnet den Siedler-Diplomatiebereich, sucht andere Siedler seiner Fraktion, erklärt Krieg und handelt Frieden aus (Vorschlag, Annahme, Ablehnung, Rückzug). Krieg macht beide über die zentrale Auflösung zu Feinden. Erster vorführbarer Schnitt durch alle Schichten.

**Blocked by:** 01, 02

**Status:** ready-for-agent

- [ ] Vertretende Partei wird serverseitig aus dem Anfragenden abgeleitet, nie vom Client gewählt; Allianzmitglieder, Spieler der Gegenfraktion und fremde IDs werden abgewiesen
- [ ] Paginierte, begrenzte Gegenparteisuche liefert nur Kennung und Anzeigename allianzloser Spieler der eigenen Fraktion, ohne die eigene Person
- [ ] Krieg ersetzt sofort alles des Paars; Frieden nur aus Krieg; Krieg endet nur durch angenommenen Frieden
- [ ] Diplomatie-Chronik-Einträge mit Spielernamen zum Ereigniszeitpunkt; Nachrichten nach Commit, wiederholbar; Ratenbegrenzung
- [ ] Frontend: Siedler-Bereich nur für Allianzlose mit servergelieferten Aktionen, Spielersuche, Deaktivierung während Requests, Reload
- [ ] Service-Tests (In-Memory), Autorisierungstests, Frontendtests
