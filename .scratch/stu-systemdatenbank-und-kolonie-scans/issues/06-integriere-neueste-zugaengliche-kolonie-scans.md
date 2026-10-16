# 06: Integriere neueste zugängliche Kolonie-Scans in Systemeinträge

**What to build:** Ein Systemeintrag zeigt für jede Kolonie höchstens den neuesten eigenen oder aktuell innerhalb der **Allianz** geteilten Kolonie-Scan. Spieler können Herkunft, Zeitlichkeit und heutigen Kontext beurteilen, gespeicherte Oberflächen untersuchen und ausschließlich eigene Scans löschen.

**Blocked by:** 05: Baue den nicht-taktischen Datenbank-Systemeintrag.

**Status:** ready-for-agent

- [ ] Eine wiederverwendbare Scanprojektion liefert je System und Kolonie den neuesten für den Betrachter zugänglichen Scan aus eigenen und aktuellen Allianzscans.
- [ ] Die Projektion liefert Scanneridentität und -name, serverseitig abgeleitetes Löschrecht, Freigabeherkunft, aktuelle Systemreferenz sowie alle erforderlichen Snapshotdaten.
- [ ] Die Scanliste zeigt aktuelle Feldkoordinaten und aktuelle Objekt-/Kolonieinformation neben dem bei Scanzeit gespeicherten Namen, Besitzer, Zeitpunkt und der gespeicherten Oberfläche.
- [ ] Besitzerwechsel oder aufgegebene Kolonien sind klar sichtbar, ohne die historischen Scan-Snapshotdaten zu überschreiben.
- [ ] Die gespeicherte Oberfläche ist in einem nicht-taktischen Dialog einsehbar.
- [ ] Nur der Scanner sieht eine Löschaktion; ein direkter Löschversuch auf einen fremden Scan bleibt serverseitig verweigert.
- [ ] Aktuelle Allianzmitgliedschaft gewährt dynamischen Zugriff; Austritt oder Ausschluss entzieht fremde Scans sofort, während eigene Scans lesbar und löschbar bleiben.
- [ ] Diplomatie, Freundschaft und Live-Positionsfreigaben gewähren allein keinen Scan-Zugriff.
- [ ] Tests decken neueste-Auswahl, Allianzfreigabe und -entzug, Live-/Snapshot-Hinweise, Oberflächendialog und Eigentumsschutz ab.
