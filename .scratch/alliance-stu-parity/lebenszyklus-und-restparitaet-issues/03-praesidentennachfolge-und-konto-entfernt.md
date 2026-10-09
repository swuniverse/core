# 03: Automatische Präsidentennachfolge und Konto-entfernt-Operation

**What to build:** Eine reine Nachfolgefunktion (zuletzt aktiver Vize, Diplomat, übriges Mitglied; Gleichstand: längste Mitgliedschaft, dann niedrigste User-ID; leere letzte Aktivität gilt als älteste). Eine idempotente Operation „Konto entfernt“ beendet die Mitgliedschaft und Bewerbungen und löst bei einem Präsidenten die Nachfolge oder, ohne Kandidaten, die Auflösung aus. Chronik und Systemnachricht an alle verbleibenden Mitglieder (alter und neuer Präsident); die Chronikansicht zeigt den Typ lesbar.

**Blocked by:** 01

**Status:** resolved

- [x] Alle Prioritätsstufen, Gleichstand, ausschließlich leere Aktivität, gemischt leere Aktivität und kein Kandidat sind getestet
- [x] Neuer Präsident hat nur das Präsidentenamt; genau ein Präsident auch bei zwei gleichzeitigen Wegfällen (Postgres-Konkurrenztest)
- [x] Chroniktyp „automatische Nachfolge“ (Akteur leer, betroffen = neuer Präsident, Metadaten: früherer Präsident); kein Eintrag in der Diplomatie-Chronik
- [x] Nichtpräsident: Austrittsablauf mit Chronik und Verwaltungsnachricht; Spieler ohne Mitgliedschaft: No-Op
- [x] Beiträge und Chronik bleiben, Autoren erscheinen als „Gelöschter Siedler“
- [x] Freiwilliger Präsidentenaustritt mit weiteren Mitgliedern bleibt ein Fehler
- [x] Frontendtest für den Chroniktext
