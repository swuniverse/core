# 01: Zentrale Beziehungsauflösung

**What to build:** Eine zentrale serverseitige Auflösung bestimmt für zwei Parteien deterministisch Freund, Feind oder Neutral. Allianzmitglieder werden durch ihre Allianz vertreten; allianzlose Spieler bleiben eigene Parteien. Die bestätigte Priorität gilt: andere Fraktion, gleiche Allianz, Krieg zwischen verschiedenen Allianzparteien, aktive Beziehungsfreigabe „Als Freund behandeln“, persönlicher Kontakt, Neutral. Die Auflösung liefert außerdem nur die benötigten abgeleiteten Fähigkeiten und fällt bei inkonsistenten Daten sicher aus.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

**Triage label:** ready-for-agent
**Tracker:** local Markdown issue tracker (`.scratch/alliance-stu-parity/issues/01-zentrale-beziehungsaufloesung.md`)

- [ ] Der Server löst Freund, Feind und Neutral für Allianzmitglieder, allianzlose Spieler und Allianzparteien nach der festgelegten Priorität auf.
- [ ] Mitglieder derselben Allianz bleiben Freunde; Krieg gilt ausschließlich zwischen zwei verschiedenen Allianzparteien.
- [ ] Andere Fraktionen bleiben trotz persönlicher Kontakte oder Beziehungsfreigaben Feinde.
- [ ] Nur aktive Beziehungen und aktive Beziehungsfreigaben wirken; ausstehende oder ungültige Zustände wirken nicht.
- [ ] Die Resolver-Schnittstelle liefert die erforderlichen Fähigkeiten für bestehende Verbraucher, ohne Beziehungstypen in Verbrauchern zu interpretieren.
- [ ] Fehlende oder inkonsistente Daten öffnen keinen Freundzugriff und keine Sichtbarkeitsfreigabe.
- [ ] Verhaltenstests decken die vollständige Prioritäts- und Konfliktmatrix einschließlich des Drittallianz-Kriegs ab.
