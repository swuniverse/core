# 03: Freundbasierte Transfers und Schiffsversorgung

**What to build:** Sensible Transfers und die Versorgung geschützter fremder Schiffe verwenden die zentrale Beziehungsauflösung. Nur Freunde erhalten diese bestehenden Schutz- und Versorgungshandlungen; neutrale und feindliche Parteien werden serverseitig abgewiesen.

**Blocked by:** 01: Zentrale Beziehungsauflösung

**Status:** resolved

**Triage label:** ready-for-agent
**Tracker:** local Markdown issue tracker (`.scratch/alliance-stu-parity/issues/03-freundbasierte-transfers-und-versorgung.md`)

- [x] Sensible Transfers erlauben die bestehende Aktion nur für Freunde.
- [x] Die Versorgung geschützter fremder Schiffe erlaubt die bestehende Aktion nur für Freunde.
- [x] Neutral und Feind werden serverseitig abgewiesen, unabhängig vom Frontend-Zustand.
- [x] Alle betroffenen Transfer- und Versorgungspfade verwenden dieselbe Resolver-Seam.
- [x] Bestehende erlaubte Freund-Flows bleiben funktionsfähig.
- [x] Verhaltenstests decken Freund, Neutral, Feind, Cross-Faction-Feindschaft und sichere Fehlerfälle ab.

## Answer

Schiff-zu-Schiff-Transfers für Fracht, Crew und Torpedos fragen serverseitig die zentrale Beziehungsauflösung ab. Eigene Schiffe bleiben kompatibel; fremde Schiffe benötigen die passende Freundfähigkeit. Ausgehende Fracht-, Crew- und Torpedoversorgung darf bei aktiven Zielschilden ausschließlich über `mayProvisionProtectedShip` erfolgen, während gewöhnliche und eingehende Transfers `mayTransferSafely` verlangen. Neutral, Feind und Auflösungsfehler werden sicher abgewiesen. Der Transfer-Quote-Pfad meldet dieselben Fähigkeiten und physischen Einschränkungen. Verhaltenstests decken Freund, Neutral, Feind/Cross-Faction, geschützte Versorgung und Fail-closed ab.

## Comments

Die Crewversorgung eines geschützten fremden Schiffs wurde im Transferpfad an dieselbe `mayProvisionProtectedShip`-Seam wie Fracht und Torpedos angebunden. Aktive Zielschilde bleiben für befreundete Versorgung erlaubt; alle anderen Transferfälle verlangen weiterhin deaktivierte Schilde. Die neue Verhaltenstest-Seam prüft die erlaubte Freundversorgung.
