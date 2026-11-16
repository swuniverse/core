# Langstreckensprung (Pendant zu STU-Transwarp)

**Status:** resolved
**Priority:** P3
**Size:** M
**Blocked by:** sc-WP-NAV-3, tmw-K5a, tmw-K5b, tmw-K5c

## Ziel

STU erlaubt mit der Transwarpspule einen Sprung zu beliebigen Koordinaten einer bekannten Ebene außerhalb von Systemen. SWU erhält ein Star-Wars-Pendant (Name, Modul und Mechanik wählt der Agent nach Leitplanke 2, passend zum in sc-WP-NAV-3 festgelegten Hyperraummodell, z. B. Sprung entlang Hyperraumrouten). Laut sc-WP-NAV-3 (Option b, 2026-10-21) entfällt der zeitbasierte Hyperraumsprung; Reisen erfolgt feldweise, und dieses Pendant ist der **einzige** Langstreckensprung in SWU. Es ersetzt funktional den bisherigen `warp`, dessen Rückbau ein eigenes Folge-Issue aus sc-WP-NAV-3 übernimmt und dokumentiert es unter „Entscheidungen“ in `map.md`.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Ship/Action/Transwarp/Transwarp.php` (bekannte Ebene, Cooldown, nicht im System, Warpantrieb aktiv, kein Traktor, nicht in Flotte, Ziel passierbar)
- `Component/Spacecraft/System/Type/TranswarpCoilShipSystem.php`, `html/spacecraft/system/TRANSWARP_COIL.twig`
- `Module/Spacecraft/Lib/Movement/Component/Consequence/PostFlight/DeactivateTranswarpConsequence.php`

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/spacecraft.service.ts` (`warp`, `flyGalaxy`)
- `apps/backend/src/modules/starmap/entities/hyperspace-route.entity.ts`, `hyperspace-route-segment.entity.ts`
- `packages/shared/src/lib/spacecraft/index.ts`, `spacecraft-runtime-state.service.ts`
- `game-data/data/modules/special.yaml` (Submodul)
- `apps/frontend/src/components/spacecraft/NavigationPanel.tsx`

## Akzeptanzkriterien

- [x] Modul `Hyperraum-Spule`, Laufzeitsystem und Aktion `Navicomputer-Sprung` existieren; ohne intakte Spule ist die Aktion nicht verfügbar.
- [x] Ziel ist jede existierende passierbare freie X/Y-Koordinate auf einer nach K5 bekannten Ebene; es gibt weder Routenpflicht noch Distanzkosten. Der Sprung ist unmittelbar und kein zeitbasierter Flug.
- [x] Der Sprung wird vom Flottenführer für die gesamte nicht fixierte Flotte angefordert. Alle Mitglieder werden vollständig vorvalidiert: kopräsent außerhalb eines Systems, intakte Hyperraum-Spule, funktionsfähiger aktiver Hyperantrieb, kein Traktor, ausreichende 55 EPS und kein aktiver Cooldown. Fehlt eine Voraussetzung, wird der gesamte Sprung atomar abgelehnt; Mitglieder werden nicht abgetrennt.
- [x] Jedes Flottenmitglied bezahlt genau 55 EPS, verbraucht keine Hyperantriebspunkte und erhält einen Cooldown von 300 Sekunden.
- [x] Erfolgreicher Sprung setzt alle Flottenpositionen atomar und erzeugt je Schiff Ausgangs- und Zielsprungsignaturen ohne erfundene kardinale Flugrichtung.
- [x] Backend-Tests für Erfolg und jede Ablehnung; Frontend-Test für Zielwahl.
- [x] `lint`, `typecheck`, `test` und `build` sind grün.

## Entscheidung

Die `Hyperraum-Spule` ermöglicht den unmittelbaren `Navicomputer-Sprung` zu jeder passierbaren Koordinate einer bekannten Ebene, ohne Routenpflicht oder distanzabhängige Hyperantriebspunkte. SWU integriert die bestehende Flottendomäne: Der Flottenführer springt die gesamte nicht fixierte Flotte nach vollständiger atomarer Vorvalidierung. Jedes Schiff benötigt eigene Spule, aktiven funktionsfähigen Hyperantrieb und 55 EPS und erhält 300 Sekunden Cooldown. Ein ungültiges Mitglied lehnt den gesamten Sprung ab.

## Comments

- 2026-10-29: Die STU-Mechanik verlangt einen Sprung in jede bekannte Ebene. SWU besitzt zwar persistente Ebenenkenntnis, aber das Issue legt die produktentscheidende Kostenregel des sofortigen Sprungs nicht fest: STU berechnet nur 55 EPS Aktivierungskosten, während das Akzeptanzkriterium zusätzlich allgemein „Kosten“ fordert. Soll der **Navicomputer-Sprung** (vorgeschlagener Star-Wars-Name) exakt 55 EPS kosten, oder sollen zusätzlich Hyperantriebspunkte abhängig von der Sprungdistanz verbraucht werden? Ohne diese Entscheidung wären Balance, UI-Kostenvorschau und Backend-Tests spekulativ.
- 2026-10-30 Product Owner: Option 2. `Hyperraum-Spule` und Aktion `Navicomputer-Sprung`; freie passierbare Koordinate auf jeder bekannten Ebene, 55 EPS pro Schiff, 300 Sekunden Cooldown, keine Hyperantriebspunkte und keine Routenpflicht. Der Flottenführer springt die gesamte nicht fixierte Flotte. Jedes Mitglied muss kopräsent, ausgerüstet, sprungfähig und ausreichend versorgt sein; andernfalls wird der Sprung atomar abgelehnt, ohne Mitglieder abzutrennen. Ebenenkenntnis aus K5a–c ist Implementierungsvoraussetzung.


## Answer

Umgesetzt auf `stu-parity`: `Hyperraum-Spule` mit eigenem `HYPERSPACE_COIL`-Laufzeitsystem, Spielerware 19070 und Herstellungsrezept für beide Fraktionen nach „Antriebsmodule Stufe III“. Die Spule benötigt keine laufenden EPS und wird durch die Aktion verwendet.

`POST /spacecraft/:id/navicomputer-jump` validiert die vollständige Flotte unter Flotten-, Schiffs- und Modulsperren. Nur der Führer einer nicht fixierten Flotte darf springen; Solo-Schiffe können ebenfalls springen. Fehlende Spule, inaktive/defekte Antriebe, abweichende Positionen, Systemaufenthalt, Traktorbindungen, fehlende Besatzung, Standby, nicht flugbereiter Status, Orbitauftrag, EPS-Mangel und Cooldowns lehnen vollständig ab. Ziele müssen existieren, passierbar und auf einer persönlich bekannten, nicht verborgenen Ebene liegen; Passierbarkeits-Overrides werden berücksichtigt. Ein Galaxiefeld vor einem Sternsystem ist ein gültiges Ziel, der Sprung tritt nicht in das System ein.

Positionen, genau 55 EPS je Schiff, inaktive Spulen mit 300-Sekunden-Zeitstempel und je zwei richtungslose Signatursnapshots werden in derselben Datenbanktransaktion gespeichert. Keine Routenpflicht, Distanzkosten oder Hyperantriebspunkt-Kosten. Der feste Preis ersetzt die Deflektor-Fluggebühr; Zielschäden und weitere Feldeffekte (einschließlich Ressourcenlecks) gelten weiterhin. Reparatur-/Übernahmeabbrüche, Kartographie-Finalisierungsreset, Erkundung und Schiffslog sind integriert; Benachrichtigungen werden erst nach erfolgreichem Commit ausgelöst.

Die Navigation zeigt für eine intakte Spule eine Auswahl der persönlich bekannten Ebenen sowie X/Y-Felder, Kosten, Fehler und laufende Abkühlzeit. Nach Erfolg werden Schiff und lokale Karte neu geladen. ADR-0006 dokumentiert die Ausnahme zum feldweisen Galaxieflug.

## Validation

- `nx affected -t lint typecheck test --base=HEAD --parallel=2`: grün; Backend 234 Suites / 2266 Tests, Frontend 114 Dateien / 811 Tests; Lint ohne Fehler (bestehende Warnungen).
- `nx run backend:test-integration --runInBand --testPathPatterns=navicomputer-jump`: 29 Tests grün mit echten PostgreSQL-Migrationen. Vollständiger Flottensprung und Solo-Sprung, jede Ablehnung ohne Teilspeicherung/Abtrennung, persistenter Cooldown, NOWAIT bei parallelem Mitgliedsschreiber, echte richtungslose Signaturen sowie Rollback bei Signatur- und Feldeffektfehlern ohne Benachrichtigungen.
- `nx run-many --targets=build`: alle drei Builds grün.
- Modul, Rezept, Ware und Forschungsnamen/-IDs beider Fraktionen auf Konsistenz geprüft.
- Zusätzlicher `game-data`-Validator: Moduldateien gültig; 14 bereits bestehende fehlende Stations-Rumpfwerte in `ship-building`. Identische Fehler auf dem unveränderten Submodulstand 8180a0b nachgewiesen; keine durch dieses Ticket eingeführten Validierungsfehler.
