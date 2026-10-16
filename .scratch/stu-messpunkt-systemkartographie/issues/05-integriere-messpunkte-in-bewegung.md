# 05: Integriere Messpunkte in die Bewegung

**What to build:** Messpunkte werden beim tatsächlichen Anflug durch qualifizierte eigene Schiffe atomar abgebaut. Der Fortschritt bleibt benutzer-/systemgebunden, belohnt den Weg und übersteht Pausen oder Schiffswechsel.

**Blocked by:** 03: Implementiere das Astrometrie-Labor; 04: Plane Systemkartographie und Messpunkte.

**Status:** ready-for-agent

- [ ] Der postbewegliche In-System-Navigationspfad prüft den Plan des Spielers und verarbeitet genau den erreichten verbleibenden Feldpunkt.
- [ ] Nur ein eigenes Schiff mit aktivem/intaktem Labor, SRS und LRS darf einen Punkt zählen; Bewegung bleibt ansonsten erlaubt.
- [ ] Jeder Punkt wird atomar einmal entfernt, gibt 1 Prestige und erzeugt eine In-Game-Mitteilung.
- [ ] Nach dem letzten Punkt wechselt der Plan idempotent auf `MEASURED` und informiert den Spieler.
- [ ] Mehrere passende eigene Schiffe können denselben Plan fortschreiben, ohne doppelte Punkte oder Prestige zu erzeugen.
- [ ] Deaktiviertes Labor/Sensoren pausieren nur die Zählung; Fortschritt bleibt nach Reaktivierung erhalten.
- [ ] Besitzerwechsel ändern gespeicherte Ziele nicht. Verschwundene Einzelziele werden entfernt; verbleiben keine ursprünglich offenen gültigen Ziele, endet der Plan ohne Belohnung.
- [ ] Der bisherige Navigationspfad darf keine persönliche Systementdeckung mehr direkt erzeugen.
- [ ] Tests decken Anflug, Mehrschiff-Rennen, Prestige-/Nachrichtenidempotenz, Pause, Weltänderungen und fehlende Entdeckung durch Navigation ab.
