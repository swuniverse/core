# 07: Gesamtintegration und Aktivierungsnachweis

**What to build:** Die Etappe Allianz-Infrastruktur ist end-to-end nachgewiesen und kann über ihre Fähigkeit separat aktiviert werden. Echte Postgres-Tests und direkte Requests über die vollständige Rollenmatrix belegen, dass Sichtbarkeit und Detailstufen ausschließlich serverseitig und dynamisch entschieden werden.

**Blocked by:** 02: Schiffe im geöffneten Systemraster; 04: Verwaltungsdetails für Präsident und Vize; 05: Geteilte Partnerschiffe auf der Sternenkarte

**Status:** ready-for-agent

**Triage label:** ready-for-agent
**Tracker:** local Markdown issue tracker (`.scratch/alliance-stu-parity/allianz-infrastruktur-issues/07-gesamtintegration-und-aktivierung.md`)
**Spec:** `.scratch/alliance-stu-parity/allianz-infrastruktur-spec.md`

- [ ] Postgres-Integrationstests nach dem Muster der vorhandenen Allianz-Integrationstests prüfen die Kontaktabfrage über Mitgliedschaft, Amt, Beziehung, Freigabe und Kartenebene.
- [ ] Die Integrationstests belegen, dass Beitritt, Austritt, Rauswurf, Auflösung, Amtswechsel, Krieg, Beziehungsende und Freigabeentzug ohne Bereinigungsschritt mit der nächsten Anfrage wirken.
- [ ] Direkte Requests als Präsident, Vize, Diplomat, Mitglied ohne Amt, allianzloser Spieler und Spieler der anderen Fraktion liefern genau die zulässigen Kontakte und Detailstufen; manipulierte Parameter liefern keine zusätzlichen Kontakte oder Details.
- [ ] Mit deaktivierter Fähigkeit verhalten sich Sternenkarte und Diplomatieverwaltung wie vor der Etappe, abgesehen von eigenen Schiffen; mit aktivierter Fähigkeit sind alle Wirkungen sichtbar.
- [ ] Falls ein Index nötig wurde, ist die Migration rückwärtskompatibel und vor der Aktivierung ausrollbar.
- [ ] Die Antwortzeit der Kontaktroute bleibt bei einer Allianz mit vielen Mitgliedern und Schiffen durch eine gebündelte Haltungsauflösung pro Anfrage begrenzt.
- [ ] Die Etappe wird in `map.md` unter den Entscheidungen mit Verweis auf Spezifikation und Tickets nachgetragen.
