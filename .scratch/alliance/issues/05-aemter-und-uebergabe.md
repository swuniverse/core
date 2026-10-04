# 05: Ämter und Übergabe

**What to build:** Der **Präsident** ernennt **Vizes** und **Diplomaten** und übergibt bei Bedarf sein eigenes Amt. Vizes erhalten ihre Verwaltungsrechte. Damit gilt die vollständige Rechte-Matrix aus der Spezifikation. Spezifikation: `.scratch/alliance/spec.md`, User Stories 35, 38–43, 45, 53. ADR: `docs/adr/0001-allianzen-abweichungen-von-stu.md`.

**Blocked by:** 04 (Austreten, Rauswerfen, Auflösen)

**Status:** resolved

- [x] Der Präsident ernennt Mitglieder zu Vize oder Diplomat und setzt sie wieder ab.
- [x] Ein Vize ernennt Mitglieder zum Diplomaten und setzt Diplomaten ab. Vizes ernennen oder absetzen kann er nicht.
- [x] Jedes Mitglied hat höchstens ein Amt. Eine neue Ernennung ersetzt das bisherige.
- [x] Der Präsident übergibt sein Amt an ein anderes Mitglied und ist danach Mitglied ohne Amt. Das geschieht in einer Transaktion, und der neue Präsident bekommt eine Nachricht. Danach darf der alte Präsident austreten.
- [x] Ernannte und abgesetzte Mitglieder bekommen eine Nachricht.
- [x] Vizes erhalten Rechte in den bestehenden Aktionen: Bewerbungen ansehen, annehmen und ablehnen, Bewerbungen ein- und ausschalten, Mitglieder ohne Amt und Diplomaten rauswerfen. Vizes und den Präsidenten rauswerfen kann ein Vize nicht. Auflösen kann er auch nicht.
- [x] Diplomaten haben keine Verwaltungsrechte.
- [x] Die Rechteprüfung liegt zentral in einer reinen Funktion (Akteur-Amt, Aktion, Ziel-Amt). Unit-Tests decken jede Kombination ab.
- [x] Ein Integrationstest prüft, dass ein zweiter Präsident in derselben Allianz am Constraint scheitert.
- [x] Frontend-Tests decken die Verwaltungsansicht ab: Ämter vergeben und entziehen sowie Übergabe. Die Buttons erscheinen nur gemäß den vom Server erlaubten Aktionen.

## Comments

Implemented in commit 13590f6 (feat(alliance): add alliances).
