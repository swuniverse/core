# 02: Alarm- und automatische Kampfreaktionen anbinden

**What to build:** Alarm- und automatische Kampfreaktionen verwenden die zentrale Beziehungsauflösung. Feinde lösen Alarm Gelb und die bestehenden automatischen Kampfreaktionen aus, Alarm Rot reagiert auf alle Nicht-Freunde, und Freunde lösen keine automatische Gegenreaktion aus. Bewusste direkte Angriffe behalten ihre bestehenden Regeln.

**Blocked by:** 01: Zentrale Beziehungsauflösung

**Status:** ready-for-agent

**Triage label:** ready-for-agent
**Tracker:** local Markdown issue tracker (`.scratch/alliance-stu-parity/issues/02-alarm-und-kampfreaktionen.md`)

- [ ] Alarm Gelb reagiert auf Feinde gemäß der zentralen Auflösung.
- [ ] Alarm Rot reagiert auf alle Nicht-Freunde gemäß der zentralen Auflösung.
- [ ] Freunde lösen keine automatische Gegenreaktion aus.
- [ ] Bestehende automatische Kampfreaktionen verwenden keinen eigenen Freund-/Feind-Resolver mehr.
- [ ] Bewusste direkte Angriffe bleiben unverändert möglich, soweit die bestehenden Regeln sie erlauben.
- [ ] Verhaltenstests decken Freund, Feind, Neutral, Cross-Faction-Feindschaft und aktive Beziehungsfreigaben ab.
