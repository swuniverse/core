# 06: Forum – Moderation

**What to build:** Präsident und Vize halten das Forum in Ordnung: Sie benennen Boards und Themen um, markieren Themen als wichtig oder entfernen die Markierung und löschen Beiträge, Themen und Boards weich. Gelöschte Beiträge bleiben als Hinweis mit Autor, Zeitpunkt, Moderator und Moderationszeit stehen, ihr Inhalt wird niemandem mehr ausgeliefert. Gelöschte Themen und Boards verschwinden samt Inhalt. Diplomat und Mitglied ohne Amt können nicht moderieren, auch nicht per direktem Request.

**Blocked by:** 04: Forum – Boards, Themen und Beiträge

**Status:** ready-for-agent

**Triage label:** ready-for-agent
**Tracker:** local Markdown issue tracker (`.scratch/alliance-stu-parity/interne-zusammenarbeit-issues/06-forum-moderation.md`)
**Spec:** `.scratch/alliance-stu-parity/interne-zusammenarbeit-spec.md`

- [ ] Umbenennen von Boards (5–80) und Themen (1–120) sowie wichtig setzen/entfernen nur mit `moderateForum`.
- [ ] Beitrag löschen: Text wird in der Datenbank geleert, Löschzeit, Moderator-ID und Moderatorname werden erfasst; der Beitrag bleibt in der Abfolge und liefert Autor, Zeitpunkt, Moderator und Moderationszeit, aber keinen Text.
- [ ] Thema bzw. Board löschen: erfasst Moderator und Zeitpunkt, leert die Texte aller darunterliegenden Beiträge, entfernt das Objekt aus allen Listen und behandelt es samt Inhalt bei direktem Aufruf als Not Found; gelöschte Boards zählen nicht zum Limit.
- [ ] Keine Wiederherstellung; leere Themen und Boards werden nie automatisch gelöscht; Autoren löschen nicht selbst.
- [ ] Schreibaktionen sperren das betroffene Thema bzw. Board: ein gleichzeitig gelöschtes Thema erhält keinen neuen Beitrag und keine Bearbeitung mehr.
- [ ] Ein Amtsverlust beendet die Moderationsrechte mit der nächsten Anfrage.
- [ ] Servergelieferte Fähigkeiten je Thema (umbenennen, Markierung ändern, löschen) und je Beitrag (löschen); die Seiten zeigen die Aktionen nur dann, fragen vor dem Löschen nach Bestätigung und stellen gelöschte Beiträge als Hinweis dar.
- [ ] Forumsdienst-Verhaltenstests: Präsident und Vize dürfen, Diplomat und Mitglied ohne Amt erhalten Forbidden, fremde Allianzen Not Found; weiche Löschung liefert keinen Text; gelöschte Themen und Boards samt Inhalt verschwinden; Amtsverlust; Grenzwerte beim Umbenennen.
- [ ] Postgres-Integrationstest: ein gleichzeitig gelöschtes Thema erhält keinen neuen Beitrag; das Board-Limit hält bei gleichzeitigem Anlegen.
- [ ] Frontend-Seitentests für Aktionen nur bei Fähigkeit, Bestätigung und Löschhinweis.
