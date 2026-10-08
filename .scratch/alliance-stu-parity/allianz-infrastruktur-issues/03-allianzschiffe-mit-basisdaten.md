# 03: Allianzschiffe mit Basisdaten

**What to build:** Bei aktivierter Allianz-Infrastruktur-Fähigkeit sieht jedes Allianzmitglied auf der Sternenkarte alle Schiffe aller aktuellen Mitglieder seiner Allianz mit Basisdaten, unabhängig von der eigenen Sensorreichweite. Marker tragen die Allianzfarbe und zeigen die Haltung nicht nur farblich.

**Blocked by:** 01: Eigene Schiffe auf der Sternenkarte (Tracer Bullet)

**Status:** resolved

**Triage label:** ready-for-agent
**Tracker:** local Markdown issue tracker (`.scratch/alliance-stu-parity/allianz-infrastruktur-issues/03-allianzschiffe-mit-basisdaten.md`)
**Spec:** `.scratch/alliance-stu-parity/allianz-infrastruktur-spec.md`

- [x] Die zentrale Beziehungsauflösung erhält eine Fähigkeit für die Allianz-Kartensicht, die ausschließlich für aktuelle Mitglieder derselben Allianz erteilt wird, analog zu `mayShareHistoricalScans`. Der Sichtbarkeitsdienst prüft die Mitgliedschaft nicht selbst.
- [x] Die Haltung aller Besitzer wird pro Anfrage gebündelt über die zentrale Auflösung ermittelt, nicht je Schiff und nicht lokal rekonstruiert.
- [x] Allianzkontakte tragen Grund `ALLIANCE`, Haltung, Allianzreferenz mit ID, Name und Farbe sowie nur Basisdaten (Schiff, Klasse, Besitzer, Position).
- [x] Eigene Schiffe behalten Grund `OWN`; kein Schiff erscheint doppelt.
- [x] Bei deaktivierter Fähigkeit liefert die Route nur eigene Schiffe; aktiviert meldet das Flag aktiv.
- [x] Beitritt, Austritt, Rauswurf und Auflösung wirken mit der nächsten Anfrage ohne Bereinigungsschritt; es werden keine Sichtbarkeitsrechte persistiert.
- [x] Ein Resolverfehler oder fehlende Parteien liefern nur eigene Schiffe.
- [x] Spieler der anderen Fraktion und allianzlose Spieler erscheinen nie als Allianzkontakt.
- [x] Allianzmarker verwenden die Allianzfarbe oder, ohne gesetzte Farbe, eine einheitliche Standardfarbe; die Haltung ist zusätzlich per Symbol oder Beschriftung erkennbar.
- [x] Das Kontrollpanel zeigt einen Schalter für Allianzschiffe nur, wenn der Server Allianz- und Partnerkontakte als aktiv meldet.
- [x] Fremde Kontakte bieten im Auswahlpanel keine Steuerungs-, Scan- oder Kampfaktionen.
- [x] Resolver- und Dienst-Verhaltenstests sowie Seitentests decken Mitglied, allianzlosen Spieler, Mitgliedswechsel, Auflösung, Fraktionsgrenze, Fehlerfall, Farbe, Standardfarbe, Haltungskennzeichnung und Schalter ab.

## Answer

- Capability: `ResolvedStance.mayShareAllianceMap` in `RelationshipResolverService` (same-alliance FRIEND only, like `mayShareHistoricalScans`). `allianceMapCandidates(viewerId)` returns `{ alliance: {id,name,color} | null, mateIds }` from current membership. It never throws and returns no candidates on failure.
- `StarmapVisibilityService.visibilityByOwner` (replaces `contactReasonsByOwner`) assigns one `OwnerVisibility { reason, stance?, alliance? }` per owner: OWN first, then ALLIANCE through a single `resolveMany` over the candidates. This only runs while `ALLIANCE_INFRASTRUCTURE_ENABLED` is on. `toContact` copies stance and alliance; management details are still OWN-only.
- Frontend: alliance markers use `alliance.color` or `DEFAULT_ALLIANCE_SHIP_COLOR` (`#a78bfa`). The stance is shown as a symbol (`+`/`○`/`×`), as `data-stance` and in the marker label (`Schiff X bei 8|9 (Allianzschiff, Freund)`). The control panel shows an `Allianzschiffe` switch only when `allianceContactsActive` is true. The panel gives foreign contacts no link or actions.
- Tests: resolver spec ("alliance map"), service spec ("alliance ships": member, unaffiliated, join/leave/kick, dissolution, faction border, failures, colour null, capability off), page spec ("alliance ships").
