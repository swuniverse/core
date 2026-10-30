# Orbitauftrag-Policy und schiffsbezogene API

**Status:** needs-info
**Priority:** P2
**Size:** M
**Blocked by:** —

## Ziel

Eine kanonische schiffsbezogene API startet und beendet flottenweite Verteidigungs- und Blockadeaufträge über belegten Kolonien. Alle bestehenden Oberflächen delegieren auf dieselbe zentrale Policy.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Ship/Action/ColonyDefending/StartDefending.php`, `StopDefending.php`
- `Module/Ship/Action/ColonyBlocking/StartBlocking.php`, `StopBlocking.php`
- `html/spacecraft/control/control_mid.twig`

## SWU-Pfade

- `apps/backend/src/modules/colony/colony-orbit.service.ts`
- `apps/backend/src/modules/colony/colony.controller.ts`
- `apps/backend/src/modules/colony/colony.service.ts`
- `apps/backend/src/modules/spacecraft/spacecraft.controller.ts`
- `packages/shared/src/lib/spacecraft/`

## Akzeptanzkriterien

- [ ] Kanonische schiffsbezogene Routen starten `DEFEND` oder `BLOCKADE` für eine belegte Kolonie im aktuellen Orbit und beenden den aktuellen Orbitauftrag des Schiffs beziehungsweise seiner Flotte.
- [ ] Verteidigung und Blockade sind unabhängig von Eigentum und Haltung für jede belegte Kolonie zulässig; freie/unbesessene Kolonien bleiben ausgeschlossen. Die bisherige Zielkolonie-Eigentumsprüfung entfällt.
- [ ] Der Actor besitzt das initiierende Schiff; das Schiff ist unzerstörter Flottenführer, befindet sich im Zielorbit und erfüllt den erforderlichen Idle-/Aktionszustand. Auftrag und Clear gelten atomar für die gesamte Flotte.
- [ ] Effektiver Urlaub des Kolonieeigners verhindert den Start. Ein bestehender gegensätzlicher Auftrag und ein anderer Orbitauftrag derselben Flotte verhindern einen weiteren Start.
- [ ] Blockade wird zusätzlich bei aktiver Energiephalanx, Partikelphalanx oder aktivem Antipartikel-System abgelehnt; Verteidigung besitzt diese Sperre nicht.
- [ ] Start und Ende erzeugen die vorgesehenen Rückmeldungen und Kolonieeigner-Ereignisse beziehungsweise Nachrichten.
- [ ] Bestehende Colony-Routen bleiben als Kompatibilitätsalias erhalten und delegieren ohne abweichende Regeln auf dieselbe Policy.
- [ ] Backend-Tests decken eigene/Friend/Neutral/Enemy-Kolonie, freie Kolonie, Urlaub, gegensätzlichen Auftrag, Orbitalverteidigung, Actor-/Leader-/Orbit-/Idle-Regeln und flottenweiten Zustand ab.
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Entscheidung

SWU übernimmt die bestätigte STU-Regel: Haltung und Eigentum filtern weder Verteidigung noch Blockade. Die kanonische Mutation ist schiffsbezogen, die Order flottenbezogen. Dieses Issue besitzt Mutation, zentrale Policy und Backend-Kompatibilität; Feldkontext und UI folgen in `sc-WP-UI-3a2`.

## Comments

- 2026-10-30: Produktcode nach zwei Prüfversuchen verworfen. Der fokussierte Orbit-Test war grün (201/201), aber das verpflichtende Gate `npx nx affected -t lint typecheck test --base=HEAD` bleibt repositoryweit rot: Backend-Typecheck mit zahlreichen TS6305-Ausgabedateifehlern sowie unabhängige bestehende Fehler in `tutorial.service.spec.ts`, `spacecraft-core-controls.spec.ts` und `spacecraft-cartography-api.spec.ts`. Bitte diese Baseline reparieren oder eine ausdrückliche Ausnahme für dieses Issue festlegen.
