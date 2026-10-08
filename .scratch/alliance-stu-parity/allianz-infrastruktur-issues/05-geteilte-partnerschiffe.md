# 05: Geteilte Partnerschiffe auf der Sternenkarte

**What to build:** Mitglieder einer Allianz mit aktiver Beziehungsfreigabe „Live-Kartenpositionen teilen“ sehen die Schiffe der Partnerpartei auf der Sternenkarte, auch außerhalb der eigenen Sensorreichweite und auch bei neutraler Haltung. Die Diplomatieverwaltung verweist nach Aktivierung auf die Sternenkarte.

**Blocked by:** 03: Allianzschiffe mit Basisdaten

**Status:** ready-for-agent

**Triage label:** ready-for-agent
**Tracker:** local Markdown issue tracker (`.scratch/alliance-stu-parity/allianz-infrastruktur-issues/05-geteilte-partnerschiffe.md`)
**Spec:** `.scratch/alliance-stu-parity/allianz-infrastruktur-spec.md`

- [ ] Partnerkontakte entstehen ausschließlich über die vorhandene Fähigkeit `mayShareLivePosition` und tragen Grund `SHARED_LIVE_POSITION`, Haltung und nur Basisdaten, nie Verwaltungsdetails.
- [ ] Gründe folgen der festen Reihenfolge eigen vor Allianz vor geteilter Position; ein Schiff erscheint genau einmal.
- [ ] Fehlende, ausstehende, beendete oder entzogene Freigaben, Krieg sowie „Als Freund behandeln“ ohne Positionsteilung liefern keine Partnerkontakte.
- [ ] Spieler der anderen Fraktion erscheinen nie.
- [ ] Bei deaktivierter Allianz-Infrastruktur-Fähigkeit werden keine Partnerkontakte geliefert.
- [ ] Die bestehende Route `GET /api/spacecraft/shared-live-positions` wird aus demselben Dienst bedient, behält ihren Vertrag und ihre Tests bleiben unverändert grün.
- [ ] Partnermarker haben eine eigene Kennzeichnung für geteilte Positionen; das Kontrollpanel erhält einen Schalter für Partnerschiffe, sichtbar nur bei aktiven Kontakten.
- [ ] Die Diplomatieverwaltung erhält vom Server, ob die Kartenanzeige aktiv ist, und verweist dann auf die Sternenkarte statt auf die künftige Allianz-Kartenansicht; sonst bleibt der bisherige Hinweis.
- [ ] Dienst-Verhaltenstests decken aktive, fehlende, ausstehende, beendete und entzogene Freigaben, Krieg, Freundfreigabe ohne Positionsteilung, Fraktionsgrenze und Mehrfachgründe ab; Seitentests prüfen Partnermarker, Schalter und den angepassten Diplomatiehinweis.
