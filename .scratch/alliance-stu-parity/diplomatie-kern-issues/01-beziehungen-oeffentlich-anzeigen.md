# 01: Beziehungen öffentlich anzeigen

**What to build:** Spieler sehen auf jeder Allianzseite deren aktive Beziehungen mit Gegenpartei, Beziehungstyp, Beginn, Richtung einer Vasallenschaft, vereinbarten Beziehungsfreigaben und öffentlichem Vertragswerk. Das zugrunde liegende Parteien- und Beziehungsmodell ist bereits für spätere Siedler-Abkommen erweiterbar, exponiert in dieser Etappe aber nur Allianz-zu-Allianz-Beziehungen.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Die sechs Beziehungstypen Krieg, Frieden, Freundschaft, Bündnis, Handelsabkommen und Vasallenschaft sind gemeinsame Domänenwerte; nur Vasallenschaft wird mit Lehnsherr und Vasall gerichtet dargestellt.
- [ ] Das persistierte Parteienmodell kann genau eine Allianz oder später genau einen allianzlosen Spieler referenzieren, ohne in dieser Etappe Spielerbeziehungen über API oder UI anzubieten.
- [ ] Ein kanonisches, ungeordnetes Allianzenpaar kann durch Datenbank-Constraints höchstens eine aktive Beziehung besitzen; Selbstbeziehungen und Beziehungen zwischen verschiedenen Fraktionen sind ausgeschlossen.
- [ ] Die Migration ist rückwärtskompatibel, lässt vorhandene Allianzen unverändert und kann vollständig zurückgerollt werden.
- [ ] Öffentliche Allianzdetails liefern nur aktive Beziehungen mit stabiler ID, Gegenallianz, Typ, Beginn, aktiven Freigaben, Vasallenschaftsrichtung und Hinweis auf ein vorhandenes Vertragswerk.
- [ ] Ein öffentlicher, direkt adressierbarer Vertragswerk-Abruf ist nur für aktive Beziehungen möglich und liefert sicher renderbaren BBCode; nicht vorhandene oder nicht öffentliche Inhalte ergeben einen fachlichen Fehler.
- [ ] Vertragswerke werden nach Trim auf höchstens 20.000 Unicode-Zeichen begrenzt; Krieg besitzt immer ein leeres Vertragswerk.
- [ ] Die Allianzseite zeigt aktive Beziehungen und das öffentliche Vertragswerk verständlich an; ein Allianzmitglied erhält dabei keine zusätzlichen vertraulichen Daten.
- [ ] Gespeicherte Beziehungsfreigaben lösen noch keine Wirkungen in Kampf, Karte, Scans, Transfer oder Zugang aus.
- [ ] Service-, Migrations-, PostgreSQL- und Frontendtests decken öffentliche Sichtbarkeit, Fraktionsgrenze, Vasallenschaftsrichtung, Vertragsvalidierung und die Einzigkeit der aktiven Beziehung ab.

## Answer

Bereits implementiert in ccac081 feat(alliance): expose public relationships.
