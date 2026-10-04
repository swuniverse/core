# 04: Austreten, Rauswerfen, Auflösen

**What to build:** Mitglieder verlassen die **Allianz**, der **Präsident** wirft Mitglieder raus oder löst die Allianz auf. Eine Allianz ist nie ohne Präsidenten und bleibt nie leer zurück. Spezifikation: `.scratch/alliance/spec.md`, User Stories 30–34, 36–37, 50–53.

**Blocked by:** 03 (Bewerbungen)

**Status:** resolved

- [x] Ein Mitglied ohne Präsidentenamt kann austreten. Präsident und Vizes bekommen eine Nachricht.
- [x] Der Präsident kann nur austreten, wenn er das letzte Mitglied ist. Dann wird die Allianz aufgelöst. Sonst kommt eine fachliche Fehlermeldung mit dem Hinweis, erst das Amt zu übergeben (Übergabe folgt in 05).
- [x] Der Präsident kann jedes andere Mitglied rauswerfen, sich selbst nicht. Der Rausgeworfene bekommt eine Nachricht.
- [x] Der Präsident kann die Allianz nach einer Bestätigung in der Oberfläche auflösen. Alle Mitglieder bekommen eine Nachricht und sind danach allianzlos. Offene Bewerbungen an die Allianz verfallen.
- [x] Auflösung und Austritt des letzten Mitglieds laufen in einer Transaktion. Nachrichten gehen erst nach dem Commit raus.
- [x] Alle Rechte werden auf dem Server geprüft.
- [x] Unit-Tests decken alle Regeln ab.
- [x] Ein Integrationstest prüft, dass beim Auflösen Mitgliedschaften und Bewerbungen per Cascade verschwinden.
- [x] Frontend-Tests decken die Buttons für Austreten, Rauswerfen und Auflösen sowie den Bestätigungsdialog ab.

## Comments

Implemented in commit 13590f6 (feat(alliance): add alliances).
