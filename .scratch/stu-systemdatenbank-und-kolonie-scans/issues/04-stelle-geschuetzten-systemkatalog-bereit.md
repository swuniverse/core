# 04: Stelle einen geschützten Systemkatalog bereit

**What to build:** Spieler finden in der Datenbank je zugänglicher Kartenebene einen Sternensystemkatalog: persönlich entdeckte Systeme zeigen ihre erlaubten Metadaten, unbekannte Positionen bleiben als `???` erhalten. Weder die Oberfläche noch direkte Spieler-APIs können Details nicht entdeckter Systeme preisgeben.

**Blocked by:** 02: Entkopple Systembetreten von Datenbankentdeckung.

**Status:** ready-for-agent

- [ ] Der spielerseitige Datenbankvertrag liefert alle für den Spieler sichtbaren Systempositionen je zugänglicher Kartenebene in stabiler Anzahl und Reihenfolge.
- [ ] Ein entdecktes System liefert Name, Außenkoordinaten, Systemtyp, Entdeckungszeit und eine öffnungsfähige Referenz.
- [ ] Ein unbekanntes System liefert ausschließlich einen strukturell maskierten `???`-Eintrag ohne identifizierende Metadaten oder öffnungsfähige Referenz.
- [ ] Ein Detailabruf prüft serverseitig die persönliche Systementdeckung und verhält sich ohne Berechtigung wie nicht vorhanden.
- [ ] Spielerendpunkte für System- und Rasterinformationen können diese Entdeckungsgrenze nicht umgehen; berechtigte Verwaltungsansichten bleiben funktionsfähig.
- [ ] Die Datenbankoberfläche zeigt die Kategorie Sternensysteme, Ebenenauswahl, entdeckte Einträge und nicht öffnungsfähige `???`-Einträge.
- [ ] Backend- und Frontendtests prüfen Maskierung, persönliche Berechtigung, direkte Zugriffsversuche und die unveränderte strukturelle Reihenfolge.
