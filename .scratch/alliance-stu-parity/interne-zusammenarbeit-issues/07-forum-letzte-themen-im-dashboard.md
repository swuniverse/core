# 07: Forum – letzte Themen im Dashboard

**What to build:** Allianzmitglieder sehen im Dashboard die drei zuletzt aktiven Themen ihrer Allianz und springen von dort direkt ins jeweilige Thema. Allianzlose Spieler sehen den Abschnitt nicht.

**Blocked by:** 04: Forum – Boards, Themen und Beiträge

**Status:** ready-for-agent

**Triage label:** ready-for-agent
**Tracker:** local Markdown issue tracker (`.scratch/alliance-stu-parity/interne-zusammenarbeit-issues/07-forum-letzte-themen-im-dashboard.md`)
**Spec:** `.scratch/alliance-stu-parity/interne-zusammenarbeit-spec.md`

- [ ] Der Forumsdienst liefert die drei zuletzt aktiven, nicht gelöschten Themen in nicht gelöschten Boards der aktuellen Allianz des Spielers; für allianzlose Spieler eine leere Liste.
- [ ] Der Dashboard-Dienst liefert diese Liste mit Thema, Board, letzter Aktivität und Ziel; DTO in `packages/shared`.
- [ ] Das Dashboard zeigt den Abschnitt nur bei nicht leerer Liste bzw. Mitgliedschaft; jeder Eintrag verlinkt das Thema.
- [ ] Austritt oder Rauswurf entfernt den Abschnitt mit der nächsten Anfrage.
- [ ] Verhaltenstests für Auswahl, Reihenfolge, gelöschte Inhalte und allianzlose Spieler; Frontend-Test für Anzeige nur bei Mitgliedschaft und Verlinkung.
