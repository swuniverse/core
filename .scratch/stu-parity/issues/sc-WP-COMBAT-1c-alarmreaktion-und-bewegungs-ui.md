# Alarmreaktion und Bewegungs-UI

**Status:** ready-for-agent
**Priority:** P2
**Size:** M
**Blocked by:** sc-WP-COMBAT-1a, sc-WP-COMBAT-1b, sc-WP-CLOAK-1a

## Ziel

Eine neutrale Orchestrierung implementiert die STU-Alarmkandidatenregel über den Bewegungs-Reaktionsport, startet höchstens einen deterministischen automatischen Kampf und liefert dessen Bericht über `MovementResult` an alle betroffenen Bewegungsoberflächen.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Spacecraft/Lib/Battle/AlertDetection/{AlertDetection,AlertedShipsDetection,SkipDetection,AlertReactionFacade}.php`
- `Module/Spacecraft/Lib/Battle/AlertLevelBasedReaction.php`
- `Module/Spacecraft/Action/InterceptShip`

## SWU-Pfade

- Reaktionsport und `MovementResult` aus `sc-WP-COMBAT-1a`
- interner Resolver aus `sc-WP-COMBAT-1b`
- `apps/backend/src/modules/alliance/relationship-resolver.service.ts`
- Cloak-Sichtbarkeit aus `sc-WP-CLOAK-1a`
- `apps/frontend/src/components/spacecraft/NavigationPanel.tsx`
- `apps/frontend/src/components/spacecraft/CombatReportDialog.tsx`

## Akzeptanzkriterien

- [ ] Nach jeder tatsächlichen Feldtransition werden fremde alarmierte Kandidaten geprüft. Gelb reagiert nur auf Resolver-Haltung `ENEMY`, Rot auf jede Haltung außer `FRIEND`; Grün reagiert nicht.
- [ ] Eigene Schiffe sowie beide Seiten im effektiven Urlaubsmodus sind ausgeschlossen. Beziehungslogik stammt ausschließlich aus dem zentralen Resolver, einschließlich persönlicher Feinde derselben Fraktion.
- [ ] Getarnte, nicht explizit aufgedeckte Schiffe werden über den zentralen Sichtbarkeitsvertrag aus `sc-WP-CLOAK-1a` berücksichtigt; es gibt keine lokale Tarnlogik.
- [ ] Bei mehreren berechtigten fremden Eignern werden Kandidaten stabil deterministisch geordnet und höchstens ein Eigner beginnt pro Transition einen Kampf.
- [ ] Die alarmierte Einzel-/Flottenpartei ist Angreifer, der Einflieger beziehungsweise seine Flotte Verteidiger. Der interne Resolver aus `sc-WP-COMBAT-1b` wird ohne simulierte Benutzerautorisierung aufgerufen.
- [ ] Jeder Alarmkampf stoppt die Bewegungsanfrage auf dem erreichten Feld mit `ALERT_COMBAT` und gemeinsamem Kampfbericht.
- [ ] System- und Galaxieflug reichen das Ergebnis weiter; die betroffenen Frontend-Oberflächen öffnen den bestehenden `CombatReportDialog` und aktualisieren den erreichten Zustand. Systemeintritt, Systemaustritt und Abfangen werden in Folgeissues migriert.
- [ ] Der Traktor-Kontextport bleibt für `sc-WP-TRACT-1a` erweiterbar; dessen Freundunterdrückung und Trojanisches-Pferd-Verhalten gehören nicht zu diesem Issue.
- [ ] Backend-Tests decken Grün/Gelb/Rot × Friend/Neutral/Enemy, persönlichen Feind, Urlaub, Tarnung, deterministische Mehrbesitzer-Auswahl, Zwischenfeld-Stopp im System- und Galaxieflug und Flottenverluste ab; Frontend-Tests decken Bericht und Zustandsaktualisierung ab.
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Entscheidung

Alarmkandidaten und automatische Kampfinitiierung liegen in einer neutralen Orchestrierung außerhalb des Spacecraft-Kerns. Sie verbindet Reaktionsport und internen Battle-Resolver ohne zyklische NestJS-Modulabhängigkeit.

## Comments

- 2026-11-06: Maintainer bestätigt, Alarmreaktionen bei Systemeintritt, Systemaustritt und Abfangen aus diesem Issue auszuklammern und in Folgeissues zu migrieren. Dieses Issue deckt System- und Galaxieflug über den gemeinsamen Bewegungsvertrag aus `sc-WP-COMBAT-1a` ab. Der vorhandene Status `ready-for-agent` und der Blocker `sc-WP-COMBAT-1a` bleiben unverändert.
