# 04: Verwaltungsdetails für Präsident und Vize

**What to build:** Präsident und Vize sehen für Schiffe ihrer Allianz zusätzlich Status, Alarmstufe, Hülle und Crew, damit sie die Einsatzbereitschaft der Allianz beurteilen können. Diplomaten und Mitglieder ohne Amt erhalten weiterhin nur Basisdaten.

**Blocked by:** 03: Allianzschiffe mit Basisdaten

**Status:** resolved

**Triage label:** ready-for-agent
**Tracker:** local Markdown issue tracker (`.scratch/alliance-stu-parity/allianz-infrastruktur-issues/04-verwaltungsdetails-fuer-praesident-und-vize.md`)
**Spec:** `.scratch/alliance-stu-parity/allianz-infrastruktur-spec.md`

- [x] Der Verwaltungsdetailblock (Status, Alarmstufe, Hülle/max., Crew/max.) wird für Kontakte mit Grund `ALLIANCE` nur geliefert, wenn der Betrachter aktuell Präsident oder Vize ist.
- [x] Für Diplomaten und Mitglieder ohne Amt wird der Block serverseitig gar nicht übertragen.
- [x] Fracht, Module, Logbücher, Scanergebnisse, Nachrichten, Notizen, Zugangsdaten und Admininformationen gehören zu keiner Detailstufe.
- [x] Ein Amtsverlust oder eine Präsidentschaftsübergabe wirkt mit der nächsten Anfrage.
- [x] Die Amtsprüfung verwendet die vorhandene Ämter- und Rechtelogik der Allianz, nicht eine neue Rollenprüfung.
- [x] Das Auswahlpanel zeigt Verwaltungsdetails nur, wenn der Server sie geliefert hat.
- [x] Dienst-Verhaltenstests decken Präsident, Vize, Diplomat, Mitglied ohne Amt und Amtswechsel ab; Seitentests prüfen das Panel mit und ohne Detailblock.

## Answer

`StarmapVisibilityService` attaches the management block to `ALLIANCE` contacts only when the viewer's current office passes `mayActOnAlliance(role, 'viewFleetManagementDetails')` (president and vice). `RelationshipResolverService.allianceMapCandidates` now also returns `viewerRole`, read fresh on every request, so losing an office or a presidency handover applies immediately. Diplomats, members without office and partner contacts never receive the block. The contact DTO carries no cargo, module, log or other private fields. The selection panel already rendered the block only when it was present. Service specs cover president, vice, diplomat, member without office, office change and the field whitelist. Page specs cover the panel with and without the block.
