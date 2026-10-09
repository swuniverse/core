# 01: Gemeinsamer Auflösungsablauf mit wiederholbarem Nachlauf

**What to build:** Präsident löst auf und der Austritt des letzten Mitglieds nutzen einen einzigen Auflösungsablauf. Die relationale Auflösung ist eine Transaktion. Systemnachrichten an die verbleibenden Mitglieder (ohne den Auslöser) werden in derselben Transaktion als Absicht gespeichert, erst nach dem Commit mit Lieferschlüssel zugestellt und von einem periodischen Nachlauf (Muster: Diplomatie-Benachrichtigungsdispatcher, mit Sperre gegen Überlappung) idempotent wiederholt.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Beide Auflösungswege verwenden denselben Ablauf und dieselbe Bereinigung (Spec: Auflösung und Reset)
- [ ] Nachrichtenabsichten werden transaktional persistiert, ohne Fremdschlüssel auf die aufgelöste Allianz; Migration rückwärtskompatibel mit Migrationstest
- [ ] Ein fehlgeschlagener Versand lässt die Auflösung bestehen und wird später nachgeholt; doppelte Wiederholung stellt nichts doppelt zu
- [ ] Postgres-Test: Kaskaden entfernen Allianz, Mitgliedschaften, Bewerbungen, Beziehungen/Vorschläge, Freigaben samt Änderungen, Forum, interne Chronik; öffentliche Diplomatie-Chronik bleibt
- [ ] Service-Tests mit In-Memory-Store für Adressaten und Nachrichtentexte
