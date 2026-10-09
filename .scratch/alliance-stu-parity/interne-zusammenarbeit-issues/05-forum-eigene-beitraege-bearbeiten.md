# 05: Forum – eigene Beiträge bearbeiten

**What to build:** Autoren bearbeiten ihre eigenen Beiträge inline mit demselben Editor wie beim Antworten. Leser sehen, ob und wann ein Beitrag zuletzt bearbeitet wurde. Niemand sonst – auch nicht Präsident oder Vize – kann einen fremden Beitrag inhaltlich verändern, auch nicht per direktem Request.

**Blocked by:** 04: Forum – Boards, Themen und Beiträge

**Status:** resolved

**Triage label:** ready-for-agent
**Tracker:** local Markdown issue tracker (`.scratch/alliance-stu-parity/interne-zusammenarbeit-issues/05-forum-eigene-beitraege-bearbeiten.md`)
**Spec:** `.scratch/alliance-stu-parity/interne-zusammenarbeit-spec.md`

- [ ] Bearbeiten nur durch den Autor, nur solange er aktuelles Mitglied ist, nur bei nicht gelöschten Beiträgen in nicht gelöschten Themen und Boards.
- [ ] Bearbeiten validiert 1–20.000 Unicode-Zeichen nach Trim, setzt den Bearbeitungszeitpunkt und ändert die letzte Aktivität von Thema und Board nicht.
- [ ] Bearbeiten wird über die Allianz-Ratenbegrenzung begrenzt.
- [ ] Fremde Beiträge der eigenen Allianz liefern Forbidden, fremde Allianzen Not Found.
- [ ] Jeder Beitrag trägt die servergelieferte Fähigkeit „bearbeiten“; die Themenansicht zeigt die Aktion nur dann und zeigt „zuletzt bearbeitet“ an.
- [ ] Forumsdienst-Verhaltenstests für Autor, fremdes Mitglied, Präsident, Vize, ehemaliges Mitglied, Grenzwerte und unveränderte Themenaktivität; Frontend-Seitentests für Inline-Bearbeitung, Fähigkeit und Bearbeitungshinweis.

## Answer

Merged on integration/interne-zusammenarbeit. `ForumService.updatePost`, `PATCH /alliances/:id/forum/posts/:postId`, rate-limit command `forum-edit`, inline editor in alliance-forum.tsx.
