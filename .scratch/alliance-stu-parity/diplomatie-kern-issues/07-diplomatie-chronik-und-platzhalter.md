# 07: Diplomatie-Chronik und Beziehungsplatzhalter

**What to build:** Spieler können die unveränderliche öffentliche Diplomatie-Chronik einer Allianz paginiert lesen, und Allianzbeschreibungen können aktive Beziehungen über `$ALLIANCE_DIPLOMATIC_RELATIONS` sicher darstellen, ohne Vorschläge oder Vertragsentwürfe offenzulegen.

**Blocked by:** 02 (Krieg erklären), 03 (Abkommen vorschlagen und beantworten), 04 (Frieden und Beziehungswechsel), 05 (Beziehungsfreigaben und Vertragswerk aushandeln)

**Status:** ready-for-agent

- [ ] Kriegserklärungen, angenommene Erstabkommen, angenommene Typwechsel einschließlich Frieden und beendete aktive Beziehungen erzeugen in derselben Transaktion einen öffentlichen Chronikeintrag.
- [ ] Vorschläge, Ablehnungen, Rückzüge und reine Freigabe-/Vertragsänderungen erscheinen nicht in der öffentlichen Diplomatie-Chronik.
- [ ] Ein Eintrag enthält Ereignistyp, Akteur, beide Allianz-IDs und Namen zum Ereigniszeitpunkt, Zeitpunkt sowie nur die nötigen Metadaten für Beziehungstyp und Vasallenschaftsrichtung.
- [ ] Chronikeinträge kopieren weder Allianzbeschreibungen noch Vertragswerke oder andere vertrauliche Entwürfe und können nicht einzeln geändert oder gelöscht werden.
- [ ] Jede authentifizierte Person kann die Chronik einer vorhandenen Allianz mit begrenzter Seitengröße, stabiler Pagination und neuestem Eintrag zuerst lesen.
- [ ] Spätere Umbenennung einer Allianz verändert historische Namen nicht; der Eintrag bleibt auch nach dem Ende der Beziehung verständlich.
- [ ] `$ALLIANCE_DIPLOMATIC_RELATIONS` rendert ausschließlich aktive öffentliche Beziehungen in einer sicheren, verständlichen Darstellung ohne GraphViz oder ausführbares Markup.
- [ ] Der Platzhalter enthält Gegenpartei, Beziehungstyp und Vasallenschaftsrichtung, aber weder Beziehungsvorschläge noch ausstehende Freigaben oder Vertragsentwürfe.
- [ ] Eine Beschreibung ohne aktive Beziehungen ersetzt den Platzhalter deterministisch durch eine leere beziehungsweise klar definierte sichere Darstellung.
- [ ] Service-, Migrations-, PostgreSQL- und Frontendtests decken Ereignisauswahl, Atomarität, Unveränderlichkeit, Pagination, Namens-Snapshots und Geheimhaltung im Platzhalter ab.
