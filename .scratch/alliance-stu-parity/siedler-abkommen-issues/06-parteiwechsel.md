# 06: Parteiwechsel bei Gründung und Aufnahme

**What to build:** Gründet ein Siedler eine Allianz oder wird er aufgenommen, enden in derselben Transaktion alle seine persönlichen Beziehungen (auch Krieg), Vorschläge und ausstehenden Änderungen.

**Blocked by:** 05

**Status:** ready-for-agent

- [ ] Beziehungen, Vorschläge in beiden Richtungen und Änderungen der Spielerpartei enden atomar mit Gründung bzw. Annahme einer Bewerbung; Fehler brechen den Beitritt ab
- [ ] Gegenparteien erhalten nach Commit eine Nachricht mit Grund; Chronik bewahrt Typ, Namen, Zeitpunkt, Endgrund, nicht das Vertragswerk; entfallene Vorschläge erscheinen nicht
- [ ] Austritt und Auflösung stellen nichts wieder her; Mitglieder haben keine persönliche Diplomatie, Server weist direkte Requests ab
- [ ] Nach dem Wechsel verschwinden die Wirkungen in der zentralen Auflösung
- [ ] Service-Tests inkl. Rollback
