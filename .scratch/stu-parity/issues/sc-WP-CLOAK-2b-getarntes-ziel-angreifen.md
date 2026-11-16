# Getarntes Ziel angreifen

**Status:** resolved
**Priority:** P3
**Size:** S
**Blocked by:** sc-WP-CLOAK-2a

## Ziel

Hat ein Tachyon-Scan ein getarntes Schiff am eigenen Feld aufgedeckt, kann der Spieler es wie in STU angreifen; das Ziel wird dadurch enttarnt.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `html/spacecraft/control/control_*.twig` („Getarntes Ziel angreifen“)
- `Module/Spacecraft/Action/AttackSpacecraft`, `Module/Spacecraft/Lib/Battle/SpacecraftAttackPreparation.php`

## SWU-Pfade

- `apps/backend/src/modules/combat/combat.service.ts` (`attack`)
- Interaktions-Checks aus sc-WP-ENG-2
- `apps/frontend/src/components/spacecraft/NearbySensorPanel.tsx`

## Akzeptanzkriterien

- [x] Getarnte Ziele am Feld sind nach frischem Tachyon-Scan angreifbar, sonst nicht (Backend-Ablehnung).
- [x] Angriff enttarnt das Ziel.
- [x] NBS-Liste zeigt aufgedeckte getarnte Kontakte mit Angriffsaktion.
- [x] Backend- und Frontend-Tests.
- [x] `lint`, `typecheck`, `test` und `build` sind grün.

## Comments


## Answer

- Die gemeinsame Regel `TARGET_DETECTED` erlaubt ausschließlich den Angriff auf ein fremdes getarntes Ziel am eigenen Feld, wenn der Gravitationswellenscanner installiert, aktiv/intakt und sein standortgebundener Scan noch frisch ist. Ohne Scan, bei Ablauf exakt nach 300 s, Standortwechsel, entferntem/deaktiviertem/zerstörtem Modul oder eigenem getarntem Ziel bleibt die Backend-Ablehnung bestehen.
- `CombatService.attack` lädt die Module zur Berechtigungsprüfung, erhält Quell-Tarnung, Crew-, Status-, Positions- und Urlaubsschutz und prüft die Frische nach der asynchronen Vorbereitung erneut. Erst der akzeptierte Angriff setzt die Tarnung des tatsächlichen Zielteilnehmers vor Kampfbeginn auf inaktiv. Die bestehende Kampf-Persistenz speichert den enttarnten Überlebenden; zerstörte Schiffe deaktivieren ohnehin alle Systeme.
- Die NBS zeigt frisch aufgedeckte fremde Kontakte mit Tarnungskennzeichen und der Aktion „Getarntes Ziel angreifen“. Weitere Kontaktaktionen werden dadurch nicht freigegeben. Der Peilsender wird für getarnte Kontakte nicht angeboten. Nach Ablauf aktualisiert die NBS ihre Liste automatisch; Scan-/Standortänderungen nutzen die bestehende Schiffsaktualisierung.
- STU-Referenz geprüft: `AttackSpacecraft` verwendet `EXPECT_SOURCE_TACHYON`; `Lib/Interaction/Member/SpacecraftMember` verweigert den Angriff auf getarnte Ziele ohne aktiven Scan, `FightLib.ready` deaktiviert die Tarnung zur Kampfvorbereitung.

## Validation

- Gezielte Backend-Tests: **86 Tests / 4 Suites**, inklusive Freigabe bis 299999 ms, Ablauf-/Modul-/Standort-/Eigentümer-/Urlaub-/Crew-/Quell-Tarnungs-Ablehnungen ohne Enttarnung und Fristablauf während der Vorbereitung. Der Kampf-Test verwendet getrennte Lade- und Teilnehmerinstanzen und prüft Enttarnung vor der Engine sowie beim Speichern.
- Frontend-Tests für markierten Kontakt, regulären Kampf-API-Aufruf, ausgeblendeten Peilsender und Entfernung nach Ablauf.
- `npx nx affected -t lint typecheck test --base=HEAD --parallel=2`: grün; Backend **231 Suites / 2205 Tests**, Frontend **110 Dateien / 791 Tests**. Lint ohne Fehler, bestehende Warnungen bleiben.
- `npx nx run-many --targets=build`: grün für alle drei Projekte. Backend-Deklarationen anschließend mit `npx tsc --build apps/backend/tsconfig.json --emitDeclarationOnly --force` regeneriert.
- 2026-11-16: sc-WP-CLOAK-2b abgeschlossen auf `stu-parity`.
