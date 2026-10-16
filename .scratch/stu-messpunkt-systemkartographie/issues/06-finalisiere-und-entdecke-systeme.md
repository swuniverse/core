# 06: Finalisiere Kartographie und entdecke Systeme

**What to build:** Nach allen Messpunkten startet ein einziges qualifiziertes Schiff die kostenpflichtige Drei-Tick-Finalisierung. Ihr Erfolg erzeugt idempotent die persönliche Systementdeckung; Unterbrechungen behalten den Plan als `MEASURED`.

**Blocked by:** 02: Ersetze das alte Astrometrie-Datenmodell; 03: Implementiere das Astrometrie-Labor; 05: Integriere Messpunkte in die Bewegung.

Status: resolved

**Closure:** Implemented in `68c29872143dbc6cab6700a4894086f196c63c07` (`feat(cartography): finalize system discovery`).

- [ ] Nur `MEASURED`-Pläne können finalisiert werden; exakt ein qualifiziertes, nicht reparierendes, sonst untätiges Schiff kann dies gleichzeitig tun.
- [ ] Start verlangt 15 EPS, zieht sie einmalig ab und speichert das finalisierende Schiff sowie einen Drei-Haupttick-Countdown atomar.
- [ ] Während `FINISHING` ist nur dieses Schiff für Navigation und Reparaturen gesperrt; andere Schiffe bleiben handlungsfähig.
- [ ] Flug, Zerstörung, Tarnung, Labor-/Sensorverlust, Bereitschaft, Brownout und andere unvereinbare Schiffsaktionen setzen den Plan auf `MEASURED` zurück. Es gibt keine Erstattung und keinen Messpunktverlust.
- [ ] Nach drei gültigen Hauptticks wird `DONE` erreicht, die Systementdeckung idempotent geschrieben und 10 Prestige atomar vergeben.
- [ ] Ein zwischenzeitlich extern entdecktes System beendet offene Pläne ohne zweite Belohnung.
- [ ] Der Abschluss/Abbruch erzeugt verständliche In-Game-Mitteilungen.
- [ ] Service-, Tick-, Integrations- und Regressionsspecs prüfen Exklusivität, Abbruch, Wiederaufnahme durch anderes Schiff, Navigation/Reparatur und doppelte Tickverarbeitung.
