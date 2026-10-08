# 06: Integrationsverträge für Depots, Zugangsprivilegien und Territorialfarbe

**What to build:** Die verbindlichen Integrationsverträge für Allianzdepots, allianzbezogene Zugangsprivilegien und die Territorialfarbe werden in der vorhandenen Dokumentation der Beziehungswirkungen festgehalten, sodass künftige Stations-, Dock-, Wurmloch-, Handelsposten- und Einflusssysteme sie ohne offene Produktentscheidung umsetzen können. Es wird kein Spielsystem und kein Privilegienmodell gebaut.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

**Triage label:** ready-for-agent
**Tracker:** local Markdown issue tracker (`.scratch/alliance-stu-parity/allianz-infrastruktur-issues/06-integrationsvertraege.md`)
**Spec:** `.scratch/alliance-stu-parity/allianz-infrastruktur-spec.md`

- [ ] Allianzdepot-Vertrag: nur organisatorische Zuordnung einer geeigneten eigenen Depotstation; kein Eigentums- oder Rechteübergang; nur der Eigentümer ordnet zu oder löst; ungeeignete Stationen ergeben einen Fehler; Präsident und Vize sehen Besitzer, Standort und Bestand; Austritt, Rauswurf, Abwracken und Auflösung lösen die Zuordnung in derselben Transaktion.
- [ ] Zugangsprivilegien-Vertrag: Regeln zielen auf Spieler, Allianz oder Fraktion und sind Erlaubnis oder Verbot; ein passendes Verbot gewinnt stets; Allianzregeln werden dynamisch über die aktuelle Mitgliedschaft ausgewertet; Haltung allein schaltet nichts frei; die Auflösung entfernt alle auf die Allianz zielenden Regeln transaktional; keine Rechte auf wiederverwendete IDs; das erste Zugangssystem baut das gemeinsame Modell.
- [ ] Territorialfarben-Vertrag: Allianzfarbe überschreibt die persönliche Farbe für tatsächlichen Einfluss von Mitgliedern; Gebietstitel nennt Allianz und Spieler; fraktionsweite Ansichten behalten die Fraktionsfarbe; die Farbe wird dynamisch abgeleitet und nicht kopiert; der vorhandene Einfluss-Quelltyp `ALLIANCE` muss vor Umsetzung fachlich geklärt werden.
- [ ] Der Sternenkarten-Eintrag unter den künftigen Integrationspunkten wird auf den Stand dieser Etappe gebracht.
- [ ] Die Begriffe folgen `CONTEXT.md` und ADR 0001.
