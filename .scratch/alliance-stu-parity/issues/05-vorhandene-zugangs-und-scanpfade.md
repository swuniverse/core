# 05: Weitere vorhandene Zugangs- und Scanpfade anbinden

**What to build:** Jeder im aktuellen Spiel vorhandene Docking-, Wurmloch-, Handelsposten- oder Scanpfad, der Freund, Feind oder Neutral benötigt, verwendet die zentrale Beziehungsauflösung. Fehlende eigenständige Spielsysteme werden nicht neu gebaut, sondern als spätere Integrationspunkte dokumentiert.

**Blocked by:** 01: Zentrale Beziehungsauflösung

**Status:** ready-for-agent

**Triage label:** ready-for-agent
**Tracker:** local Markdown issue tracker (`.scratch/alliance-stu-parity/issues/05-vorhandene-zugangs-und-scanpfade.md`)

- [ ] Jeder vorhandene betroffene Zugangs- oder Scanpfad verwendet die zentrale Resolver-Seam.
- [ ] Kein Verbraucher rekonstruiert Freund, Feind oder Neutral lokal.
- [ ] Serverseitige Prüfungen verhindern Zugriff allein durch UI-Manipulation.
- [ ] Eine Beziehung schaltet nicht ungefragt jeden Zugang frei; bestehende explizite Privilegien bleiben erforderlich.
- [ ] Fehlende eigenständige Systeme werden nicht als neue Allianzfunktion gebaut.
- [ ] Vorhandene Verbraucher erhalten Verhaltenstests für Freund, Neutral, Feind und sichere Fehlerfälle.
