# 02: Alarm- und automatische Kampfreaktionen anbinden

**What to build:** Alarm- und automatische Kampfreaktionen verwenden die zentrale Beziehungsauflösung. Feinde lösen Alarm Gelb und die bestehenden automatischen Kampfreaktionen aus, Alarm Rot reagiert auf alle Nicht-Freunde, und Freunde lösen keine automatische Gegenreaktion aus. Bewusste direkte Angriffe behalten ihre bestehenden Regeln.

**Blocked by:** 01: Zentrale Beziehungsauflösung

**Status:** resolved

**Triage label:** ready-for-agent
**Tracker:** local Markdown issue tracker (`.scratch/alliance-stu-parity/issues/02-alarm-und-kampfreaktionen.md`)

- [ ] Alarm Gelb reagiert auf Feinde gemäß der zentralen Auflösung.
- [ ] Alarm Rot reagiert auf alle Nicht-Freunde gemäß der zentralen Auflösung.
- [ ] Freunde lösen keine automatische Gegenreaktion aus.
- [ ] Bestehende automatische Kampfreaktionen verwenden keinen eigenen Freund-/Feind-Resolver mehr.
- [ ] Bewusste direkte Angriffe bleiben unverändert möglich, soweit die bestehenden Regeln sie erlauben.
- [ ] Verhaltenstests decken Freund, Feind, Neutral, Cross-Faction-Feindschaft und aktive Beziehungsfreigaben ab.

## Answer

Im aktuellen SWU-Code existiert keine alarmgesteuerte automatische Kampfreaktion, an die die zentrale Beziehungsauflösung angebunden werden könnte. Alarmstufen konfigurieren Schiffssysteme; Feldbewegung, Tick-Verarbeitung und Nahbereichskontakte starten keinen Kampf. Der vorhandene Gegenbeschuss in `CombatEngine.resolveCombat` gehört ausschließlich zum bewusst ausgelösten direkten Angriff und bleibt deshalb gemäß Spezifikation unverändert.

Der bereits benannte künftige Integrationspunkt ist `T-029 Add alert-driven combat trigger service` in `docs/stu-target-architecture-and-tickets.md`: Dieser Dienst muss beim Feld-Eintritt für Alarm Gelb `mayReactAutomatically` (nur Feinde) und für Alarm Rot `!isFriend` (alle Nicht-Freunde) aus der zentralen `RelationshipResolverService` auswerten. Freunde dürfen dabei keine automatische Reaktion auslösen. Sobald T-029 implementiert wird, sind dort Verhaltenstests für Freund, Feind, Neutral, Cross-Faction-Feindschaft und aktive „Als Freund behandeln“-Freigaben zu ergänzen.

Die Implementierungs-Checkboxen bleiben absichtlich offen: Das Etappenprinzip und die Spezifikation verbieten, ein in SWU fehlendes eigenständiges Spielsystem allein als Träger der Allianzregel neu zu bauen.
