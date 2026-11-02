# Langstreckensprung (Pendant zu STU-Transwarp)

**Status:** ready-for-agent
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

- [ ] Modul `Hyperraum-Spule`, Laufzeitsystem und Aktion `Navicomputer-Sprung` existieren; ohne intakte Spule ist die Aktion nicht verfügbar.
- [ ] Ziel ist jede existierende passierbare freie X/Y-Koordinate auf einer nach K5 bekannten Ebene; es gibt weder Routenpflicht noch Distanzkosten. Der Sprung ist unmittelbar und kein zeitbasierter Flug.
- [ ] Der Sprung wird vom Flottenführer für die gesamte nicht fixierte Flotte angefordert. Alle Mitglieder werden vollständig vorvalidiert: kopräsent außerhalb eines Systems, intakte Hyperraum-Spule, funktionsfähiger aktiver Hyperantrieb, kein Traktor, ausreichende 55 EPS und kein aktiver Cooldown. Fehlt eine Voraussetzung, wird der gesamte Sprung atomar abgelehnt; Mitglieder werden nicht abgetrennt.
- [ ] Jedes Flottenmitglied bezahlt genau 55 EPS, verbraucht keine Hyperantriebspunkte und erhält einen Cooldown von 300 Sekunden.
- [ ] Erfolgreicher Sprung setzt alle Flottenpositionen atomar und erzeugt je Schiff Ausgangs- und Zielsprungsignaturen ohne erfundene kardinale Flugrichtung.
- [ ] Backend-Tests für Erfolg und jede Ablehnung; Frontend-Test für Zielwahl.
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Entscheidung

Die `Hyperraum-Spule` ermöglicht den unmittelbaren `Navicomputer-Sprung` zu jeder passierbaren Koordinate einer bekannten Ebene, ohne Routenpflicht oder distanzabhängige Hyperantriebspunkte. SWU integriert die bestehende Flottendomäne: Der Flottenführer springt die gesamte nicht fixierte Flotte nach vollständiger atomarer Vorvalidierung. Jedes Schiff benötigt eigene Spule, aktiven funktionsfähigen Hyperantrieb und 55 EPS und erhält 300 Sekunden Cooldown. Ein ungültiges Mitglied lehnt den gesamten Sprung ab.

## Comments

- 2026-10-29: Die STU-Mechanik verlangt einen Sprung in jede bekannte Ebene. SWU besitzt zwar persistente Ebenenkenntnis, aber das Issue legt die produktentscheidende Kostenregel des sofortigen Sprungs nicht fest: STU berechnet nur 55 EPS Aktivierungskosten, während das Akzeptanzkriterium zusätzlich allgemein „Kosten“ fordert. Soll der **Navicomputer-Sprung** (vorgeschlagener Star-Wars-Name) exakt 55 EPS kosten, oder sollen zusätzlich Hyperantriebspunkte abhängig von der Sprungdistanz verbraucht werden? Ohne diese Entscheidung wären Balance, UI-Kostenvorschau und Backend-Tests spekulativ.
- 2026-10-30 Product Owner: Option 2. `Hyperraum-Spule` und Aktion `Navicomputer-Sprung`; freie passierbare Koordinate auf jeder bekannten Ebene, 55 EPS pro Schiff, 300 Sekunden Cooldown, keine Hyperantriebspunkte und keine Routenpflicht. Der Flottenführer springt die gesamte nicht fixierte Flotte. Jedes Mitglied muss kopräsent, ausgerüstet, sprungfähig und ausreichend versorgt sein; andernfalls wird der Sprung atomar abgelehnt, ohne Mitglieder abzutrennen. Ebenenkenntnis aus K5a–c ist Implementierungsvoraussetzung.
