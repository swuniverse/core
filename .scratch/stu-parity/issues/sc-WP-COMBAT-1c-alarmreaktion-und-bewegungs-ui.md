# Alarmreaktion und Bewegungs-UI

**Status:** resolved
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

- [x] Nach jeder tatsächlichen Feldtransition werden fremde alarmierte Kandidaten geprüft. Gelb reagiert nur auf Resolver-Haltung `ENEMY`, Rot auf jede Haltung außer `FRIEND`; Grün reagiert nicht.
- [x] Eigene Schiffe sowie beide Seiten im effektiven Urlaubsmodus sind ausgeschlossen. Beziehungslogik stammt ausschließlich aus dem zentralen Resolver, einschließlich persönlicher Feinde derselben Fraktion.
- [x] Getarnte, nicht explizit aufgedeckte Schiffe werden über den zentralen Sichtbarkeitsvertrag aus `sc-WP-CLOAK-1a` berücksichtigt; es gibt keine lokale Tarnlogik.
- [x] Bei mehreren berechtigten fremden Eignern werden Kandidaten stabil deterministisch geordnet und höchstens ein Eigner beginnt pro Transition einen Kampf.
- [x] Die alarmierte Einzel-/Flottenpartei ist Angreifer, der Einflieger beziehungsweise seine Flotte Verteidiger. Der interne Resolver aus `sc-WP-COMBAT-1b` wird ohne simulierte Benutzerautorisierung aufgerufen.
- [x] Jeder Alarmkampf stoppt die Bewegungsanfrage auf dem erreichten Feld mit `ALERT_COMBAT` und gemeinsamem Kampfbericht.
- [x] System- und Galaxieflug reichen das Ergebnis weiter; die betroffenen Frontend-Oberflächen öffnen den bestehenden `CombatReportDialog` und aktualisieren den erreichten Zustand. Systemeintritt, Systemaustritt und Abfangen werden in Folgeissues migriert.
- [x] Der Traktor-Kontextport bleibt für `sc-WP-TRACT-1a` erweiterbar; dessen Freundunterdrückung und Trojanisches-Pferd-Verhalten gehören nicht zu diesem Issue.
- [x] Backend-Tests decken Grün/Gelb/Rot × Friend/Neutral/Enemy, persönlichen Feind, Urlaub, Tarnung, deterministische Mehrbesitzer-Auswahl, Zwischenfeld-Stopp im System- und Galaxieflug und Flottenverluste ab; Frontend-Tests decken Bericht und Zustandsaktualisierung ab.
- [x] `lint`, `typecheck`, `test` und `build` sind grün.

## Entscheidung

Alarmkandidaten und automatische Kampfinitiierung liegen in einer neutralen Orchestrierung außerhalb des Spacecraft-Kerns. Sie verbindet Reaktionsport und internen Battle-Resolver ohne zyklische NestJS-Modulabhängigkeit.

## Comments

- 2026-11-06: Maintainer bestätigt, Alarmreaktionen bei Systemeintritt, Systemaustritt und Abfangen aus diesem Issue auszuklammern und in Folgeissues zu migrieren. Dieses Issue deckt System- und Galaxieflug über den gemeinsamen Bewegungsvertrag aus `sc-WP-COMBAT-1a` ab. Der vorhandene Status `ready-for-agent` und der Blocker `sc-WP-COMBAT-1a` bleiben unverändert.

- 2026-11-14: Umgesetzt (98ad951f).
  - `AlertReactionModule` (`apps/backend/src/modules/alert-reaction/`) importiert Spacecraft-, Combat- und Alliance-Modul und trägt `AlertReactionService` beim Start in die von `SpacecraftModule` exportierte Registry `MOVEMENT_REACTIONS` ein; kein Zyklus, kein `forwardRef`.
  - Kandidaten auf dem erreichten Feld: fremde, betriebsbereite (IDLE, nicht Standby) Einzelschiffe oder Flottenführer mit Alarm ≠ Grün, nicht per `isHiddenFromViewer` getarnt, Eigner nicht im effektiven Urlaub; der Einflieger im Urlaub löst nichts aus. Haltung über `RelationshipResolverService.resolve(alarmEigner, Einflieger)`: Gelb nur `isEnemy`, Rot alles außer `isFriend` (`reactsToIncoming`).
  - Abweichung von STU (`shuffle`): Kandidaten nach Schiffs-ID geordnet, der erste berechtigte greift mit seiner Flotte am Feld an, höchstens ein Kampf pro Transition. Verteidiger sind die einfliegenden Schiffe, die für den Alarmeigner sichtbar sind; ein getarnter Einflieger löst also keinen Alarm aus.
  - Kampf über `BattleResolverService.resolve` ohne Benutzerprüfung; zerstörte Teilnehmer werden im Flugzustand markiert, die Route stoppt mit `ALERT_COMBAT` und dem Bericht.
  - `MovementResultDto.combatReport` ist jetzt der strukturierte `CombatReportDto` (Parteien, Runden, Ergebnis) statt der Textzeilen aus 1a, damit `CombatReportDialog` ihn direkt anzeigt. `MovementReactionContext.tractoringShip` ist für sc-WP-TRACT-1a reserviert und wird von den Flügen noch nicht gesetzt.
  - Frontend: `NavigationPanel` liest `movement`, öffnet bei Kampfbericht `CombatReportDialog`, zeigt eine Stoppmeldung je Stopgrund und lädt Schiff und Karte neu (einzige Oberfläche, die `navigate`/`fly` auslöst).
  - Tests: `alert-reaction.service.spec.ts` (Matrix Grün/Gelb/Rot × Freund/Neutral/Feind, Resolver-Richtung, Angreifer/Verteidiger, eigene Schiffe, Urlaub beider Seiten, Tarnung beider Seiten, deterministische Mehrbesitzer-Auswahl, Flottenführer, Verlustmarkierung); `alert-reaction.int-spec.ts` (Postgres, echter Flug und Resolver mit Kontaktliste, deterministischer Kampf-Stub: persönlicher Feind gleicher Fraktion stoppt Galaxieflug auf Zwischenfeld, neutral passiert, Systemflug bei Rot der anderen Fraktion, Flottenverlust); `NavigationPanel.spec.tsx` (Bericht und Zustandsaktualisierung).
  - Gates: Lint 0 Fehler (Warnungen 1433/110 unverändert), Typecheck und Build grün, Backend-Unit 2125/2125, Frontend 759/759, Integration 716/716.

