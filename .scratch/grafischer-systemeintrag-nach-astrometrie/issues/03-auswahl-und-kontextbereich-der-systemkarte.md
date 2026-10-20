# 03: Auswahl- und Kontextbereich der Systemkarte

**What to build:** Ein responsiver, schreibgeschützter Detailbereich zeigt zunächst Systemname, -typ, Außenkoordinaten und Rastergröße; bei Auswahl eines Felds oder Himmelskörpers zeigt er dessen bekannte statische Details. Die Ansicht enthält einen verständlichen Rückweg aus dem gesperrten Zustand zur Systemübersicht.

**Blocked by:** 02 – Grafische Rasterkarte für kartographierte Systemeinträge.

**Status:** ready-for-agent

- [ ] Ohne Auswahl zeigt der Kontextbereich die statischen Metadaten des Sternensystems: Name, Typ, Außenkoordinaten und Rastergröße.
- [ ] Das Auswählen eines Felds oder Himmelskörpers aktualisiert den Kontextbereich mit dessen bekannten statischen Details, mindestens Typ und Koordinaten sowie gegebenenfalls Name.
- [ ] Der Kontextbereich bleibt schreibgeschützt und enthält keine Fernaktionen oder dynamischen Spielzustände.
- [ ] Karte und Kontextbereich stehen bei ausreichender Breite nebeneinander und auf schmalen Ansichten untereinander.
- [ ] Der gesperrte Kartenstatus erklärt die fehlende vollständige Kartographie und bietet einen Rückweg zur Sternensystemübersicht.
- [ ] Die anfängliche Systemzusammenfassung, die Auswahlaktualisierung, die responsive Anordnung und der gesperrte Rückweg sind über sichtbares Seitenverhalten getestet.
