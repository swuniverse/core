# 04: Banner: Backend mit Asset-Schnittstelle

**What to build:** Präsident und Vize (neue Aktion `manageBanner`) können ein Banner hochladen, ersetzen und entfernen. Das PNG wird am tatsächlichen Inhalt geprüft (höchstens 200 KB, 600 × 150, keine Animation) und serverseitig neu kodiert. Die Ablage liegt hinter einer austauschbaren Asset-Schnittstelle (Dateisystem und In-Memory). Öffentlicher Lese-Endpunkt mit `image/png` und `nosniff`. Ratenbegrenzung, Chroniktypen „Banner gesetzt/ersetzt“ und „Banner entfernt“ (nur kleine Metadaten), additive Migration (nullable Bannerreferenz).

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Direkte Requests je Amt: Diplomat und Mitglied werden abgelehnt, manipulierte Allianz-IDs ebenso
- [ ] Getarnte Dateien (falsche Endung/Content-Type, Polyglotts), 200 KB ± 1 und 600 × 150 ± 1 werden korrekt entschieden, mit klaren Fehlermeldungen
- [ ] Bannerdaten und Fähigkeit erscheinen in den gemeinsamen DTOs
- [ ] Ersetzen speichert zuerst das neue Asset, dann Referenz und Chronik transaktional
- [ ] Ratenbegrenzung über die vorhandene dauerhafte Begrenzung
- [ ] Migrationstest nach vorhandenem Muster
