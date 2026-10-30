# Kontextfreier interner Battle-Resolver

**Status:** claimed
**Priority:** P2
**Size:** M
**Blocked by:** sc-WP-COMBAT-2

## Ziel

Manuelle Angriffe und automatische Alarmreaktionen teilen einen internen, kontextfreien Battle-Resolver für Parteienbildung, Engine-Ausführung und Nachbereitung. Die manuelle API bleibt ein authentifizierter Adapter und automatische Reaktionen simulieren keine Autorisierung eines fremden Spielers.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Spacecraft/Lib/Battle/AlertDetection/AlertReactionFacade.php`
- `Module/Spacecraft/Lib/Battle/AlertDetection/AlertDetection.php`
- gemeinsamer Attack-Cycle der Battle-Library

## SWU-Pfade

- `apps/backend/src/modules/combat/combat.service.ts`
- `apps/backend/src/modules/combat/combat.module.ts`
- Parteienkampf aus `sc-WP-COMBAT-2`
- Zerstörungs-, Meldungs- und Statistikdienste des Kampfs

## Akzeptanzkriterien

- [ ] Ein interner Resolver akzeptiert bereits autoritativ bestimmte Angreifer- und Verteidigerparteien sowie Kampfkontext und führt Engine, Zerstörung, Meldungen, Statistik und Berichtserzeugung aus.
- [ ] `CombatService.attack` bleibt für manuelle Angriffe zuständig, prüft Actor, Policy und Zielkontext und delegiert danach auf den internen Resolver.
- [ ] Der Resolver benötigt keinen HTTP-Actor und simuliert keine Eigentums- oder Autorisierungsprüfung für automatische Alarmspieler.
- [ ] Bestehende manuelle Angriffssemantik und deutsche Meldungen bleiben erhalten; die Regressionstests aus `sc-WP-COMBAT-2` bleiben grün.
- [ ] Der Resolver kann über einen neutralen Orchestrierungsdienst genutzt werden, ohne dass `SpacecraftModule` von `CombatModule` abhängt und ohne `forwardRef`-Zyklus.
- [ ] Backend-Tests decken äquivalente manuelle Resolution, direkten internen Parteienkampf, Zerstörung, Meldungen, Statistik und gemeinsamen Bericht ab.
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Entscheidung

Der interne Battle-Resolver enthält keine Benutzerautorisierung. Manuelle Angriffe bleiben ein authentifizierter Adapter; Alarmreaktionen werden später über eine neutrale Orchestrierung angebunden.
