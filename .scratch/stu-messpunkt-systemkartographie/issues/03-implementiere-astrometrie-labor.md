# 03: Implementiere das Astrometrie-Labor

**What to build:** Das konkrete Spezialmodul Astrometrie-Labor wird als aktivierbares Runtime-System mit STU-Voraussetzungen und -Energiekosten behandelt. Es ist die einzige Fähigkeit, die Kartographie ausführen kann.

**Blocked by:** 01: Dokumentiere die Messpunkt-Kartographieentscheidung; 02: Ersetze das alte Astrometrie-Datenmodell.

**Status:** resolved

> Closed by implementation commit `5a86fa9af3680ffef512b2fc42c511e801d0e411`.

- [ ] Ausschließlich das vorhandene konkrete Spiel-Datenmodul `Astrometrie-Labor` aktiviert die Fähigkeit; die bestehende Slot-/Schiffskompatibilität bleibt maßgeblich.
- [ ] Aktivieren kostet 1 EPS und verlangt kein Tarnfeld sowie aktive/intakte Kurz- und Langstreckensensoren.
- [ ] Das Labor verbraucht aktiv 1 EPS pro Haupttick – auch ohne Plan oder außerhalb eines Systems – und nutzt die bestehende Brownout-/Deaktivierungslogik.
- [ ] Tarnung deaktiviert das Labor; Sensor-/Laborverlust, Zerstörung und Brownout deaktivieren es ebenfalls.
- [ ] Deaktivierung einer laufenden Finalisierung setzt sie fachlich auf `MEASURED` zurück, ohne Messpunkte oder Kosten zurückzusetzen.
- [ ] Das Labor bleibt bei Systemwechsel und erfolgreicher Entdeckung aktiv, sofern keine bestehende Systemregel es deaktiviert.
- [ ] Backendtests decken konkrete Modulidentität, Voraussetzungen, Kosten, Tarnung, Sensorverlust und Brownout ab.
