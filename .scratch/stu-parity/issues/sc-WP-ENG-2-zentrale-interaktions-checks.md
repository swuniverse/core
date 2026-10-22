# Zentrale Interaktions-Checks für Feld-Interaktionen

**Status:** needs-info
**Priority:** P1
**Size:** M
**Blocked by:** —

## Ziel

Eine zentrale, erweiterbare Prüfung (Pendant zu STU `InteractionCheckType`) entscheidet für alle Feld-Interaktionen zwischen Schiffen bzw. Schiff und Kolonie, ob sie erlaubt sind: Transfer, Angriff, Scan, Abfangen, Kommunikation, Bergung. Heute prüft nur `transfer.service.ts` einzelne Regeln. Spätere Systeme (Traktor, Tarnung, Ionensturm, Urlaubsschutz aus sh-AP-04) hängen sich nur noch hier ein.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Lib/Interaction/InteractionCheckType.php` (u. a. `EXPECT_SOURCE_SUFFICIENT_CREW`, `_UNSHIELDED`, `_UNCLOAKED`, `_UNWARPED`, `_ENABLED`, `_UNTRACTORED`, `_UNBLOCKED`, `EXPECT_TARGET_NO_VACATION`, `_NOT_NPC`, `_UNSHIELDED`, `_UNCLOAKED`, `_UNWARPED`, `_DOCKED_OR_NO_ION_STORM`, `_UNBLOCKED`)
- `Lib/Interaction/{InteractionCheckerBuilderFactory,CustomizedInteractionChecker}.php`, `Lib/Interaction/Member/*`

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/transfer.service.ts` (`shipTransferBlockReason`, `assertShipTransferAllowed`)
- `apps/backend/src/modules/combat/combat.service.ts` (`attack`, `attackColony`)
- `apps/backend/src/modules/spacecraft/spacecraft-scan.service.ts`, `hyperdrive-disruption.service.ts`, `spacecraft-communication.service.ts`, `spacecraft.service.ts` (`getNearby`, Wrackbergung)
- `apps/backend/src/modules/alliance/relationship-resolver.service.ts`
- `apps/backend/src/modules/auth/user.entity.ts` (`vacationMode`)

## Akzeptanzkriterien

- [ ] Neuer Dienst (z. B. `interaction-check.service.ts`) mit deklarativen Prüfungen je Quelle/Ziel; liefert den ersten Ablehnungsgrund als deutsche Meldung.
- [ ] Mindestens: gleiche Position, Quelle mit ausreichender Crew und nicht kampfunfähig, Quelle/Ziel nicht im Hyperraumflug, Zielschilde (wo STU sie verlangt), Ziel nicht im Urlaubsmodus, Ziel nicht zerstört, Kolonie nicht blockiert (wo zutreffend), Haltung über den vorhandenen Resolver.
- [ ] Transfer, Angriff, Scan, Abfangen, Kommunikation und Bergung nutzen den Dienst; ihre bisherigen Einzelprüfungen entfallen ohne Verhaltensverlust (bestehende Tests bleiben grün).
- [ ] Die NBS-Liste (`getNearby`) leitet Verfügbarkeit und Grund der Aktionen aus demselben Dienst ab.
- [ ] Erweiterungspunkte für Traktor, Tarnung und Ionensturm sind als dokumentierte Hooks vorhanden (ohne Fachlogik).
- [ ] Unit-Tests je Prüfung, Integrationstest für Transfer und Angriff gegen Urlauber.
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Comments

- Abbruch am 2026-10-22: Der Querschnitt ist mit den aktuellen Service-Konstruktoren und direkten Unit-Test-Instanziierungen nicht in einem Durchlauf sicher integrierbar. Zwei ernsthafte TDD-Versuche führten zu breiten Testausfällen (fehlende neue Konstruktor-Abhängigkeiten in Combat/Transfer/Communication sowie Entity-Zyklusfehler beim Import des zentralen Dienstes). Benötigte Produktentscheidung: Soll der zentrale Check als provider-basierter Dienst mit Anpassung aller bestehenden Test-Fixtures eingeführt werden, oder als injektionsfreie Policy/Funktionen, die Repositories/Resolver-Daten vom jeweiligen Adapter erhalten? Das Issue sollte danach in kleinere Integrationsschritte (Policy, Transfer, Combat, Scan/NBS, Kommunikation/Abfangen/Bergung) geteilt werden.
