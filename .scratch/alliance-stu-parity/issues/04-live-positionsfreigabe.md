# 04: Live-Positionsfreigabe

**What to build:** Die aktive Beziehungsfreigabe „Live-Kartenpositionen teilen“ wird an den vorhandenen Sichtbarkeitspfad angebunden. Berechtigte Live-Positionen werden sichtbar; ausstehende, ungültige oder beendete Freigaben sowie Cross-Faction-Parteien erhalten keinen Zugriff. Die Freigabe aktiviert keine gemeinsame Scanberechtigung.

**Blocked by:** 01: Zentrale Beziehungsauflösung

**Status:** ready-for-agent

**Triage label:** ready-for-agent
**Tracker:** local Markdown issue tracker (`.scratch/alliance-stu-parity/issues/04-live-positionsfreigabe.md`)

- [ ] Eine aktive gültige Freigabe macht die vorgesehenen Live-Positionen sichtbar.
- [ ] Ausstehende, ungültige oder beendete Freigaben machen keine Positionen sichtbar.
- [ ] Cross-Faction-Parteien erhalten keine Positionsteilung.
- [ ] Die Freigabe wird serverseitig geprüft und nicht nur durch die UI gesteuert.
- [ ] Live-Positionsfreigabe aktiviert nicht automatisch gemeinsame Scans.
- [ ] Verhaltenstests decken fehlende, aktive, ausstehende und beendete Freigaben ab.
