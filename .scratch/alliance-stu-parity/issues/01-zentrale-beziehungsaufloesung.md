# 01: Zentrale Beziehungsauflösung

**What to build:** Eine zentrale serverseitige Auflösung bestimmt für zwei Parteien deterministisch Freund, Feind oder Neutral. Allianzmitglieder werden durch ihre Allianz vertreten; allianzlose Spieler bleiben eigene Parteien. Die bestätigte Priorität gilt: andere Fraktion, gleiche Allianz, Krieg zwischen verschiedenen Allianzparteien, aktive Beziehungsfreigabe „Als Freund behandeln“, persönlicher Kontakt, Neutral. Die Auflösung liefert außerdem nur die benötigten abgeleiteten Fähigkeiten und fällt bei inkonsistenten Daten sicher aus.

**Blocked by:** None (can start immediately)

**Status:** resolved

**Triage label:** ready-for-agent
**Tracker:** local Markdown issue tracker (`.scratch/alliance-stu-parity/issues/01-zentrale-beziehungsaufloesung.md`)

- [x] Der Server löst Freund, Feind und Neutral für Allianzmitglieder, allianzlose Spieler und Allianzparteien nach der festgelegten Priorität auf.
- [x] Mitglieder derselben Allianz bleiben Freunde; Krieg gilt ausschließlich zwischen zwei verschiedenen Allianzparteien.
- [x] Andere Fraktionen bleiben trotz persönlicher Kontakte oder Beziehungsfreigaben Feinde.
- [x] Nur aktive Beziehungen und aktive Beziehungsfreigaben wirken; ausstehende oder ungültige Zustände wirken nicht.
- [x] Die Resolver-Schnittstelle liefert die erforderlichen Fähigkeiten für bestehende Verbraucher, ohne Beziehungstypen in Verbrauchern zu interpretieren.
- [x] Fehlende oder inkonsistente Daten öffnen keinen Freundzugriff und keine Sichtbarkeitsfreigabe.
- [x] Verhaltenstests decken die vollständige Prioritäts- und Konfliktmatrix einschließlich des Drittallianz-Kriegs ab.

## Comments

Implemented on `integration/beziehungswirkungen` in commit `489c5af`. Focused resolver tests and lint pass. The optional personal-contact-status port defaults to no marker; contact persistence and UI remain out of scope.
