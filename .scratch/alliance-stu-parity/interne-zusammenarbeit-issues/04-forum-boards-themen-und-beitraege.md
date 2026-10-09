# 04: Forum – Boards, Themen und Beiträge (Tracer Bullet)

**What to build:** Jede **Allianz** erhält ein internes Forum. Präsident und Vize legen Boards an. Alle aktuellen Mitglieder sehen die Boards mit Themen- und Beitragszahl und letztem Beitrag, öffnen Themen (wichtige zuerst, dann nach letzter Aktivität), lesen Beiträge chronologisch mit 20 je Seite, legen Themen an und antworten. Nichtmitglieder, ehemalige Mitglieder und andere Allianzen sehen nichts, auch nicht über geratene IDs.

**Blocked by:** 01: Allianz-Ratenbegrenzung verallgemeinern

**Status:** ready-for-agent

**Triage label:** ready-for-agent
**Tracker:** local Markdown issue tracker (`.scratch/alliance-stu-parity/interne-zusammenarbeit-issues/04-forum-boards-themen-und-beitraege.md`)
**Spec:** `.scratch/alliance-stu-parity/interne-zusammenarbeit-spec.md`

- [ ] Rückwärtskompatible Migration mit Migrationstest für Board, Thema und Beitrag gemäß Spec: Kaskaden Allianz → Board → Thema → Beitrag, denormalisierte Allianzreferenz am Thema, nullable Autorreferenzen (bei Kontolöschung null) mit festgehaltenem Autornamen, Felder für letzte Aktivität, Bearbeitung und weiche Löschung, Indizes für Themenliste, Beitragsseiten und zuletzt aktive Themen, datenbankseitige Längenprüfungen.
- [ ] Neuer Forumsdienst im Allianz-Modul mit eigenem Forum-Store-Port (TypeORM- und In-Memory-Implementierung); die Rechtematrix erhält `moderateForum` für Präsident und Vize.
- [ ] Board anlegen nur durch Präsident und Vize; Boardname 5–80 Unicode-Zeichen nach Trim; höchstens 50 nicht gelöschte Boards je Allianz, geprüft unter Sperre der Allianz.
- [ ] Thema anlegen erzeugt Titel (1–120) und ersten Beitrag (1–20.000) atomar und setzt die letzte Aktivität von Thema und Board; Antworten setzen sie ebenfalls.
- [ ] Themenlisten und Beitragsseiten sind paginiert; Themen sortiert nach wichtig, dann letzter Aktivität; Beiträge chronologisch, 20 je Seite.
- [ ] Jede Anfrage prüft serverseitig aktuelle Mitgliedschaft und Zugehörigkeit des Objekts zur Allianz des Anfragenden; Allianz-ID im Pfad ≠ eigene Allianz, fremde und nicht existierende Objekte liefern einheitlich Not Found; fehlende Rechte bei eigenen Objekten liefern Forbidden.
- [ ] Thema anlegen und Beitrag schreiben werden über die Allianz-Ratenbegrenzung begrenzt.
- [ ] Antworten tragen servergelieferte Fähigkeiten (Forumsebene: Boards verwalten); Forumsaktionen erzeugen keine Systemnachrichten und keine Chronikeinträge.
- [ ] Beiträge zeigen Autor oder „Gelöschter Siedler“, Fraktion, Amtstitel und Zeitpunkt; Texte werden ausschließlich mit dem vorhandenen sicheren BBCode-Renderer dargestellt, Board- und Thementitel als reiner Text.
- [ ] DTOs und Anfragen in `packages/shared`.
- [ ] Die Betrachteraktionen der Detailansicht erhalten „Forum lesen“; die Detailseite verlinkt das Forum nur bei gesetzter Fähigkeit. Neue Seiten Forum (Boardliste mit Anlageformular bei Fähigkeit), Board (Themenliste, neues Thema) und Thema (Beiträge, Paginierung, Antwortformular); nach dem Absenden landet der Spieler auf der Seite mit seinem Beitrag; Servervalidierungsfehler werden angezeigt.
- [ ] Forumsdienst-Verhaltenstests: Lesen, Anlegen und Antworten durch jedes Mitglied; Board-Anlage nur durch Präsident und Vize; Not Found für Nichtmitglieder und fremde IDs; sofortiger Zugriffsverlust nach Austritt und Rauswurf; neues Mitglied sieht das bisherige Forum; Längengrenzen inkl. Emoji und kombinierender Zeichen; Board-Limit; Sortierung und Paginierung; „Gelöschter Siedler“; Ratenbegrenzung.
- [ ] Frontend-Seitentests mit gemockter API für Boardliste, Themenliste, Themenansicht, Paginierung, Fähigkeiten und Fehlermeldungen.
