# Kontextfreier interner Battle-Resolver

**Status:** resolved
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

- [x] Ein interner Resolver akzeptiert bereits autoritativ bestimmte Angreifer- und Verteidigerparteien sowie Kampfkontext und führt Engine, Zerstörung, Meldungen, Statistik und Berichtserzeugung aus.
- [x] `CombatService.attack` bleibt für manuelle Angriffe zuständig, prüft Actor, Policy und Zielkontext und delegiert danach auf den internen Resolver.
- [x] Der Resolver benötigt keinen HTTP-Actor und simuliert keine Eigentums- oder Autorisierungsprüfung für automatische Alarmspieler.
- [x] Bestehende manuelle Angriffssemantik und deutsche Meldungen bleiben erhalten; die Regressionstests aus `sc-WP-COMBAT-2` bleiben grün.
- [x] Der Resolver kann über einen neutralen Orchestrierungsdienst genutzt werden, ohne dass `SpacecraftModule` von `CombatModule` abhängt und ohne `forwardRef`-Zyklus.
- [x] Backend-Tests decken äquivalente manuelle Resolution, direkten internen Parteienkampf, Zerstörung, Meldungen, Statistik und gemeinsamen Bericht ab.
- [x] `lint`, `typecheck`, `test` und `build` sind grün.

## Entscheidung

Der interne Battle-Resolver enthält keine Benutzerautorisierung. Manuelle Angriffe bleiben ein authentifizierter Adapter; Alarmreaktionen werden später über eine neutrale Orchestrierung angebunden.

## Comments

- `BattleResolverService` (`apps/backend/src/modules/combat/battle-resolver.service.ts`) übernimmt Modul-Laden, Feldeffekt-Kontext, COMBAT_STARTED-Events, Engine, Zerstörung/Überlebende, Statistik und Berichtserzeugung; keine Actor-/Eigentumsprüfung. Exportiert aus `CombatModule`, hängt nur an Spacecraft-/Statistics-/Websocket-Modulen (kein Zyklus, kein `forwardRef`).
- `CombatService.attack` validiert weiter Actor/Policy/Ziel, bildet die Parteien und delegiert. Bestehende Tests unverändert grün; neuer `battle-resolver.service.spec.ts` deckt direkten Parteienkampf ab.
- Folgepunkt (1c): neutraler Orchestrierungsdienst, der den Resolver für Alarmreaktionen aus `SpacecraftModule`-Seite anbindet (Port statt Modulimport).
