# 04: Plane Systemkartographie und Messpunkte

**What to build:** Ein qualifiziertes Schiff kann für ein persönlich noch nicht entdecktes System einen persönlichen Kartographieplan anlegen. Dieser erzeugt die STU-nahe Messpunktroute und stellt einen sicheren, lesbaren Statusvertrag bereit.

**Blocked by:** 02: Ersetze das alte Astrometrie-Datenmodell; 03: Implementiere das Astrometrie-Labor.

Status: resolved

> Closed by implementation commit `d632711caecc5a65bad5c6fe10e0dbb4eab28279`.

- [ ] Planen setzt ein qualifiziertes Schiff im aktuellen Sternensystem, aktive/intakte Labor-/SRS-/LRS-Voraussetzungen und ausreichende Crew voraus.
- [ ] Bereits persönlich entdeckte Systeme erlauben keinen Plan; bestehende Pläne werden unverändert zurückgegeben und nicht neu gewürfelt.
- [ ] Ein neuer Plan setzt die LRS-Ansicht auf `CARTOGRAPHY`, ohne Sensoren implizit zu aktivieren.
- [ ] Es entstehen bis zu fünf eindeutige Messpunkte: höchstens zwei besiedelte Felder, dann kolonialisierbare Felder, dann sichere Zufallsfelder.
- [ ] Das aktuelle Startfeld ist in sämtlichen Auswahlstufen ausgeschlossen.
- [ ] Weniger Punkte sind erlaubt; kein Punkt führt direkt zu `MEASURED`.
- [ ] Der serverseitige Statusvertrag ist für jedes eigene Schiff im gleichen System lesbar und trennt Lesezugriff von ausführbaren Aktionen.
- [ ] Tests prüfen Priorisierung, Startfeldausschluss, Wiederholung/Parallelität, kleine Systeme und die Berechtigungsgrenze.
