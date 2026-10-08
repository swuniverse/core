# 02: Krieg erklären

**What to build:** Präsidenten und Diplomaten können einer anderen Allianz derselben Fraktion sofort den Krieg erklären. Der neue Kriegszustand ist öffentlich sichtbar, ersetzt jeden vorherigen diplomatischen Zustand des Paars atomar und informiert die Zielallianz erst nach erfolgreichem Commit.

**Blocked by:** 01 (Beziehungen öffentlich anzeigen)

**Status:** ready-for-agent

- [ ] Präsident und Diplomat dürfen Krieg erklären; Vize, Mitglied ohne Amt, Außenstehende und allianzlose Spieler werden serverseitig abgewiesen.
- [ ] Der Server bietet nur andere Allianzen derselben Fraktion als gültige Ziele an und lehnt eigene sowie fraktionsfremde Allianzen ohne neue Beziehungsdaten ab.
- [ ] Krieg wird ohne Zustimmung als einzige aktive Beziehung des kanonischen Allianzenpaars angelegt und besitzt weder Vertragswerk noch Beziehungsfreigaben.
- [ ] Eine Kriegserklärung entfernt in derselben Transaktion jede vorherige aktive Beziehung, jeden Beziehungsvorschlag und jede ausstehende Änderung dieses Paars.
- [ ] Aktiver Krieg kann nicht durch die allgemeine Aktion zum Beenden einer Beziehung beendet werden.
- [ ] Die Zielallianz erhält nach dem Commit eine allianceweite Systemnachricht mit Akteur und erklärender Allianz; ein Rollback versendet nichts.
- [ ] Die öffentliche Allianzseite zeigt den Krieg bei beiden beteiligten Allianzen mit der jeweiligen Gegenpartei.
- [ ] Die Oberfläche zeigt die Kriegserklärung nur bei einer vom Server gelieferten Fähigkeit und lädt danach den autoritativen Zustand neu; direkte unberechtigte Requests bleiben verboten.
- [ ] Wiederholte oder konkurrierende Kriegserklärungen enden in genau einem gültigen Kriegszustand und geben fachliche statt rohe Datenbankfehler zurück.
- [ ] Service-, PostgreSQL- und Frontendtests decken Ämterrechte, Fraktionsregeln, atomare Ersetzung, Post-Commit-Nachricht und Konkurrenz ab.

## Answer

Bereits implementiert in 2e0a3b1 feat(alliance): allow declaring war.
