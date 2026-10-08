# 04: Verwaltungsdetails für Präsident und Vize

**What to build:** Präsident und Vize sehen für Schiffe ihrer Allianz zusätzlich Status, Alarmstufe, Hülle und Crew, damit sie die Einsatzbereitschaft der Allianz beurteilen können. Diplomaten und Mitglieder ohne Amt erhalten weiterhin nur Basisdaten.

**Blocked by:** 03: Allianzschiffe mit Basisdaten

**Status:** ready-for-agent

**Triage label:** ready-for-agent
**Tracker:** local Markdown issue tracker (`.scratch/alliance-stu-parity/allianz-infrastruktur-issues/04-verwaltungsdetails-fuer-praesident-und-vize.md`)
**Spec:** `.scratch/alliance-stu-parity/allianz-infrastruktur-spec.md`

- [ ] Der Verwaltungsdetailblock (Status, Alarmstufe, Hülle/max., Crew/max.) wird für Kontakte mit Grund `ALLIANCE` nur geliefert, wenn der Betrachter aktuell Präsident oder Vize ist.
- [ ] Für Diplomaten und Mitglieder ohne Amt wird der Block serverseitig gar nicht übertragen.
- [ ] Fracht, Module, Logbücher, Scanergebnisse, Nachrichten, Notizen, Zugangsdaten und Admininformationen gehören zu keiner Detailstufe.
- [ ] Ein Amtsverlust oder eine Präsidentschaftsübergabe wirkt mit der nächsten Anfrage.
- [ ] Die Amtsprüfung verwendet die vorhandene Ämter- und Rechtelogik der Allianz, nicht eine neue Rollenprüfung.
- [ ] Das Auswahlpanel zeigt Verwaltungsdetails nur, wenn der Server sie geliefert hat.
- [ ] Dienst-Verhaltenstests decken Präsident, Vize, Diplomat, Mitglied ohne Amt und Amtswechsel ab; Seitentests prüfen das Panel mit und ohne Detailblock.
