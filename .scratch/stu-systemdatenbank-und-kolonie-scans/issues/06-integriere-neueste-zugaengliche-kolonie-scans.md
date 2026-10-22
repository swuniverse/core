# 06: Integriere neueste zugängliche Kolonie-Scans in Systemeinträge

**What to build:** Ein Systemeintrag zeigt für jede Kolonie höchstens den neuesten eigenen oder aktuell innerhalb der **Allianz** geteilten Kolonie-Scan. Spieler können Herkunft, Zeitlichkeit und heutigen Kontext beurteilen, gespeicherte Oberflächen untersuchen und ausschließlich eigene Scans löschen.

**Blocked by:** 05: Baue den nicht-taktischen Datenbank-Systemeintrag.

**Status:** ready-for-agent

- [x] Eine wiederverwendbare Scanprojektion liefert je System und Kolonie den neuesten für den Betrachter zugänglichen Scan aus eigenen und aktuellen Allianzscans.
- [x] Die Projektion liefert Scanneridentität und -name, serverseitig abgeleitetes Löschrecht, Freigabeherkunft, aktuelle Systemreferenz sowie alle erforderlichen Snapshotdaten.
- [ ] Die Scanliste zeigt aktuelle Feldkoordinaten und aktuelle Objekt-/Kolonieinformation neben dem bei Scanzeit gespeicherten Namen, Besitzer, Zeitpunkt und der gespeicherten Oberfläche.
- [ ] Besitzerwechsel oder aufgegebene Kolonien sind klar sichtbar, ohne die historischen Scan-Snapshotdaten zu überschreiben.
- [ ] Die gespeicherte Oberfläche ist in einem nicht-taktischen Dialog einsehbar.
- [ ] Nur der Scanner sieht eine Löschaktion; ein direkter Löschversuch auf einen fremden Scan bleibt serverseitig verweigert.
- [x] Aktuelle Allianzmitgliedschaft gewährt dynamischen Zugriff; Austritt oder Ausschluss entzieht fremde Scans sofort, während eigene Scans lesbar und löschbar bleiben.
- [x] Diplomatie, Freundschaft und Live-Positionsfreigaben gewähren allein keinen Scan-Zugriff.
- [ ] Tests decken neueste-Auswahl, Allianzfreigabe und -entzug, Live-/Snapshot-Hinweise, Oberflächendialog und Eigentumsschutz ab.

## Comments

Audit: Kriterien 1, 2, 7 und 8 sind erfüllt. `64c0531` implementiert die wiederverwendbare Projektion, Provenienz, Löschrechte und dynamische Allianzberechtigung (`colony-scan-projection.service.ts`, `relationship-resolver.service.ts`, `spacecraft-scan.service.ts`; Tests `colony-scan-projection.service.spec.ts`, `spacecraft-scan.service.spec.ts`; weitere Commits `50a158d`, `15e3507`). `b496498` und `d118865` entfernten jedoch die Integration aus dem aktiven Systemeintrag. Dort fehlen Scanliste, Live-/Snapshot-Kennzeichnung, Oberflächendialog, Lösch-UI und End-to-End-Tests (`database.service.ts`, `database.tsx`, `ColonyScans.tsx`, `database.spec.tsx`). Restarbeit: `tmw-D0a` und `tmw-D0b`.
