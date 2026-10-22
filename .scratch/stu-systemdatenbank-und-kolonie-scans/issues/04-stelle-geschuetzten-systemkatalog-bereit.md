# 04: Stelle einen geschützten Systemkatalog bereit

**What to build:** Spieler finden in der Datenbank je zugänglicher Kartenebene einen Sternensystemkatalog: persönlich entdeckte Systeme zeigen ihre erlaubten Metadaten, unbekannte Positionen bleiben als `???` erhalten. Weder die Oberfläche noch direkte Spieler-APIs können Details nicht entdeckter Systeme preisgeben.

**Blocked by:** 02: Entkopple Systembetreten von Datenbankentdeckung.

**Status:** resolved

- [x] Der spielerseitige Datenbankvertrag liefert alle für den Spieler sichtbaren Systempositionen je zugänglicher Kartenebene in stabiler Anzahl und Reihenfolge.
- [x] Ein entdecktes System liefert Name, Außenkoordinaten, Systemtyp, Entdeckungszeit und eine öffnungsfähige Referenz.
- [x] Ein unbekanntes System liefert ausschließlich einen strukturell maskierten `???`-Eintrag ohne identifizierende Metadaten oder öffnungsfähige Referenz.
- [x] Ein Detailabruf prüft serverseitig die persönliche Systementdeckung und verhält sich ohne Berechtigung wie nicht vorhanden.
- [x] Spielerendpunkte für System- und Rasterinformationen können diese Entdeckungsgrenze nicht umgehen; berechtigte Verwaltungsansichten bleiben funktionsfähig.
- [x] Die Datenbankoberfläche zeigt die Kategorie Sternensysteme, Ebenenauswahl, entdeckte Einträge und nicht öffnungsfähige `???`-Einträge.
- [x] Backend- und Frontendtests prüfen Maskierung, persönliche Berechtigung, direkte Zugriffsversuche und die unveränderte strukturelle Reihenfolge.

## Comments

Audit: Alle Akzeptanzkriterien sind erfüllt. Umsetzung: `database.service.ts`, `database.controller.ts`, `starmap.controller.ts`, `starmap.service.ts`, `apps/frontend/src/pages/database.tsx`; Tests: `database-system-catalog.service.spec.ts`, `starmap.controller.spec.ts`, `database.spec.tsx`; maßgebliche Commits: `4f2d361`, `21c1b6e`, `b496498`, `d118865`.
