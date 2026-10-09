# 06: Bannerdatei im Nachlauf löschen

**What to build:** Die physische Löschung des Bannerassets wird als Nachlaufaufgabe persistiert (Asset-Schlüssel, Versuche, nächster Versuch) und nach Auflösung, Ersetzen und Entfernen idempotent wiederholt. Ein fehlendes Asset gilt als erfolgreich.

**Blocked by:** 01, 04

**Status:** resolved

- [x] Ein fehlerhafter Adapter rollt keine abgeschlossene Auflösung, Ersetzung oder Entfernung zurück
- [x] Nach Wiederholung ist die Datei gelöscht; erneute Wiederholung ist wirkungslos
- [x] Aufgabe wird in derselben Transaktion wie die Auflösung persistiert, auch bei Absturz vor dem Commit-Nachlauf
- [x] Migration rückwärtskompatibel mit Migrationstest
