# 03: Freundbasierte Transfers und Schiffsversorgung

**What to build:** Sensible Transfers und die Versorgung geschützter fremder Schiffe verwenden die zentrale Beziehungsauflösung. Nur Freunde erhalten diese bestehenden Schutz- und Versorgungshandlungen; neutrale und feindliche Parteien werden serverseitig abgewiesen.

**Blocked by:** 01: Zentrale Beziehungsauflösung

**Status:** ready-for-agent

**Triage label:** ready-for-agent
**Tracker:** local Markdown issue tracker (`.scratch/alliance-stu-parity/issues/03-freundbasierte-transfers-und-versorgung.md`)

- [ ] Sensible Transfers erlauben die bestehende Aktion nur für Freunde.
- [ ] Die Versorgung geschützter fremder Schiffe erlaubt die bestehende Aktion nur für Freunde.
- [ ] Neutral und Feind werden serverseitig abgewiesen, unabhängig vom Frontend-Zustand.
- [ ] Alle betroffenen Transfer- und Versorgungspfade verwenden dieselbe Resolver-Seam.
- [ ] Bestehende erlaubte Freund-Flows bleiben funktionsfähig.
- [ ] Verhaltenstests decken Freund, Neutral, Feind, Cross-Faction-Feindschaft und sichere Fehlerfälle ab.
