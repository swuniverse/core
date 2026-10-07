# 06: End-to-end Beziehungswirkungen verifizieren

**What to build:** Die vollständig integrierte Wirkungsschicht wird über die vorhandenen Spielpfade verifiziert. Änderungen an aktiven Beziehungen wirken dynamisch auf alle implementierten Verbraucher, sichere Fehlerfälle öffnen keine Privilegien, und der bestehende Diplomatie-Kern bleibt unverändert beobachtbar. Nicht vorhandene Verbraucher werden als spätere Integrationspunkte festgehalten.

**Blocked by:** 02: Alarm- und automatische Kampfreaktionen anbinden; 03: Freundbasierte Transfers und Schiffsversorgung; 04: Live-Positionsfreigabe; 05: Weitere vorhandene Zugangs- und Scanpfade anbinden

**Status:** ready-for-agent

**Triage label:** ready-for-agent
**Tracker:** local Markdown issue tracker (`.scratch/alliance-stu-parity/issues/06-end-to-end-beziehungswirkungen.md`)

- [ ] Annahme, Änderung und Beendigung einer aktiven Beziehung wirken ohne manuelle Synchronisierung auf die vorhandenen Verbraucher.
- [ ] Eine ausstehende Beziehung oder Freigabe bleibt ohne Spielwirkung.
- [ ] Sichere Fehlerfälle verhindern Transfer, Versorgung und Live-Positionsfreigabe.
- [ ] Alarm, Kampf, Transfers, Versorgung, Sichtbarkeit und vorhandene Zugangs-/Scanpfade zeigen konsistentes Verhalten.
- [ ] Bestehende öffentliche Diplomatieanzeige und Vertragswerk bleiben unverändert korrekt.
- [ ] Regressionstests bestätigen, dass direkte Angriffe und nicht betroffene Spielregeln unverändert bleiben.
- [ ] Fehlende eigenständige Systeme sind als spätere Integrationspunkte dokumentiert, nicht als neue Umsetzung enthalten.
