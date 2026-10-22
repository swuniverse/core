# 03: Auswahl- und Kontextbereich der Systemkarte

**What to build:** Ein responsiver, schreibgeschützter Detailbereich zeigt zunächst Systemname, -typ, Außenkoordinaten und Rastergröße; bei Auswahl eines Felds oder Himmelskörpers zeigt er dessen bekannte statische Details. Die Ansicht enthält einen verständlichen Rückweg aus dem gesperrten Zustand zur Systemübersicht.

**Blocked by:** 02 – Grafische Rasterkarte für kartographierte Systemeinträge.

**Status:** ready-for-agent

- [ ] Ohne Auswahl zeigt der Kontextbereich die statischen Metadaten des Sternensystems: Name, Typ, Außenkoordinaten und Rastergröße.
- [x] Das Auswählen eines Felds oder Himmelskörpers aktualisiert den Kontextbereich mit dessen bekannten statischen Details, mindestens Typ und Koordinaten sowie gegebenenfalls Name.
- [x] Der Kontextbereich bleibt schreibgeschützt und enthält keine Fernaktionen oder dynamischen Spielzustände.
- [x] Karte und Kontextbereich stehen bei ausreichender Breite nebeneinander und auf schmalen Ansichten untereinander.
- [x] Der gesperrte Kartenstatus erklärt die fehlende vollständige Kartographie und bietet einen Rückweg zur Sternensystemübersicht.
- [ ] Die anfängliche Systemzusammenfassung, die Auswahlaktualisierung, die responsive Anordnung und der gesperrte Rückweg sind über sichtbares Seitenverhalten getestet.

## Comments

Audit 2026-10-22: Auswahl, schreibgeschützter statischer Kontext, responsive Grid-Anordnung und gesperrter Rückweg sind in `database.tsx` und `SystemRasterMap.tsx` implementiert (Commits `fc37352`, `d118865`, `7733cae`). Offen bleibt die anfängliche Systemzusammenfassung: Sie zeigt Name, Typ und Außenkoordinaten, aber keine Rastergröße, obwohl `maxX`/`maxY` vorliegen; `database.spec.tsx` erwartet deren Abwesenheit ausdrücklich. Außerdem fehlt ein verhaltensorientierter Test der responsiven Anordnung. Restarbeit: `tmw-D0a` und `tmw-D0b`.
