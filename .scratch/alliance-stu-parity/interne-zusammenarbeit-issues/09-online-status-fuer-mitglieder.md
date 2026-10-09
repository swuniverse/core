# 09: Online-Status für Mitglieder

**What to build:** Allianzmitglieder sehen auf der Seite ihrer Allianz, welche Mitglieder gerade online sind. Außenstehende erhalten diese Information weder in der Oberfläche noch in der API-Antwort.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

**Triage label:** ready-for-agent
**Tracker:** local Markdown issue tracker (`.scratch/alliance-stu-parity/interne-zusammenarbeit-issues/09-online-status-fuer-mitglieder.md`)
**Spec:** `.scratch/alliance-stu-parity/interne-zusammenarbeit-spec.md`

- [ ] Die Allianzdetailansicht liefert je Mitglied einen Online-Status nur, wenn der Betrachter aktuell Mitglied derselben Allianz ist; sonst fehlt das Feld vollständig.
- [ ] Quelle ist die vorhandene Liste verbundener Spieler des Websocket-Gateways über eine schmale Schnittstelle; keine neuen Kanäle oder Ereignistypen; ermittelt beim Laden der Seite.
- [ ] Shared DTO erweitert um das optionale Feld.
- [ ] Die Detailseite zeigt den Status nur bei geliefertem Feld.
- [ ] `AllianceService`-Verhaltenstests für Mitglied, Mitglied einer anderen Allianz, allianzlosen Spieler und ehemaliges Mitglied; Frontend-Seitentest für Anzeige nur bei geliefertem Feld.
