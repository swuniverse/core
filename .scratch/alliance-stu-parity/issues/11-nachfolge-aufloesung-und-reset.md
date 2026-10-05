# Nachfolge, Auflösung und Reset

Type: grilling
Status: resolved
Blocked by: 03, 07, 09, 10

## Question

Wie werden Präsidentennachfolge, Kontolöschung, Allianzauflösung und vollständiger Spielreset deterministisch und vollständig behandelt?

## Answer

Fällt der Präsident ohne manuelle Übergabe weg, wird der Nachfolger deterministisch gewählt:

1. der zuletzt aktive Vize,
2. sonst der zuletzt aktive Diplomat,
3. sonst das zuletzt aktive übrige Mitglied,
4. bei gleicher Aktivität die längste Mitgliedschaft,
5. danach die niedrigste User-ID.

Gibt es keinen Kandidaten, wird die Allianz aufgelöst. Alle verbleibenden Mitglieder erhalten nach erfolgreichem Commit eine Systemnachricht mit altem und neuem Präsidenten. Die Nachfolge wird in der Allianzchronik festgehalten. Kontolöschung entfernt die Mitgliedschaft und löst bei Bedarf denselben Ablauf aus.

Die relationale Auflösung einer Allianz ist eine Datenbanktransaktion. Sie entfernt Allianz, Mitgliedschaften, Bewerbungen, Beziehungen und Vorschläge, Beziehungsfreigaben und deren Änderungen, Forum, Allianzdepot-Zuordnungen, allianzbezogene Zugangsprivilegien, interne Allianzchronik sowie Bannerreferenz. Nachrichten und physische Asset-Löschung erfolgen erst nach dem Commit; ihre Fehler dürfen die Transaktion nicht rückwirkend scheitern lassen und müssen zuverlässig wiederholbar sein.

Ein vollständiger Spielreset entfernt zusätzlich sämtliche zu diesem Spielstand gehörenden Allianz- und Beziehungsdaten einschließlich öffentlicher Chroniken und physischer beziehungsweise referenzierter Bannerassets. Die Bereinigung ist idempotent und hinterlässt keine auf wiederverwendete IDs zielenden Rechte.
