# 02: Allianz gründen, Liste und Detailseite

**What to build:** Ein allianzloser Spieler mit gewählter **Fraktion** gründet eine **Allianz** und ist danach ihr **Präsident**. Die Allianz übernimmt seine Fraktion. Alle Spieler sehen eine Liste der Allianzen beider Fraktionen und können jede Detailseite öffnen. Über einen Eintrag in der Navigation findet man die Liste und das Gründen. Begriffe nach `CONTEXT.md`. Spezifikation: `.scratch/alliance/spec.md`, User Stories 1–5, 7–13, 16, 56–58.

**Blocked by:** 01 (Integrationstests gegen Postgres einrichten)

**Status:** resolved

- [x] Neues Backend-Modul mit den Tabellen Allianz, Mitgliedschaft (mit Amt) und Bewerbung (die Tabelle wird erst in 03 genutzt) sowie einer Migration. Die Amtstitel haben Defaults („Präsident“, „Vize-Präsident“, „Diplomat“). Bewerbungen sind standardmäßig ausgeschaltet.
- [x] Gründen mit Name und Beschreibung. Name 5–40 Zeichen, eindeutig ohne Rücksicht auf Groß- und Kleinschreibung. Beschreibung höchstens 10.000 Zeichen. Bei Verstoß eine deutsche Fehlermeldung.
- [x] Gründen ist abgelehnt, wenn der Spieler schon Mitglied einer Allianz ist oder noch keine Fraktion hat.
- [x] Die Liste zeigt pro Allianz Name, Fraktion, Mitgliederzahl, Farbe und verlinkte Mitglieder. Ob sie Bewerbungen annimmt, vermittelt die Einordnung in die Bereiche „Offene Allianzen“ und „Geschlossene Allianzen“.
- [x] Die Detailseite zeigt Name, Fraktion, Gründungsdatum, Homepage, Farbe, die BBCode-Beschreibung (über die bestehende BBCode-Komponente, kein HTML) und alle Mitglieder mit den angezeigten Amtstiteln.
- [x] Die Detail- bzw. eigene Allianz-Sicht liefert vom Server die erlaubten Aktionen mit. Das Frontend blendet Buttons nur danach ein.
- [x] Die DTOs liegen im Shared-Paket.
- [x] Unit-Tests für den `AllianceService` decken die Gründungsregeln ab.
- [x] Integrationstests prüfen den eindeutigen Namen (auch „Rogue“ gegen „rogue“) und „ein Spieler in höchstens einer Allianz“.
- [x] Ein Migrationstest im Stil der bestehenden Migrationstests ist vorhanden.
- [x] Frontend-Tests decken Liste, Detail und Gründen ab, einschließlich der Anzeige von Fehlermeldungen.

## Comments

Implemented in commit 13590f6 (feat(alliance): add alliances).
